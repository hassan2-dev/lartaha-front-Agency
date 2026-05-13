/* eslint-disable no-case-declarations */
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'
import { API_ENV, TOKEN_STORAGE_KEY } from '../../config/api'
import { encryptThumbnailBlob } from '../../lib/encryption'
import {
  listUploadedObjects,
  uploadFilesStreamed,
  moveFileToTrash,
  restoreFileFromTrash,
  listTrashFiles,
  fetchBulkPrivacySettings,
  bulkMoveToTrash,
  bulkRestoreFromTrash,
  createImageThumbnailBlob,
  createVideoThumbnailBlob,
} from '../../api/uploadApi'
import { subscribeRealtime } from '../../api/realtimeApi'
import { api } from '../../api/http'

import { useDownload } from '../../contexts/DownloadContext'
import type { SelectedUploadFile } from '../../components/EncryptedUploadDropzone'
import {
  filenameFromKey,
  getClientEncryptionKey,
  isHiddenChatRootFolder,
  isHiddenChatUploadPath,
  setClientEncryptionKey,
  validateFileQuality,
} from '../../utils/upload'

const MAX_DOWNLOAD_RETRIES = 3

// Download progress tracking functions - must be used within component context
export default function useUpload() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  // Download progress — backed by global DownloadContext
  const { addDownload, updateDownload, downloads, abortControllers, pausedChunks } = useDownload()

  // Non-encrypted direct download with AbortController + streaming progress + pause/resume via Range
  const handleDownload = useCallback(
    async (key: string, filename: string, retryCount = 0) => {
      const downloadKey = `${key}:${filename}`
      const base = API_ENV.apiBaseUrl?.trim() || ''
      const token = localStorage.getItem(TOKEN_STORAGE_KEY)

      if (!base || !token) {
        addDownload({
          key: downloadKey,
          filename,
          status: 'failed',
          progress: 0,
          bytesDownloaded: 0,
          totalBytes: 0,
          speed: 0,
          startTime: Date.now(),
          error: !base ? 'Missing API base URL' : 'Missing auth token',
          retries: retryCount,
        })
        return
      }

      const normalized = base.endsWith('/') ? base.slice(0, -1) : base
      const downloadUrl = `${normalized}/api/download/direct?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`

      // Check if we have saved chunks from a previous pause
      const saved = pausedChunks.current.get(downloadKey)
      const resumeFrom = saved ? saved.bytesDownloaded : 0
      const chunks: ArrayBuffer[] = saved ? [...saved.chunks] : []
      let bytesDownloaded = resumeFrom

      // Remove saved state now that we're resuming
      pausedChunks.current.delete(downloadKey)

      const ac = new AbortController()
      abortControllers.current.set(downloadKey, ac)

      // If resuming, update existing entry; otherwise add fresh
      if (saved) {
        updateDownload(downloadKey, { status: 'downloading', speed: 0 })
      } else {
        addDownload({
          key: downloadKey,
          filename,
          status: 'downloading',
          progress: 0,
          bytesDownloaded: 0,
          totalBytes: 0,
          speed: 0,
          startTime: Date.now(),
          retries: retryCount,
        })
      }

      let lastBytesReported = bytesDownloaded
      let lastSpeedCheckTime = Date.now()
      let lastSpeed = 0
      let speedSampleCount = 0

      const tickProgress = (downloaded: number, totalBytes: number) => {
        const now = Date.now()
        const timeDiff = (now - lastSpeedCheckTime) / 1000
        if (timeDiff >= 0.4) {
          const diff = downloaded - lastBytesReported
          if (diff > 0) {
            lastSpeed = diff / timeDiff
            lastBytesReported = downloaded
            lastSpeedCheckTime = now
            speedSampleCount++
          }
        }
        const progress = totalBytes > 0 ? Math.round((downloaded / totalBytes) * 100) : 0
        updateDownload(downloadKey, {
          bytesDownloaded: downloaded,
          totalBytes,
          progress,
          speed: speedSampleCount > 0 ? lastSpeed : 0,
        })
      }

      try {
        const headers: Record<string, string> = {}
        if (resumeFrom > 0) headers['Range'] = `bytes=${resumeFrom}-`

        const response = await fetch(downloadUrl, { signal: ac.signal, headers })
        if (!response.ok && response.status !== 206)
          throw new Error(`Download failed: ${response.status} ${response.statusText}`)

        const contentLength = response.headers.get('content-length')
        const rangeTotal = response.headers.get('content-range')?.match(/\/([0-9]+)$/)?.[1]
        const totalBytes = rangeTotal
          ? parseInt(rangeTotal, 10)
          : contentLength
            ? resumeFrom + parseInt(contentLength, 10)
            : 0

        if (!response.body) {
          const blob = await response.blob()
          chunks.push(await blob.arrayBuffer())
          const finalBlob = new Blob(chunks)
          const url = URL.createObjectURL(finalBlob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          updateDownload(downloadKey, {
            status: 'completed',
            progress: 100,
            bytesDownloaded: finalBlob.size,
            totalBytes: finalBlob.size,
          })
          abortControllers.current.delete(downloadKey)
          return
        }

        const reader = response.body.getReader()

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (ac.signal.aborted) {
            // Paused — save what we have so far
            reader.cancel()
            chunks.push(value.buffer)
            bytesDownloaded += value.length
            pausedChunks.current.set(downloadKey, {
              chunks,
              bytesDownloaded,
              totalBytes,
              isEncrypted: false,
              s3Key: key,
            })
            updateDownload(downloadKey, { status: 'paused', bytesDownloaded, totalBytes })
            abortControllers.current.delete(downloadKey)
            return
          }
          chunks.push(value.buffer)
          bytesDownloaded += value.length
          tickProgress(bytesDownloaded, totalBytes)
        }

        const blob = new Blob(chunks)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        const elapsed = (Date.now() - (downloads.get(downloadKey)?.startTime ?? Date.now())) / 1000
        updateDownload(downloadKey, {
          status: 'completed',
          progress: 100,
          bytesDownloaded,
          totalBytes,
          speed: elapsed > 0 ? bytesDownloaded / elapsed : 0,
        })
        abortControllers.current.delete(downloadKey)
      } catch (error) {
        abortControllers.current.delete(downloadKey)
        if ((error as Error).name === 'AbortError') {
          // Aborted without reaching the read loop (e.g. paused during fetch itself)
          pausedChunks.current.set(downloadKey, {
            chunks,
            bytesDownloaded,
            totalBytes: downloads.get(downloadKey)?.totalBytes ?? 0,
            isEncrypted: false,
            s3Key: key,
          })
          updateDownload(downloadKey, { status: 'paused', bytesDownloaded })
          return
        }

        const errorMessage = error instanceof Error ? error.message : 'Download failed'
        if (retryCount < MAX_DOWNLOAD_RETRIES) {
          console.warn(
            `Download failed, retrying (${retryCount + 1}/${MAX_DOWNLOAD_RETRIES}):`,
            errorMessage
          )
          setTimeout(
            () => {
              void handleDownload(key, filename, retryCount + 1)
            },
            1000 * (retryCount + 1)
          )
          return
        }
        updateDownload(downloadKey, { status: 'failed', error: errorMessage })
      }
    },
    [addDownload, updateDownload, downloads, abortControllers, pausedChunks]
  )

  const [selectedFiles, setSelectedFiles] = useState<SelectedUploadFile[]>([])
  const [encryptionPassword, setEncryptionPassword] = useState<string>('')
  // Explorer path under "uploads/". Examples: "" (root), "team1", "team1/sub1"
  const [currentPath, setCurrentPath] = useState('')
  const [folderError, setFolderError] = useState<string | null>(null)
  const [foldersHere, setFoldersHere] = useState<string[]>([])
  const [filesHere, setFilesHere] = useState<
    Array<{
      key: string
      size?: number
      lastModified?: string
      createdAt?: string
      updatedAt?: string
      thumbnailKey?: string | null
      fileId?: string
      mimeType?: string
      encryptionEnabled?: boolean
      encryptionIv?: string
      encryptionSalt?: string
    }>
  >([])
  const [hasMoreFiles, setHasMoreFiles] = useState(true)
  const [nextContinuationToken, setNextContinuationToken] = useState<string | null>(null)
  const [isLoadingMoreFiles, setIsLoadingMoreFiles] = useState(false)
  const [totalFileCount, setTotalFileCount] = useState<number | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const [uploading, setUploading] = useState(false)
  const [completedUploadedFiles, setCompletedUploadedFiles] = useState<Set<string>>(new Set())
  const [showToast, setShowToast] = useState(false)
  const [toastType, setToastType] = useState<'error' | 'success' | 'info'>('error')
  const [toastMessage, setToastMessage] = useState('')
  const [loadingExplorer, setLoadingExplorer] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [trashFiles, setTrashFiles] = useState<Array<any>>([])
  const [loadingTrash, setLoadingTrash] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<{
    key: string
    url: string
    filename: string
    type: string
  } | null>(null)
  const [encryptedViewerOpen, setEncryptedViewerOpen] = useState(false)
  const [encryptedViewerFile, setEncryptedViewerFile] = useState<{
    fileId: string
    filename: string
    mimeType?: string
    size?: number
    encryptionEnabled?: boolean
    encryptionIv?: string
    encryptionSalt?: string
  } | null>(null)
  const [uploadItemStates, setUploadItemStates] = useState<
    Record<
      string,
      {
        fileKey: string
        fileId: string
        status: 'idle' | 'uploading' | 'paused' | 'completed' | 'error'
        progress: number
      }
    >
  >({})

  // Folder creation state
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

  // Privacy controls state
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [selectedFileForPrivacy, setSelectedFileForPrivacy] = useState<{
    key: string
    filename: string
  } | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [teamMembers, setTeamMembers] = useState<
    Array<{ id: string; email: string; name?: string; user?: { name: string; email: string } }>
  >([])
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false)
  const [filePrivacySettings, setFilePrivacySettings] = useState<
    Record<string, { restricted: boolean; allowedMembers: string[]; canAccess?: boolean }>
  >({})

  // Deletion loading states
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set())
  const [deletingFolders, setDeletingFolders] = useState<Set<string>>(new Set())

  // Filter and sort state
  const [fileFilter, setFileFilter] = useState<'all' | 'images' | 'videos' | 'documents'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date')
  const sortOrder = 'asc' // Fixed sort order since setSortOrder is unused

  // Bulk selection state
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const useStreamUpload = false
  const canUpload = useMemo(
    () => selectedFiles.length > 0 && !uploading,
    [selectedFiles, uploading]
  )

  // Helper function to show toast notifications
  const showToastNotification = useCallback(
    (message: string, type: 'error' | 'success' | 'info' = 'error') => {
      setToastMessage(message)
      setToastType(type)
      setShowToast(true)
    },
    []
  )

  // Helper function to close toast
  const closeToast = useCallback(() => {
    setShowToast(false)
    setToastMessage('')
  }, [])

  // Create handleDownloadFile that wraps handleDownload for encrypted files
  const handleDownloadFile = useCallback(
    async (key: string, filename: string) => {
      const fileMeta = filesHere.find(file => file.key === key)
      if (
        fileMeta?.encryptionEnabled &&
        fileMeta.fileId &&
        fileMeta.encryptionIv &&
        fileMeta.encryptionSalt
      ) {
        const downloadKey = `${key}:${filename}`

        // Check for paused state with saved chunks
        const saved = pausedChunks.current.get(downloadKey)
        const resumeFrom = saved ? saved.bytesDownloaded : 0
        const chunks: ArrayBuffer[] = saved ? [...saved.chunks] : []
        let bytesDownloaded = resumeFrom
        pausedChunks.current.delete(downloadKey)

        const ac = new AbortController()
        abortControllers.current.set(downloadKey, ac)

        if (saved) {
          // Resuming — update existing entry
          updateDownload(downloadKey, { status: 'downloading', speed: 0 })
        } else {
          addDownload({
            key: downloadKey,
            filename,
            status: 'downloading',
            progress: 0,
            bytesDownloaded: 0,
            totalBytes: fileMeta.size || 0,
            speed: 0,
            startTime: Date.now(),
            retries: 0,
            isEncrypted: true,
          })
        }

        try {
          const CLIENT_KEY_CACHE = 'file_encryption_password'
          const encryptionKey = sessionStorage.getItem(CLIENT_KEY_CACHE)
          if (!encryptionKey)
            throw new Error('Missing encryption key — please re-enter your password')

          // Always get a fresh pre-signed URL (they expire)
          const { getDownloadUrl } = await import('../../api/uploadApi')
          const result = await getDownloadUrl(fileMeta.fileId)
          if (!result.ok || !result.url) throw new Error('Failed to get download URL')

          if (ac.signal.aborted) return

          // --- Streaming download phase with pause/resume support ---
          const reqHeaders: Record<string, string> = {}
          // S3 pre-signed URLs generally don't support Range, but we try anyway;
          // if the server returns 206 we resume, otherwise we restart from 0
          if (resumeFrom > 0) reqHeaders['Range'] = `bytes=${resumeFrom}-`

          const response = await fetch(result.url, { signal: ac.signal, headers: reqHeaders })

          // If Range was rejected (200 instead of 206), we must re-download from start
          if (response.status === 200 && resumeFrom > 0) {
            chunks.length = 0
            bytesDownloaded = 0
          } else if (!response.ok && response.status !== 206) {
            throw new Error(`HTTP ${response.status}`)
          }

          const contentLength = response.headers.get('content-length')
          const rangeTotal = response.headers.get('content-range')?.match(/\/([0-9]+)$/)?.[1]
          const totalBytes = rangeTotal
            ? parseInt(rangeTotal, 10)
            : contentLength
              ? resumeFrom + parseInt(contentLength, 10)
              : fileMeta.size || 0

          let lastBytes = bytesDownloaded
          let lastTime = Date.now()
          let lastSpeed = 0

          if (response.body) {
            const reader = response.body.getReader()
            // eslint-disable-next-line no-constant-condition
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              if (ac.signal.aborted) {
                // Paused — save collected chunks so we can resume
                reader.cancel()
                chunks.push(value.buffer)
                bytesDownloaded += value.length
                pausedChunks.current.set(downloadKey, {
                  chunks,
                  bytesDownloaded,
                  totalBytes,
                  isEncrypted: true,
                  encryptedUrl: result.url,
                })
                updateDownload(downloadKey, {
                  status: 'paused',
                  bytesDownloaded,
                  totalBytes,
                  speed: 0,
                })
                abortControllers.current.delete(downloadKey)
                return
              }
              chunks.push(value.buffer)
              bytesDownloaded += value.length
              const now = Date.now()
              const dt = (now - lastTime) / 1000
              if (dt >= 0.4) {
                lastSpeed = (bytesDownloaded - lastBytes) / dt
                lastBytes = bytesDownloaded
                lastTime = now
              }
              const progress = totalBytes > 0 ? Math.round((bytesDownloaded / totalBytes) * 100) : 0
              updateDownload(downloadKey, {
                bytesDownloaded,
                totalBytes,
                progress,
                speed: lastSpeed,
              })
            }
          } else {
            // Fallback — no streaming
            const arrayBuf = await response.arrayBuffer()
            chunks.push(arrayBuf)
            bytesDownloaded += arrayBuf.byteLength
          }

          if (ac.signal.aborted) {
            // Paused during non-streaming fallback
            pausedChunks.current.set(downloadKey, {
              chunks,
              bytesDownloaded,
              totalBytes: fileMeta.size || bytesDownloaded,
              isEncrypted: true,
              encryptedUrl: result.url,
            })
            updateDownload(downloadKey, { status: 'paused', bytesDownloaded, speed: 0 })
            abortControllers.current.delete(downloadKey)
            return
          }

          // --- Decryption phase ---
          updateDownload(downloadKey, {
            status: 'decrypting',
            progress: 0,
            speed: 0,
            decryptionProgress: 0,
          })

          const { downloadAndDecryptStream } = await import('../../lib/encryption')
          const encBlob = new Blob(chunks, { type: 'application/octet-stream' })
          const encBlobUrl = URL.createObjectURL(encBlob)

          const decryptedBlob = await downloadAndDecryptStream(
            encBlobUrl,
            fileMeta.encryptionIv,
            fileMeta.encryptionSalt,
            encryptionKey,
            fileMeta.size || encBlob.size,
            pct => updateDownload(downloadKey, { decryptionProgress: pct, progress: pct }),
            fileMeta.fileId,
            fileMeta.mimeType,
            filename
          )
          URL.revokeObjectURL(encBlobUrl)

          const url = URL.createObjectURL(decryptedBlob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          a.rel = 'noreferrer'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          const elapsed =
            (Date.now() - (downloads.get(downloadKey)?.startTime ?? Date.now())) / 1000
          updateDownload(downloadKey, {
            status: 'completed',
            progress: 100,
            decryptionProgress: 100,
            speed: elapsed > 0 ? bytesDownloaded / elapsed : 0,
            totalBytes: bytesDownloaded,
          })
          abortControllers.current.delete(downloadKey)
        } catch (error) {
          abortControllers.current.delete(downloadKey)
          if ((error as Error).name === 'AbortError') {
            // Aborted before the read loop — save what we have
            pausedChunks.current.set(downloadKey, {
              chunks,
              bytesDownloaded,
              totalBytes: downloads.get(downloadKey)?.totalBytes ?? (fileMeta.size || 0),
              isEncrypted: true,
            })
            updateDownload(downloadKey, { status: 'paused', bytesDownloaded, speed: 0 })
            return
          }
          console.error('Download encrypted file error:', error)
          updateDownload(downloadKey, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'فشل في فك التشفير',
          })
        }
        return
      }

      // Non-encrypted file - use regular download with progress tracking
      void handleDownload(key, filename)
    },
    [
      filesHere,
      handleDownload,
      addDownload,
      updateDownload,
      downloads,
      abortControllers,
      pausedChunks,
    ]
  )

  // Filtered and sorted files
  const filteredAndSortedFiles = useMemo(() => {
    const filtered = filterFiles(filesHere)
    const sorted = sortFiles(filtered)
    return sorted
  }, [filesHere, fileFilter, sortBy, sortOrder])

  // Auto-upload when files are selected (but not during initial render)
  const [hasTriggeredUpload, setHasTriggeredUpload] = useState(false)

  // Handle folder parameter from query string (e.g., from activity page)
  const fetchExplorerRef = useRef<typeof fetchExplorer | null>(null)
  const queryParamHandledRef = useRef(false)
  const userInitiatedPathChangeRef = useRef(false)
  const initialFetchDoneRef = useRef(false)

  // Effect to handle query param and initiate fetch
  // Combined into single effect to avoid race condition between query param and currentPath effects
  useEffect(() => {
    const workspaceId = user?.workspaceId?.trim()
    if (!workspaceId) return // Wait for workspaceId to be available

    const folder = searchParams.get('folder')
    const cleanPath = folder ? decodeURIComponent(folder).replace(/^\/+/, '') : ''
    const ROOT_PREFIX = `uploads/${workspaceId}`
    const computedExplorerPrefix = cleanPath ? `${ROOT_PREFIX}/${cleanPath}` : ROOT_PREFIX
    queryParamHandledRef.current = true
    initialFetchDoneRef.current = true
    setFolderError(null)
    setCurrentPath(cleanPath)
    // Fetch directly with computed prefix to avoid stale closure race
    // Pass the cleanPath as currentPathOverride to ensure correct path is used
    void fetchExplorer(true, computedExplorerPrefix, null)
  }, [searchParams, user?.workspaceId])

  // This effect fetches when currentPath changes (user navigation, not query param)
  useEffect(() => {
    const folderParam = searchParams.get('folder')
    const normalizedFolderParam = folderParam
      ? decodeURIComponent(folderParam).replace(/^\/+/, '')
      : ''

    // Skip fetch if query param was just handled (to avoid double fetch)
    if (queryParamHandledRef.current) {
      queryParamHandledRef.current = false
      return
    }

    // Skip fetch when currentPath is not yet in sync with the URL.
    if (normalizedFolderParam !== currentPath) {
      return
    }

    // Skip if this is a user-initiated path change (flag set in breadcrumb handler)
    // The query param effect will handle the fetch
    if (userInitiatedPathChangeRef.current) {
      userInitiatedPathChangeRef.current = false
      return
    }

    // Clear error when navigating to a new path
    setFolderError(null)

    initialFetchDoneRef.current = true
    // Use direct call instead of ref since ref isn't set up on first render
    if (fetchExplorerRef.current) {
      fetchExplorerRef.current(true)
    } else {
      // Fallback: call fetchExplorer directly (works because fetchExplorer reads current state)
      void fetchExplorer(true)
    }
  }, [currentPath, searchParams])

  useEffect(() => {
    if (useStreamUpload && canUpload && selectedFiles.length > 0 && !hasTriggeredUpload) {
      setHasTriggeredUpload(true)
      void handleUpload()
    } else if (selectedFiles.length === 0) {
      setHasTriggeredUpload(false)
    }
  }, [canUpload, selectedFiles.length, hasTriggeredUpload])

  // Listen for retry-download events dispatched from DownloadProgressDialog
  useEffect(() => {
    const onRetry = (e: Event) => {
      const { key, filename } = (e as CustomEvent<{ key: string; filename: string }>).detail
      void handleDownloadFile(key.split(':')[0], filename)
    }
    window.addEventListener('retry-download', onRetry)
    return () => window.removeEventListener('retry-download', onRetry)
  }, [handleDownloadFile])

  useEffect(() => {
    const workspaceId = user?.workspaceId?.trim()
    if (workspaceId) {
      setClientEncryptionKey(workspaceId)
      setEncryptionPassword(workspaceId)
      return
    }

    const existingKey = getClientEncryptionKey()
    if (existingKey) {
      setEncryptionPassword(existingKey)
    }
  }, [user?.workspaceId])

  const ROOT_PREFIX = useMemo(() => {
    const workspaceId = user?.workspaceId?.trim()
    return workspaceId ? `uploads/${workspaceId}` : 'uploads'
  }, [user?.workspaceId])
  const explorerPrefix = currentPath.trim() ? `${ROOT_PREFIX}/${currentPath.trim()}` : ROOT_PREFIX

  const [folderNameError, setFolderNameError] = useState<string | null>(null)

  async function handleUpload() {
    if (!useStreamUpload) return
    setFolderNameError(null)

    if (selectedFiles.length === 0) {
      showToastNotification('يرجى اختيار ملفات أو مجلد للرفع.', 'error')
      return
    }

    // Validate file quality
    const qualityWarnings: string[] = []
    selectedFiles.forEach(sf => {
      const validation = validateFileQuality(sf.file)
      if (!validation.isValid) {
        qualityWarnings.push(...validation.warnings)
      }
    })

    if (qualityWarnings.length > 0) {
      const warningMessage = `تحذيرات الجودة:\n${qualityWarnings.join('\n')}\n\nهل تريد المتابعة في الرفع؟`
      if (!confirm(warningMessage)) {
        return
      }
    }

    setUploading(true)

    // Initialize upload item states for all files
    const initialStates: Record<
      string,
      {
        fileKey: string
        fileId: string
        status: 'idle' | 'uploading' | 'paused' | 'completed' | 'error'
        progress: number
        speed?: number
        bytesUploaded?: number
        totalBytes?: number
      }
    > = {}
    selectedFiles.forEach(sf => {
      const fileKey = `${sf.relativePath}_${sf.file.size}`
      initialStates[fileKey] = {
        fileKey,
        fileId: '',
        status: 'uploading',
        progress: 0,
        speed: 0,
        bytesUploaded: 0,
        totalBytes: sf.file.size,
      }
    })
    setUploadItemStates(initialStates)
    setUploading(false)

    try {
      const hasFolderStructure = selectedFiles.some(sf => sf.relativePath.includes('/'))
      let rootFolderName = ''

      if (hasFolderStructure) {
        // Extract the root folder name from the first file that has a path
        const firstFileWithPath = selectedFiles.find(sf => sf.relativePath.includes('/'))
        if (firstFileWithPath) {
          rootFolderName = firstFileWithPath.relativePath.split('/')[0]
        }
      }

      // Filter out already completed files before uploading
      const filesToUpload = selectedFiles
        .filter(sf => !completedUploadedFiles.has(sf.file.name))
        .map(async sf => {
          const encryptionResult = sf.encryptionResult
          // For simple encryption (small files), encryptionResult has encryptedData, iv, salt
          // For chunked encryption (large files), encryptionResult has encryptedChunks, iv, salt
          const hasEncryption = !!encryptionResult
          const iv = encryptionResult?.iv
          const salt = encryptionResult?.salt
          const thumbnailUploadFile = sf.thumbnailUploadFile || null

          if (!thumbnailUploadFile) {
            try {
              const filename = filenameFromKey(sf.relativePath)
              const fileType = getFileType(filename)
              if (fileType === 'image') {
                const thumb = await createImageThumbnailBlob(sf.file)
                if (thumb) {
                  const thumbBlob = hasEncryption
                    ? await encryptThumbnailBlob(thumb, encryptionPassword)
                    : thumb
                  return {
                    file: sf.uploadFile ?? sf.file,
                    relativePath: sf.relativePath,
                    encryptionEnabled: hasEncryption,
                    encryptionIv: iv,
                    encryptionSalt: salt,
                    thumbnailUploadFile: new File(
                      [thumbBlob],
                      `thumb_${sf.relativePath}.${hasEncryption ? 'bin' : 'jpg'}`,
                      { type: hasEncryption ? 'application/octet-stream' : 'image/jpeg' }
                    ),
                  }
                }
              } else if (fileType === 'video') {
                const thumb = await createVideoThumbnailBlob(sf.file)
                if (thumb) {
                  const thumbBlob = hasEncryption
                    ? await encryptThumbnailBlob(thumb, encryptionPassword)
                    : thumb
                  return {
                    file: sf.uploadFile ?? sf.file,
                    relativePath: sf.relativePath,
                    encryptionEnabled: hasEncryption,
                    encryptionIv: iv,
                    encryptionSalt: salt,
                    thumbnailUploadFile: new File(
                      [thumbBlob],
                      `thumb_${sf.relativePath}.${hasEncryption ? 'bin' : 'jpg'}`,
                      { type: hasEncryption ? 'application/octet-stream' : 'image/jpeg' }
                    ),
                  }
                }
              }
            } catch {
              // ignore thumbnail errors
            }
          }

          return {
            file: sf.uploadFile ?? sf.file,
            relativePath: sf.relativePath,
            encryptionEnabled: hasEncryption,
            encryptionIv: iv,
            encryptionSalt: salt,
            thumbnailUploadFile,
          }
        })

      const resolvedFilesToUpload = await Promise.all(filesToUpload)

      const res = await uploadFilesStreamed(resolvedFilesToUpload, {
        batchName: explorerPrefix,
        ...(rootFolderName ? { folderName: rootFolderName } : {}),
        skipFiles: completedUploadedFiles,
        onUploadProgress: progress => {
          // Update upload item states for UI feedback
          const { currentFileIndex, progressPercent, bytesUploaded, totalBytes, uploadSpeed } =
            progress
          // Update each file's progress in the state
          // currentFileIndex is 1-indexed, array is 0-indexed
          resolvedFilesToUpload.forEach((file, idx) => {
            const fileKey = `${file.relativePath}_${file.file.size}`
            if (idx < currentFileIndex - 1) {
              setUploadItemStates(prev => ({
                ...prev,
                [fileKey]: {
                  fileKey,
                  status: 'completed',
                  progress: 100,
                  fileId: prev[fileKey]?.fileId || '',
                  speed: 0,
                  bytesUploaded: file.file.size,
                  totalBytes: file.file.size,
                },
              }))
            } else if (idx === currentFileIndex - 1) {
              setUploadItemStates(prev => ({
                ...prev,
                [fileKey]: {
                  fileKey,
                  status: 'uploading',
                  progress: progressPercent,
                  fileId: prev[fileKey]?.fileId || '',
                  speed: uploadSpeed,
                  bytesUploaded: bytesUploaded,
                  totalBytes: totalBytes,
                },
              }))
            }
          })
        },
      })

      const uploaded = res.uploaded ?? []

      // Track uploaded files for resume
      uploaded.forEach(item => {
        setCompletedUploadedFiles(prev => new Set(prev).add(item.key))
      })

      const count = uploaded.length
      showToastNotification(`تم الرفع بنجاح. عدد الملفات: ${count}`, 'success')
      setSelectedFiles([])
      setCompletedUploadedFiles(new Set())
      // Keep selected destination so user can keep uploading.

      // Refresh explorer after upload.
      void fetchExplorer()
    } catch (e: unknown) {
      const err = e as {
        message?: string
        response?: { data?: { message?: string; error?: string }; status?: number }
      }
      const backendMsg = err.response?.data?.message ?? err.response?.data?.error

      // Handle specific folder conflict error
      if (err.response?.status === 409) {
        showToastNotification('مجلد بهذا الاسم موجود بالفعل. يرجى استخدام اسم مختلف.', 'error')
      } else {
        showToastNotification(`فشل الرفع: ${backendMsg ?? err.message ?? 'خطأ غير معروف'}`, 'error')
      }
    } finally {
      setUploading(false)
      setHasTriggeredUpload(false) // Reset for next upload
    }
  }

  async function handleDelete(key: string) {
    if (
      !confirm(
        'هل أنت متأكد من حذف هذا الملف؟ سيتم نقله إلى سلة المهملات وحذفه نهائياً بعد 7 أيام.'
      )
    ) {
      return
    }

    setDeletingFiles(prev => new Set(prev).add(key))
    try {
      await moveFileToTrash(key)
      showToastNotification('تم نقل الملف إلى سلة المهملات بنجاح', 'success')
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      showToastNotification(
        `فشل حذف الملف: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`,
        'error'
      )
    } finally {
      setDeletingFiles(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  async function handleRestore(key: string) {
    if (!confirm('هل أنت متأكد من استعادة هذا الملف؟')) {
      return
    }

    try {
      await restoreFileFromTrash(key)
      showToastNotification('تم استعادة الملف بنجاح', 'success')
      await fetchTrashFiles()
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      showToastNotification(
        `فشل استعادة الملف: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`,
        'error'
      )
    }
  }

  // Bulk selection handlers
  function toggleFileSelection(key: string) {
    setSelectedForBulk(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function selectAllFiles() {
    const allKeys = filteredAndSortedFiles.map(f => f.key)
    setSelectedForBulk(new Set(allKeys))
  }

  function clearSelection() {
    setSelectedForBulk(new Set())
  }

  async function handleBulkDelete() {
    if (selectedForBulk.size === 0) return
    if (
      !confirm(`هل أنت متأكد من حذف ${selectedForBulk.size} ملفات؟ سيتم نقلها إلى سلة المهملات.`)
    ) {
      return
    }

    setBulkLoading(true)
    try {
      const keys = Array.from(selectedForBulk)
      await bulkMoveToTrash(keys)
      showToastNotification(`تم نقل ${keys.length} ملفات إلى سلة المهملات`, 'success')
      setSelectedForBulk(new Set())
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      showToastNotification(
        `فشل حذف الملفات: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`,
        'error'
      )
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleBulkDownload() {
    if (selectedForBulk.size === 0) return

    const keys = Array.from(selectedForBulk)
    showToastNotification(`جاري تنزيل ${keys.length} ملفات...`, 'info')

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const filename = filenameFromKey(key)
      try {
        await handleDownload(key, filename)
        // Add small delay between downloads to prevent browser blocking
        if (i < keys.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`Failed to download ${filename}:`, error)
      }
    }

    showToastNotification(`تم بدء تنزيل ${keys.length} ملفات`, 'success')
  }

  async function handleBulkRestore() {
    if (selectedForBulk.size === 0) return
    if (!confirm(`هل أنت متأكد من استعادة ${selectedForBulk.size} ملفات؟`)) {
      return
    }

    setBulkLoading(true)
    try {
      const keys = Array.from(selectedForBulk)
      await bulkRestoreFromTrash(keys)
      showToastNotification(`تم استعادة ${keys.length} ملفات بنجاح`, 'success')
      setSelectedForBulk(new Set())
      await fetchTrashFiles()
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      showToastNotification(
        `فشل استعادة الملفات: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`,
        'error'
      )
    } finally {
      setBulkLoading(false)
    }
  }

  const fetchTrashFiles = useCallback(async () => {
    setLoadingTrash(true)
    try {
      const res = await listTrashFiles()
      setTrashFiles(res.files || [])
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      showToastNotification(
        `فشل جلب ملفات المهملات: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`,
        'error'
      )
    } finally {
      setLoadingTrash(false)
    }
  }, [])

  useEffect(() => {
    if (showTrash) {
      void fetchTrashFiles()
    }
  }, [showTrash, fetchTrashFiles])

  function handlePreview(key: string, url: string) {
    const filename = filenameFromKey(key)
    const fileType = getFileType(filename)

    const fileMeta = filesHere.find(file => file.key === key)
    if (
      fileMeta?.encryptionEnabled &&
      fileMeta.fileId &&
      fileMeta.encryptionIv &&
      fileMeta.encryptionSalt
    ) {
      setEncryptedViewerFile({
        fileId: fileMeta.fileId,
        filename,
        mimeType: fileMeta.mimeType,
        size: fileMeta.size,
        encryptionEnabled: fileMeta.encryptionEnabled,
        encryptionIv: fileMeta.encryptionIv,
        encryptionSalt: fileMeta.encryptionSalt,
      })
      setEncryptedViewerOpen(true)
      return
    }

    setPreviewFile({ key, url, filename, type: fileType })
    setPreviewModalOpen(true)
  }

  function handlePreviewDownload() {
    if (previewFile) {
      void handleDownload(previewFile.key, previewFile.filename)
    }
  }

  function handleClosePreview() {
    setPreviewModalOpen(false)
    setPreviewFile(null)
  }

  function handleCloseEncryptedViewer() {
    setEncryptedViewerOpen(false)
    setEncryptedViewerFile(null)
  }

  // Folder creation functions
  async function handleCreateFolder() {
    const trimmedName = newFolderName.trim()

    // Client-side validation
    if (!trimmedName) {
      showToastNotification('يرجى إدخال اسم المجلد', 'error')
      return
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/
    if (invalidChars.test(trimmedName)) {
      showToastNotification('اسم المجلد يحتوي على أحرف غير صالحة: < > : " / \\ | ? *', 'error')
      return
    }

    // Check for names that start or end with dots or spaces
    if (
      trimmedName.startsWith('.') ||
      trimmedName.startsWith(' ') ||
      trimmedName.endsWith('.') ||
      trimmedName.endsWith(' ')
    ) {
      showToastNotification('اسم المجلد لا يمكن أن يبدأ أو ينتهي بنقطة أو مسافة', 'error')
      return
    }

    // Check for reserved names
    const reservedNames = [
      'CON',
      'PRN',
      'AUX',
      'NUL',
      'COM1',
      'COM2',
      'COM3',
      'COM4',
      'COM5',
      'COM6',
      'COM7',
      'COM8',
      'COM9',
      'LPT1',
      'LPT2',
      'LPT3',
      'LPT4',
      'LPT5',
      'LPT6',
      'LPT7',
      'LPT8',
      'LPT9',
    ]
    if (reservedNames.includes(trimmedName.toUpperCase())) {
      showToastNotification('اسم المجلد محجوز. يرجى استخدام اسم مختلف.', 'error')
      return
    }

    // Check length
    if (trimmedName.length > 255) {
      showToastNotification('اسم المجلد طويل جداً. الحد الأقصى هو 255 حرفًا.', 'error')
      return
    }

    // Check for duplicate folder names in current location
    const existingFolders = foldersHere.map(folder => {
      const cleaned = folder.endsWith('/') ? folder.slice(0, -1) : folder
      return cleaned.split('/').pop() || cleaned
    })

    if (existingFolders.includes(trimmedName)) {
      showToastNotification('مجلد بهذا الاسم موجود بالفعل في هذا الموقع', 'error')
      return
    }

    setCreatingFolder(true)
    setFolderNameError(null)

    try {
      const folderPath = currentPath ? `${currentPath}/${trimmedName}` : trimmedName
      const token = localStorage.getItem('larthaa_auth_token')

      const response = await fetch(`${API_ENV.apiBaseUrl?.trim()}/api/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          name: trimmedName,
          path: folderPath,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          showToastNotification('مجلد بهذا الاسم موجود بالفعل في هذا الموقع', 'error')
        } else {
          showToastNotification(data.message || 'فشل إنشاء المجلد', 'error')
        }
        return
      }

      showToastNotification('تم إنشاء المجلد بنجاح', 'success')
      setNewFolderName('')
      setShowCreateFolderModal(false)
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string }
      showToastNotification(`فشل إنشاء المجلد: ${err.message || 'خطأ غير معروف'}`, 'error')
    } finally {
      setCreatingFolder(false)
    }
  }

  // Folder deletion function
  async function handleDeleteFolder(folderPath: string) {
    if (!confirm('هل أنت متأكد من أنك تريد حذف هذا المجلد وجميع محتوياته؟')) {
      return
    }

    setFolderNameError(null)
    setDeletingFolders(prev => new Set(prev).add(folderPath))
    try {
      const token = localStorage.getItem('larthaa_auth_token')

      const response = await fetch(`${API_ENV.apiBaseUrl?.trim()}/api/folders`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          path: folderPath,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete folder')
      }

      showToastNotification('تم حذف المجلد بنجاح', 'success')
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string }
      showToastNotification(`فشل حذف المجلد: ${err.message || 'خطأ غير معروف'}`, 'error')
    } finally {
      setDeletingFolders(prev => {
        const next = new Set(prev)
        next.delete(folderPath)
        return next
      })
    }
  }

  // Folder download function with polling for prebuilt ZIP
  async function handleDownloadFolder(folderPath: string) {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY)
      const baseUrl = API_ENV.apiBaseUrl?.trim() || ''

      if (!token) {
        throw new Error('Missing auth token')
      }

      if (!baseUrl) {
        throw new Error('Missing API base URL')
      }

      const normalizedFolderPath = String(folderPath || '').replace(/^\/+|\/+$/g, '')
      const downloadUrl = `${baseUrl}/api/download/folder?path=${encodeURIComponent(normalizedFolderPath)}&token=${encodeURIComponent(token)}`

      showToastNotification('جاري تحضير ملف ZIP للمجلد...', 'info')

      // Poll for ZIP readiness
      let attempts = 0
      const maxAttempts = 30 // 30 seconds max

      while (attempts < maxAttempts) {
        const response = await fetch(downloadUrl)

        if (response.status === 200) {
          // ZIP is ready, trigger download
          const a = document.createElement('a')
          a.href = downloadUrl
          a.download = `${folderPath.split('/').pop() || 'folder'}.zip`
          a.rel = 'noreferrer'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          showToastNotification('بدأ تنزيل المجلد', 'success')
          return
        }

        if (response.status === 202) {
          // ZIP is being prepared, wait and retry
          await new Promise(resolve => setTimeout(resolve, 1000))
          attempts++
          continue
        }

        // Other error
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(errorData.message || 'فشل في تحضير المجلد')
      }

      throw new Error('انتهت مهلة تحضير المجلد. يرجى المحاولة مرة أخرى.')
    } catch (error) {
      console.error('Folder download error:', error)
      showToastNotification(
        `فشل تنزيل المجلد: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        'error'
      )
    }
  }

  // Team members functions
  const fetchTeamMembers = useCallback(async () => {
    setLoadingTeamMembers(true)
    try {
      const response = await api.get('/api/workspace/members')
      setTeamMembers(response.data.members || [])
    } catch (e: unknown) {
      const err = e as { message?: string }
      console.error('Failed to fetch team members:', err.message)
    } finally {
      setLoadingTeamMembers(false)
    }
  }, [])

  useEffect(() => {
    void fetchTeamMembers()
  }, [fetchTeamMembers])

  // Privacy control functions
  function openPrivacyModal(fileKey: string, filename: string) {
    setSelectedFileForPrivacy({ key: fileKey, filename })
    const currentSettings = filePrivacySettings[fileKey]
    setSelectedMembers(currentSettings?.allowedMembers || [])
    setShowPrivacyModal(true)
  }

  async function savePrivacySettings() {
    if (!selectedFileForPrivacy) return

    try {
      const token = localStorage.getItem('larthaa_auth_token')

      const response = await fetch(`${API_ENV.apiBaseUrl?.trim()}/api/files/privacy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          fileKey: selectedFileForPrivacy.key,
          restricted: selectedMembers.length > 0,
          allowedMembers: selectedMembers,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save privacy settings')
      }

      setFilePrivacySettings(prev => ({
        ...prev,
        [selectedFileForPrivacy.key]: {
          restricted: selectedMembers.length > 0,
          allowedMembers: selectedMembers,
          canAccess: true,
        },
      }))

      showToastNotification('تم حفظ إعدادات الخصوصية', 'success')
      setShowPrivacyModal(false)
      setSelectedFileForPrivacy(null)
      setSelectedMembers([])
    } catch (e: unknown) {
      const err = e as { message?: string }
      showToastNotification(`فشل حفظ الإعدادات: ${err.message || 'خطأ غير معروف'}`, 'error')
    }
  }

  function toggleMemberSelection(memberId: string) {
    setSelectedMembers(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    )
  }

  function canAccessFile(fileKey: string): boolean {
    const privacy = filePrivacySettings[fileKey]
    if (!privacy) {
      return true
    }
    return privacy.canAccess !== false
  }

  // Helper functions for filtering and sorting
  function getFileType(filename: string): 'image' | 'video' | 'document' | 'other' {
    const ext = filename.split('.').pop()?.toLowerCase() || ''

    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico']
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v']
    const documentExts = [
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      'txt',
      'rtf',
      'odt',
      'ods',
      'odp',
    ]

    if (imageExts.includes(ext)) return 'image'
    if (videoExts.includes(ext)) return 'video'
    if (documentExts.includes(ext)) return 'document'
    return 'other'
  }

  function filterFiles(
    files: Array<{
      key: string
      size?: number
      lastModified?: string
      createdAt?: string
      updatedAt?: string
      thumbnailKey?: string | null
    }>
  ) {
    if (fileFilter === 'all') return files

    return files.filter(file => {
      const filename = file.key.split('/').pop() || ''
      const fileType = getFileType(filename)

      switch (fileFilter) {
        case 'images':
          return fileType === 'image'
        case 'videos':
          return fileType === 'video'
        case 'documents':
          return fileType === 'document'
        default:
          return true
      }
    })
  }

  function sortFiles(
    files: Array<{
      key: string
      size?: number
      lastModified?: string
      createdAt?: string
      updatedAt?: string
      thumbnailKey?: string | null
    }>
  ) {
    return [...files].sort((a, b) => {
      const filenameA = a.key.split('/').pop() || ''
      const filenameB = b.key.split('/').pop() || ''

      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = filenameA.localeCompare(filenameB)
          break
        case 'size':
          const sizeA = a.size || 0
          const sizeB = b.size || 0
          comparison = sizeA - sizeB
          break
        case 'date':
          // Use actual creation dates from database, fallback to lastModified, then key
          const dateA = getFileDate(a)
          const dateB = getFileDate(b)

          if (dateA && dateB) {
            comparison = dateB.getTime() - dateA.getTime() // Newer first (descending)
          } else if (dateA) {
            comparison = -1 // a has date, b doesn't, so a comes first
          } else if (dateB) {
            comparison = 1 // b has date, a doesn't, so b comes first
          } else {
            // Fallback: reverse alphabetical order on key (often works for timestamped uploads)
            comparison = b.key.localeCompare(a.key)
          }
          break
        default:
          comparison = 0
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  // Helper function to get the most reliable date for a file
  function getFileDate(file: {
    key: string
    size?: number
    lastModified?: string
    createdAt?: string
    updatedAt?: string
  }): Date | null {
    // Prefer database creation date
    if (file.createdAt) {
      return new Date(file.createdAt)
    }

    // Then try database updated date
    if (file.updatedAt) {
      return new Date(file.updatedAt)
    }

    // Then try S3 last modified date
    if (file.lastModified) {
      return new Date(file.lastModified)
    }

    // Finally, try to extract timestamp from filename as fallback
    return extractTimestampFromKey(file.key) ? new Date(extractTimestampFromKey(file.key)!) : null
  }

  // Helper function to extract timestamp from file key
  function extractTimestampFromKey(key: string): number | null {
    // Try to extract timestamp from common patterns
    // Example: uploads/folder/1640995200000_filename.jpg or uploads/folder/2022-01-01_filename.jpg

    const filename = key.split('/').pop() || ''

    // Pattern 1: Unix timestamp at start (13 digits)
    const unixTimestampMatch = filename.match(/^(\d{13})/)
    if (unixTimestampMatch) {
      return parseInt(unixTimestampMatch[1])
    }

    // Pattern 2: Date format YYYY-MM-DD or YYYY_MM_DD
    const dateMatch = filename.match(/^(\d{4}[-_]\d{2}[-_]\d{2})/)
    if (dateMatch) {
      const dateStr = dateMatch[1].replace(/_/g, '-')
      return new Date(dateStr).getTime()
    }

    // Pattern 3: Look for timestamp in the full path
    const pathParts = key.split('/')
    for (const part of pathParts) {
      const pathTimestampMatch = part.match(/^(\d{13})/)
      if (pathTimestampMatch) {
        return parseInt(pathTimestampMatch[1])
      }
    }

    return null
  }

  const fetchExplorer = useCallback(
    async (
      reset: boolean = true,
      explorerPrefixOverride?: string | null,
      continuationTokenOverride?: string | null
    ) => {
      const effectivePrefix = explorerPrefixOverride ?? explorerPrefix
      if (reset) {
        setLoadingExplorer(true)
        setFilesHere([])
        setHasMoreFiles(true)
        setNextContinuationToken(null)
        setTotalFileCount(null)
        setFolderError(null)
      } else {
        setIsLoadingMoreFiles(true)
      }

      try {
        const limit = 50
        const continuationToken = reset ? undefined : continuationTokenOverride || undefined
        const res = await listUploadedObjects(effectivePrefix, limit, true, continuationToken)
        const visibleObjects = (res.objects ?? []).filter(obj => !isHiddenChatUploadPath(obj.key))

        if (reset) {
          // Filter out system folders like workspace-assets and workspace-logo
          const filteredFolders = (res.folders ?? []).filter(folder => {
            const folderName = folder.split('/').filter(Boolean).pop()
            return (
              folderName !== 'workspace-assets' &&
              folderName !== 'workspace-logo' &&
              !isHiddenChatUploadPath(folder) &&
              !isHiddenChatRootFolder(folder, currentPath)
            )
          })
          setFoldersHere(filteredFolders)
          setFilesHere(visibleObjects)
        } else {
          setFilesHere(prev => [...prev, ...visibleObjects])
        }

        setHasMoreFiles(res.pagination?.hasMore ?? false)
        setNextContinuationToken(res.pagination?.nextContinuationToken ?? null)

        // Store total file count from first page response
        if (reset && res.pagination?.totalFileCount !== undefined) {
          setTotalFileCount(res.pagination.totalFileCount)
        }

        // Fetch privacy settings for all files (only on reset or first load)
        if (reset || (!continuationToken && res.objects)) {
          const fileKeys = visibleObjects.map(obj => obj.key)
          if (fileKeys.length > 0) {
            try {
              const privacyRes = await fetchBulkPrivacySettings(fileKeys)
              if (privacyRes.settings) {
                setFilePrivacySettings(prev => ({ ...prev, ...privacyRes.settings }))
              }
            } catch (privacyError) {
              console.error('Failed to fetch privacy settings:', privacyError)
            }
          }
        }
      } catch (e: unknown) {
        const err = e as { message?: string; response?: { data?: { message?: string } } }
        const errorMsg = err.response?.data?.message ?? err.message ?? 'فشل جلب الملفات'
        showToastNotification(errorMsg, 'error')

        // Set folder error state if resetting (initial folder load)
        if (reset) {
          setFolderError(errorMsg)
          setFoldersHere([])
          setFilesHere([])
        }
      } finally {
        if (reset) {
          setLoadingExplorer(false)
        } else {
          setIsLoadingMoreFiles(false)
        }
      }
    },
    [currentPath, explorerPrefix]
  )

  // Keep fetchExplorerRef updated
  useEffect(() => {
    fetchExplorerRef.current = fetchExplorer
  }, [fetchExplorer])

  const loadMoreFiles = useCallback(async () => {
    if (!hasMoreFiles || isLoadingMoreFiles || loadingExplorer) return

    await fetchExplorer(false, null, nextContinuationToken)
  }, [hasMoreFiles, isLoadingMoreFiles, loadingExplorer, fetchExplorer, nextContinuationToken])

  // Infinite scroll handler
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget

      // When user is within 200px of bottom, load more
      if (scrollHeight - scrollTop - clientHeight < 200) {
        void loadMoreFiles()
      }
    },
    [loadMoreFiles]
  )

  useEffect(() => {
    const unsubscribe = subscribeRealtime(
      event => {
        if (event.scope !== 'files') return
        if (event.action === 'upload_progress') return
        void fetchExplorer(true)
        if (showTrash) {
          void fetchTrashFiles()
        }
      },
      () => {
        // page stays usable even if realtime stream reconnects
      }
    )

    return unsubscribe
  }, [fetchExplorer, fetchTrashFiles, showTrash])

  function keyToPublicUrl(key: string) {
    const publicBase = API_ENV.r2PublicBaseUrl?.trim() || ''
    const safeKey = key.startsWith('/') ? key.slice(1) : key
    if (publicBase) {
      const base = publicBase.endsWith('/') ? publicBase.slice(0, -1) : publicBase
      return `${base}/${safeKey}`
    }
    const base = API_ENV.apiBaseUrl?.trim() || ''
    if (!base) {
      return ''
    }
    const normalized = base.endsWith('/') ? base.slice(0, -1) : base
    return `${normalized}/api/image?key=${encodeURIComponent(safeKey)}`
  }

  const breadcrumbs = useMemo(() => {
    const parts = currentPath.split('/').filter(Boolean)
    const crumbs: Array<{ label: string; path: string }> = [{ label: 'uploads', path: '' }]
    const acc: string[] = []
    for (const seg of parts) {
      acc.push(seg)
      crumbs.push({ label: seg, path: acc.join('/') })
    }
    return crumbs
  }, [currentPath])

  return {
    breadcrumbs,
    keyToPublicUrl,
    handleScroll,
    loadMoreFiles,
    fetchExplorer,
    canAccessFile,
    toggleMemberSelection,
    savePrivacySettings,
    openPrivacyModal,
    fetchTeamMembers,
    handleDownloadFolder,
    handleDeleteFolder,
    handleCreateFolder,
    handleCloseEncryptedViewer,
    handleClosePreview,
    handlePreviewDownload,
    handlePreview,
    handleBulkRestore,
    handleBulkDownload,
    handleBulkDelete,
    clearSelection,
    selectAllFiles,
    toggleFileSelection,
    handleRestore,
    handleDelete,
    isLoadingMoreFiles,
    totalFileCount,
    hasMoreFiles,
    filePrivacySettings,
    teamMembers,
    deletingFolders,
    deletingFiles,
    creatingFolder,
    showCreateFolderModal,
    newFolderName,
    setNewFolderName,
    folderError,
    folderNameError,
    fileFilter,
    setFileFilter,
    sortBy,
    setSortBy,
    sortOrder,
    viewMode,
    setViewMode,
    scrollContainerRef,
    showTrash,
    setShowTrash,
    trashFiles,
    loadingTrash,
    bulkLoading,
    showPrivacyModal,
    loadingTeamMembers,
    showToast,
    toastType,
    toastMessage,
    closeToast,
    previewModalOpen,
    encryptedViewerOpen,
    encryptedViewerFile,
    foldersHere,
    filesHere,
    loadingExplorer,
    selectedFiles,
    setSelectedFiles,
    uploading,
    encryptionPassword,
    uploadItemStates,
    currentPath,
  }
}
