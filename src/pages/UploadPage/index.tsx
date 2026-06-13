import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Box,
  Button,
  Container,
  Typography,
  Tooltip,
  CircularProgress,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import PushPinIcon from '@mui/icons-material/PushPin'
import FolderIcon from '@mui/icons-material/Folder'
import DeleteIcon from '@mui/icons-material/Delete'
import RestoreIcon from '@mui/icons-material/Restore'
import DownloadIcon from '@mui/icons-material/Download'
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder'
import SelectAllIcon from '@mui/icons-material/SelectAll'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import LockIcon from '@mui/icons-material/Lock'
import EncryptedUploadDropzone, {
  type SelectedUploadFile,
} from '../../components/EncryptedUploadDropzone'
import { PasswordInput } from '../../components/login/PasswordInput'
import EncryptedFileViewer from '../../components/EncryptedFileViewer'
import { useAuth } from '../../contexts/AuthContext'
import { useExplorerCache } from '../../contexts/ExplorerCacheContext'
import type { ExplorerCacheEntry } from '../../lib/explorerCache'
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
  downloadWorkspaceFolderZip,
  deleteWorkspaceFolder,
  escapePathAfterFolderDelete,
  relativeFolderPathUnderDeleted,
  storageKeyUnderDeletedFolder,
  filterFoldersForExplorer,
  filterExplorerObjects,
  fetchTrashedOriginalKeys,
  loadPersistedTrashedKeys,
  persistTrashedKeys,
  addPersistedTrashedKeys,
} from '../../api/uploadApi'
import { subscribeRealtime } from '../../api/realtimeApi'
import { api } from '../../api/http'
import {
  FileItemSkeleton,
  FileItemGridSkeleton,
  FolderItemSkeleton,
  FolderItemGridSkeleton,
} from '../../components/SkeletonLoaders'
import Toast from '../../components/Toast'
import { ServerMinimalistic, Widget } from '@solar-icons/react'
import { useDownload } from '../../contexts/DownloadContext'
import { usePinnedFolders, folderFullPath, normalizeFolderPath } from '../../hooks/usePinnedFolders'
import { FileItem, FileItemGrid } from './components/FileItem'
import { FolderItem, FolderItemGrid } from './components/FolderItem'
import { TrashFileItem } from './components/TrashFileItem'
import { FilePreviewModal } from './components/FilePreviewModal'
import { DownloadProgressDialog } from './components/DownloadProgressDialog'
import { FolderZipDialog } from './components/FolderZipDialog'
import {
  filenameFromKey,
  validateFileQuality,
  getClientEncryptionKey,
  setClientEncryptionKey,
  objectKeyMatchesDeepLink,
  deriveRelativeFolderFromFileKey,
  uploadDevLog,
  uploadDevWarn,
} from './components/utils'

const MAX_DOWNLOAD_RETRIES = 3

export default function UploadPage() {
  const { user } = useAuth()
  const { isPinned, togglePin, movePin, sortFolders, pinnedPaths } = usePinnedFolders(
    user?.id,
    user?.workspaceId
  )
  const [searchParams, setSearchParams] = useSearchParams()

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

  // Admin folder delete confirmation
  const [folderPendingDelete, setFolderPendingDelete] = useState<string | null>(null)
  const [folderDeletePassword, setFolderDeletePassword] = useState('')
  const [folderDeletePasswordVisible, setFolderDeletePasswordVisible] = useState(false)
  const [folderDeleteError, setFolderDeleteError] = useState<string | null>(null)
  const [folderDeleteSubmitting, setFolderDeleteSubmitting] = useState(false)

  const isWorkspaceAdmin = Boolean(user?.isAdmin)

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
  const [downloadingFolders, setDownloadingFolders] = useState<Set<string>>(new Set())
  const [folderZipProgress, setFolderZipProgress] = useState<{
    folderPath: string
    folderName: string
    elapsedSeconds: number
    phase: 'preparing' | 'downloading' | 'zipping'
    serverMessage?: string
    filesDone?: number
    filesTotal?: number
    currentFile?: string
  } | null>(null)
  const folderZipAbortRef = useRef<AbortController | null>(null)

  // Independent timer for folder download dialog so elapsed time ticks every second
  const [folderZipDisplayElapsed, setFolderZipDisplayElapsed] = useState(0)
  useEffect(() => {
    if (!folderZipProgress) {
      setFolderZipDisplayElapsed(0)
      return
    }
    setFolderZipDisplayElapsed(folderZipProgress.elapsedSeconds)
    const id = setInterval(() => {
      setFolderZipDisplayElapsed(v => v + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [folderZipProgress ? folderZipProgress.folderPath : ''])

  // Filter and sort state
  const [fileFilter, setFileFilter] = useState<'all' | 'images' | 'videos' | 'documents'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date')
  const sortOrder = 'asc' // Fixed sort order since setSortOrder is unused

  // Bulk selection state
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set())
  // Deep-link highlight: key of the file navigated to from activity page
  const [highlightedFileKey, setHighlightedFileKey] = useState<string>('')
  const highlightClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setHighlightedFileKeyWithAutoClear = useCallback((key: string) => {
    if (highlightClearTimerRef.current) clearTimeout(highlightClearTimerRef.current)
    setHighlightedFileKey(key)
    highlightClearTimerRef.current = setTimeout(() => setHighlightedFileKey(''), 2500)
  }, [])
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

          const { decryptEncryptedBlobForDownload } = await import('../../lib/encryption')
          const encBlob = new Blob(chunks, { type: 'application/octet-stream' })
          const encrypted = await encBlob.arrayBuffer()

          const decryptedBlob = await decryptEncryptedBlobForDownload(
            encrypted,
            fileMeta.encryptionIv,
            fileMeta.encryptionSalt,
            encryptionKey,
            fileMeta.size || encrypted.byteLength,
            pct => updateDownload(downloadKey, { decryptionProgress: pct, progress: pct })
          )

          if (fileMeta.fileId && fileMeta.mimeType) {
            const { putFileInCache, generateCacheKey } = await import('../../lib/fileCache')
            await putFileInCache(generateCacheKey(fileMeta.fileId, encryptionKey), decryptedBlob, {
              mimeType: fileMeta.mimeType,
              filename,
              size: fileMeta.size || encrypted.byteLength,
            })
          }

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

  // Handle folder/file navigation from URL search params — single source of truth
  const fetchExplorerRef = useRef<typeof fetchExplorer | null>(null)

  const explorerCache = useExplorerCache()

  // In-memory cache for instant sync access (complements IndexedDB async cache)
  // This makes folder navigation feel instant like an OS file manager
  const memoryCacheRef = useRef<Map<string, ExplorerCacheEntry>>(new Map())

  // currentPath is derived from searchParams so it is always in sync with the URL
  const currentPath = useMemo(() => {
    const workspaceId = user?.workspaceId?.trim() || ''
    const folder = searchParams.get('folder')
    const fileFromQuery = (searchParams.get('file') || '').trim()
    const derivedPathFromFile = workspaceId
      ? deriveRelativeFolderFromFileKey(fileFromQuery, workspaceId)
      : ''
    const folderFromQuery = (folder || '').replace(/^\/+/, '')
    return (derivedPathFromFile || folderFromQuery || '').replace(/^\/+/, '')
  }, [searchParams, user?.workspaceId])

  const sortedFoldersHere = useMemo(
    () => sortFolders(foldersHere, currentPath),
    [foldersHere, currentPath, sortFolders]
  )

  // Single effect — fires whenever the URL changes, fetches the correct folder
  useEffect(() => {
    const workspaceId = user?.workspaceId?.trim()
    if (!workspaceId) return

    const ROOT_PREFIX = `uploads/${workspaceId}`
    const computedExplorerPrefix = currentPath ? `${ROOT_PREFIX}/${currentPath}` : ROOT_PREFIX

    const folder = searchParams.get('folder')
    const fileFromQuery = (searchParams.get('file') || '').trim()
    if (folder || fileFromQuery) {
      setShowTrash(false)
    }
    setFolderError(null)

    uploadDevLog('[Nav] effect: fetching', { currentPath, computedExplorerPrefix })
    if (fetchExplorerRef.current) {
      void fetchExplorerRef.current(true, computedExplorerPrefix, null)
    } else {
      void fetchExplorer(true, computedExplorerPrefix, null)
    }
  }, [currentPath, user?.workspaceId])

  useEffect(() => {
    if (useStreamUpload && canUpload && selectedFiles.length > 0 && !hasTriggeredUpload) {
      setHasTriggeredUpload(true)
      void handleUpload()
    } else if (selectedFiles.length === 0) {
      setHasTriggeredUpload(false)
    }
  }, [canUpload, selectedFiles.length, hasTriggeredUpload])

  const deepLinkFileKeyRef = useRef('')
  const deepLinkLoadAttemptsRef = useRef(0)
  const deepLinkGlobalSearchRef = useRef<Record<string, boolean>>({})
  /** يمنع تأثير الرابط العميق من استدعاء loadMore أثناء أول جلب (قبل أن يصبح loadingExplorer في الـ render true). */
  const explorerResetInFlightRef = useRef(false)
  const trashedOriginalKeysRef = useRef<Set<string>>(new Set())

  const refreshTrashedKeysCache = useCallback(async () => {
    const workspaceId = user?.workspaceId?.trim()
    try {
      const keys = await fetchTrashedOriginalKeys()
      trashedOriginalKeysRef.current = keys
      if (workspaceId) persistTrashedKeys(workspaceId, keys)
    } catch {
      if (workspaceId && trashedOriginalKeysRef.current.size === 0) {
        trashedOriginalKeysRef.current = loadPersistedTrashedKeys(workspaceId)
      }
    }
  }, [user?.workspaceId])

  useEffect(() => {
    const workspaceId = user?.workspaceId?.trim()
    if (!workspaceId) return
    trashedOriginalKeysRef.current = loadPersistedTrashedKeys(workspaceId)
  }, [user?.workspaceId])

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
      const ws = user?.workspaceId?.trim()
      if (ws) addPersistedTrashedKeys(ws, [key])
      trashedOriginalKeysRef.current.add(key.replace(/^\/+/, ''))
      setFilesHere(prev => prev.filter(file => file.key !== key))
      showToastNotification('تم نقل الملف إلى سلة المهملات بنجاح', 'success')
      await refreshTrashedKeysCache()
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
      trashedOriginalKeysRef.current.delete(key.replace(/^\/+/, ''))
      showToastNotification('تم استعادة الملف بنجاح', 'success')
      await refreshTrashedKeysCache()
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
      const ws = user?.workspaceId?.trim()
      if (ws) addPersistedTrashedKeys(ws, keys)
      for (const key of keys) {
        trashedOriginalKeysRef.current.add(key.replace(/^\/+/, ''))
      }
      setFilesHere(prev => prev.filter(file => !keys.includes(file.key)))
      showToastNotification(`تم نقل ${keys.length} ملفات إلى سلة المهملات`, 'success')
      setSelectedForBulk(new Set())
      await refreshTrashedKeysCache()
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
      for (const key of keys) {
        trashedOriginalKeysRef.current.delete(key.replace(/^\/+/, ''))
      }
      showToastNotification(`تم استعادة ${keys.length} ملفات بنجاح`, 'success')
      setSelectedForBulk(new Set())
      await refreshTrashedKeysCache()
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
      const workspaceId = user?.workspaceId?.trim()
      const keys = new Set<string>(
        (res.files ?? []).map((f: any) => String(f.originalKey || '').replace(/^\/+/, ''))
      )
      trashedOriginalKeysRef.current = keys
      if (workspaceId) persistTrashedKeys(workspaceId, keys)
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

  const fetchTrashFilesRef = useRef(fetchTrashFiles)
  fetchTrashFilesRef.current = fetchTrashFiles
  const showTrashRef = useRef(showTrash)
  showTrashRef.current = showTrash
  useEffect(() => {
    if (showTrash) {
      void fetchTrashFilesRef.current()
    }
  }, [showTrash])

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
      memoryCacheRef.current.delete(explorerPrefix)
      await explorerCache.invalidate(explorerPrefix)
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string }
      showToastNotification(`فشل إنشاء المجلد: ${err.message || 'خطأ غير معروف'}`, 'error')
    } finally {
      setCreatingFolder(false)
    }
  }

  function closeFolderDeleteDialog() {
    if (folderDeleteSubmitting) return
    setFolderPendingDelete(null)
    setFolderDeletePassword('')
    setFolderDeleteError(null)
    setFolderDeletePasswordVisible(false)
  }

  function requestDeleteFolder(folderPath: string) {
    if (!isWorkspaceAdmin) {
      showToastNotification('حذف المجلدات متاح للمدير فقط', 'error')
      return
    }
    setFolderDeleteError(null)
    setFolderDeletePassword('')
    setFolderPendingDelete(folderPath)
  }

  async function confirmDeleteFolder() {
    const folderPath = folderPendingDelete
    if (!folderPath) return

    if (!isWorkspaceAdmin) {
      showToastNotification('حذف المجلدات متاح للمدير فقط', 'error')
      closeFolderDeleteDialog()
      return
    }

    const password = folderDeletePassword.trim()
    if (!password) {
      setFolderDeleteError('أدخل كلمة مرور حساب المدير')
      return
    }

    const workspaceId = user?.workspaceId?.trim()
    if (!workspaceId) {
      showToastNotification('تعذر تحديد مساحة العمل', 'error')
      return
    }

    setFolderDeleteError(null)
    setFolderDeleteSubmitting(true)
    setFolderNameError(null)
    setDeletingFolders(prev => new Set(prev).add(folderPath))
    showToastNotification('جاري حذف المجلد ومحتوياته...', 'info')

    try {
      const { trashedFiles } = await deleteWorkspaceFolder({
        folderPath,
        workspaceId,
        adminPassword: password,
      })

      closeFolderDeleteDialog()

      // Evict all cached entries at or under the deleted folder prefix
      // Also clear memory cache for instant consistency
      for (const key of memoryCacheRef.current.keys()) {
        if (key === explorerPrefix || key.startsWith(`${explorerPrefix}/`)) {
          memoryCacheRef.current.delete(key)
        }
      }
      await explorerCache.invalidateAll(explorerPrefix)
      setFoldersHere(prev =>
        prev.filter(p => {
          const cleaned = p.endsWith('/') ? p.slice(0, -1) : p
          const fullPath = currentPath ? `${currentPath}/${cleaned}` : cleaned
          return !relativeFolderPathUnderDeleted(fullPath, folderPath)
        })
      )
      setFilesHere(prev =>
        prev.filter(obj => !storageKeyUnderDeletedFolder(obj.key, workspaceId, folderPath))
      )

      const escapePath = escapePathAfterFolderDelete(currentPath, folderPath)
      if (escapePath !== null) {
        if (escapePath) {
          setSearchParams({ folder: escapePath })
        } else {
          setSearchParams({})
        }
      }

      showToastNotification(
        trashedFiles > 0
          ? `تم حذف المجلد (نُقل ${trashedFiles} ملفاً إلى سلة المهملات)`
          : 'تم حذف المجلد ومحتوياته بنجاح',
        'success'
      )
      await refreshTrashedKeysCache()
      if (escapePath !== null) {
        const prefixOverride = escapePath.trim()
          ? `uploads/${workspaceId}/${escapePath.trim()}`
          : `uploads/${workspaceId}`
        await fetchExplorer(true, prefixOverride)
      } else {
        await fetchExplorer(true)
      }
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      const msg =
        err.response?.data?.message || err.message || 'فشل حذف المجلد'
      setFolderDeleteError(msg)
      showToastNotification(`فشل حذف المجلد: ${msg}`, 'error')
    } finally {
      setDeletingFolders(prev => {
        const next = new Set(prev)
        next.delete(folderPath)
        return next
      })
      setFolderDeleteSubmitting(false)
    }
  }

  const cancelFolderZipDownload = useCallback(() => {
    folderZipAbortRef.current?.abort()
    folderZipAbortRef.current = null
    setFolderZipProgress(null)
    setDownloadingFolders(new Set())
  }, [])

  async function handleDownloadFolder(folderPath: string) {
    if (downloadingFolders.has(folderPath)) return

    const folderName = folderPath.split('/').filter(Boolean).pop() || folderPath
    const abortController = new AbortController()
    folderZipAbortRef.current = abortController

    setDownloadingFolders(prev => new Set(prev).add(folderPath))
    setFolderZipProgress({
      folderPath,
      folderName,
      elapsedSeconds: 0,
      phase: 'preparing',
    })

    try {
      const encryptionPassword = sessionStorage.getItem('file_encryption_password')
      const result = await downloadWorkspaceFolderZip({
        folderPath,
        workspaceId: user?.workspaceId,
        signal: abortController.signal,
        encryptionPassword,
        onProgress: progress => {
          setFolderZipProgress({
            folderPath,
            folderName,
            elapsedSeconds: progress.elapsedSeconds,
            phase: progress.phase,
            serverMessage: progress.serverMessage,
            filesDone: progress.filesDone,
            filesTotal: progress.filesTotal,
            currentFile: progress.currentFile,
          })
        },
      })
      const countNote =
        result.fileCount != null ? ` (${result.fileCount} ملف)` : ''
      if (result.failedFiles?.length) {
        showToastNotification(
          `تم تنزيل ${result.fileCount} ملف. تعذر تنزيل ${result.failedFiles.length}: ${result.failedFiles[0]}`,
          'info'
        )
      } else {
        showToastNotification(`تم تنزيل المجلد بنجاح${countNote}`, 'success')
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        showToastNotification('تم إلغاء تنزيل المجلد', 'info')
      } else {
        console.error('Folder download error:', error)
        const msg = error instanceof Error ? error.message : 'خطأ غير معروف'
        showToastNotification(
          msg.length > 120 ? `${msg.slice(0, 120)}...` : `فشل تنزيل المجلد: ${msg}`,
          'error'
        )
      }
    } finally {
      folderZipAbortRef.current = null
      setFolderZipProgress(null)
      setDownloadingFolders(prev => {
        const next = new Set(prev)
        next.delete(folderPath)
        return next
      })
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
        case 'size': {
          const sizeA = a.size || 0
          const sizeB = b.size || 0
          comparison = sizeA - sizeB
          break
        }
        case 'date': {
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
        }
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
      // Derive the currentPath that matches effectivePrefix so filterFoldersForExplorer
      // uses the correct path even when called with an override before state has updated.
      const effectiveCurrentPath = (() => {
        if (!explorerPrefixOverride) return currentPath
        const root = ROOT_PREFIX
        if (effectivePrefix === root) return ''
        if (effectivePrefix.startsWith(`${root}/`)) return effectivePrefix.slice(root.length + 1)
        return currentPath
      })()

      // --- Cache read (reset only) ---
      // Check memory cache first (sync, instant) before async IndexedDB
      const memoryEntry = reset ? memoryCacheRef.current.get(effectivePrefix) : undefined
      const CACHE_FRESHNESS_MS = 10_000 // Skip revalidation for cache < 10s old

      if (memoryEntry) {
        const cacheAge = Date.now() - (memoryEntry.updatedAt || 0)
        const isCacheFresh = cacheAge < CACHE_FRESHNESS_MS
        // Populate state instantly from memory cache
        setFoldersHere(memoryEntry.folders as string[])
        setFilesHere(memoryEntry.files as typeof filesHere)
        setHasMoreFiles(memoryEntry.hasMore)
        setNextContinuationToken(memoryEntry.nextToken)
        setFolderError(null)

        // Only revalidate in background if cache is older than freshness threshold
        if (!isCacheFresh) {
          void (async () => {
            try {
              const res = await listUploadedObjects(effectivePrefix, 50, true, undefined)
              const visibleObjects = filterExplorerObjects(res.objects ?? [], trashedOriginalKeysRef.current)
              const filteredFolders = filterFoldersForExplorer(res.folders ?? [], effectiveCurrentPath)
              const newEntry: ExplorerCacheEntry = {
                prefix: effectivePrefix,
                folders: filteredFolders,
                files: visibleObjects,
                hasMore: res.pagination?.hasMore ?? false,
                nextToken: res.pagination?.nextContinuationToken ?? null,
                updatedAt: Date.now(),
              }
              memoryCacheRef.current.set(effectivePrefix, newEntry)
              await explorerCache.setCache(newEntry)
              setFoldersHere(filteredFolders)
              setFilesHere(visibleObjects)
              setHasMoreFiles(res.pagination?.hasMore ?? false)
              setNextContinuationToken(res.pagination?.nextContinuationToken ?? null)
            } catch {
              // Background revalidation failure is non-fatal; stale cache remains
            }
          })()
        }
        return
      }

      // Fall back to IndexedDB cache
      const cachedEntry = reset ? await explorerCache.getCache(effectivePrefix) : null
      const cacheAge = cachedEntry ? Date.now() - (cachedEntry.updatedAt || 0) : Infinity
      const isCacheFresh = cachedEntry && cacheAge < CACHE_FRESHNESS_MS

      if (cachedEntry) {
        // Also populate memory cache for next navigation
        memoryCacheRef.current.set(effectivePrefix, cachedEntry)
        // Populate state instantly from cache so the UI renders without a loading spinner
        setFoldersHere(cachedEntry.folders as string[])
        setFilesHere(cachedEntry.files as typeof filesHere)
        setHasMoreFiles(cachedEntry.hasMore)
        setNextContinuationToken(cachedEntry.nextToken)
        setFolderError(null)

        // Only revalidate in background if cache is older than freshness threshold
        // This prevents double renders when rapidly navigating folders
        if (!isCacheFresh) {
          void (async () => {
            try {
              const res = await listUploadedObjects(effectivePrefix, 50, true, undefined)
              const visibleObjects = filterExplorerObjects(res.objects ?? [], trashedOriginalKeysRef.current)
              const filteredFolders = filterFoldersForExplorer(res.folders ?? [], effectiveCurrentPath)
              const newEntry: ExplorerCacheEntry = {
                prefix: effectivePrefix,
                folders: filteredFolders,
                files: visibleObjects,
                hasMore: res.pagination?.hasMore ?? false,
                nextToken: res.pagination?.nextContinuationToken ?? null,
                updatedAt: Date.now(),
              }
              memoryCacheRef.current.set(effectivePrefix, newEntry)
              await explorerCache.setCache(newEntry)
              setFoldersHere(filteredFolders)
              setFilesHere(visibleObjects)
              setHasMoreFiles(res.pagination?.hasMore ?? false)
              setNextContinuationToken(res.pagination?.nextContinuationToken ?? null)
            } catch {
              // Background revalidation failure is non-fatal; stale cache remains
            }
          })()
        }
        return
      }

      if (reset) {
        explorerResetInFlightRef.current = true
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
        const visibleObjects = filterExplorerObjects(
          res.objects ?? [],
          trashedOriginalKeysRef.current
        )

        if (reset) {
          // Filter out system folders like workspace-assets and workspace-logo
          const filteredFolders = filterFoldersForExplorer(res.folders ?? [], effectiveCurrentPath)
          setFoldersHere(filteredFolders)
          setFilesHere(visibleObjects)
          // Write to both caches for instant navigation
          const newEntry: ExplorerCacheEntry = {
            prefix: effectivePrefix,
            folders: filteredFolders,
            files: visibleObjects,
            hasMore: res.pagination?.hasMore ?? false,
            nextToken: res.pagination?.nextContinuationToken ?? null,
            updatedAt: Date.now(),
          }
          memoryCacheRef.current.set(effectivePrefix, newEntry)
          void explorerCache.setCache(newEntry)
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
          explorerResetInFlightRef.current = false
          setLoadingExplorer(false)
        } else {
          setIsLoadingMoreFiles(false)
        }
      }
    },
    [currentPath, explorerPrefix]
  )

  // Keep fetchExplorerRef updated synchronously during render so effects always see the latest version
  fetchExplorerRef.current = fetchExplorer

  const explorerRefreshAfterUploadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleExplorerRefreshAfterUpload = useCallback(() => {
    if (explorerRefreshAfterUploadTimerRef.current) {
      clearTimeout(explorerRefreshAfterUploadTimerRef.current)
    }
    explorerRefreshAfterUploadTimerRef.current = setTimeout(() => {
      explorerRefreshAfterUploadTimerRef.current = null
      // Evict cache for current prefix so the forced refresh isn't served stale
      memoryCacheRef.current.delete(explorerPrefix)
      void explorerCache.invalidate(explorerPrefix)
      void fetchExplorer(true)
    }, 400)
  }, [fetchExplorer, explorerPrefix])

  useEffect(() => {
    return () => {
      if (explorerRefreshAfterUploadTimerRef.current) {
        clearTimeout(explorerRefreshAfterUploadTimerRef.current)
      }
    }
  }, [])

  const loadMoreFiles = useCallback(async () => {
    if (!hasMoreFiles || isLoadingMoreFiles || loadingExplorer) return

    await fetchExplorer(false, null, nextContinuationToken)
  }, [hasMoreFiles, isLoadingMoreFiles, loadingExplorer, fetchExplorer, nextContinuationToken])

  // من سجل الأنشطة: ?file=… — جلب صفحات حتى يظهر الملف ثم تمييزه وتمرير العرض إليه
  useEffect(() => {
    const requestedFileKey = (searchParams.get('file') || '').trim()
    if (requestedFileKey !== deepLinkFileKeyRef.current) {
      deepLinkFileKeyRef.current = requestedFileKey
      deepLinkLoadAttemptsRef.current = 0
    }
    if (!requestedFileKey) {
      uploadDevLog('[Upload] deep-link skipped: no file param')
      return
    }
    if (loadingExplorer || explorerResetInFlightRef.current) {
      uploadDevLog('[Upload] deep-link waiting explorer reset', {
        requestedFileKey,
        loadingExplorer,
        explorerResetInFlight: explorerResetInFlightRef.current,
      })
      return
    }
    // Also wait if filesHere is still empty with hasMoreFiles=true — the initial fetch
    // hasn't returned yet (we're in the window between reset clearing the list and the
    // response arriving). Proceeding here causes loadMoreFiles to fire as a non-reset
    // append fetch, placing files at the bottom of the list.
    if (filesHere.length === 0 && hasMoreFiles) {
      uploadDevLog('[Upload] deep-link waiting for initial fetch to land', { requestedFileKey })
      return
    }

    const matched = filesHere.find(file => objectKeyMatchesDeepLink(file.key, requestedFileKey))
    if (matched) {
      deepLinkLoadAttemptsRef.current = 0
      uploadDevLog('[Upload] deep-link matched file', {
        requestedFileKey,
        matchedKey: matched.key,
        filesLoaded: filesHere.length,
        currentPath,
      })
      setHighlightedFileKeyWithAutoClear(matched.key)
      const escaped =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(matched.key)
          : matched.key.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      const run = () => {
        document.querySelector(`[data-file-key="${escaped}"]`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }
      requestAnimationFrame(run)
      setTimeout(run, 200)
      return
    }

    // Last-resort fallback: sometimes production returns a variant key format.
    const requestedName = requestedFileKey.split('/').filter(Boolean).pop() || ''
    if (requestedName) {
      const byNameOnly = filesHere.find(file => {
        const name = file.key.split('/').filter(Boolean).pop() || ''
        return name === requestedName
      })
      if (byNameOnly) {
        uploadDevWarn('[Upload] deep-link matched by filename fallback', {
          requestedFileKey,
          matchedKey: byNameOnly.key,
          filesLoaded: filesHere.length,
          currentPath,
        })
        setHighlightedFileKeyWithAutoClear(byNameOnly.key)
        const escaped =
          typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
            ? CSS.escape(byNameOnly.key)
            : byNameOnly.key.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
        const run = () => {
          document.querySelector(`[data-file-key="${escaped}"]`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        }
        requestAnimationFrame(run)
        setTimeout(run, 200)
        return
      }
    }

    if (!hasMoreFiles || isLoadingMoreFiles) {
      const sampleLoadedKeys = filesHere.slice(0, 5).map(f => f.key)
      uploadDevLog('[Upload] deep-link stopped', {
        requestedFileKey,
        reason: !hasMoreFiles ? 'no-more-files' : 'loading-more-in-progress',
        filesLoaded: filesHere.length,
        currentPath,
        sampleLoadedKeys,
      })
      if (!hasMoreFiles && !isLoadingMoreFiles && !deepLinkGlobalSearchRef.current[requestedFileKey]) {
        deepLinkGlobalSearchRef.current[requestedFileKey] = true
        void (async () => {
          try {
            uploadDevWarn('[Upload] deep-link fallback: global workspace search started', {
              requestedFileKey,
            })
            let continuationToken: string | undefined
            let matchedKey: string | null = null
            let pages = 0
            while (pages < 20 && !matchedKey) {
              const res = await listUploadedObjects(
                ROOT_PREFIX,
                200,
                false,
                continuationToken
              )
              const objects = res.objects ?? []
              const found = objects.find(obj => objectKeyMatchesDeepLink(obj.key, requestedFileKey))
              if (found) {
                matchedKey = found.key
                break
              }
              if (!res.pagination?.hasMore || !res.pagination?.nextContinuationToken) break
              continuationToken = res.pagination.nextContinuationToken
              pages += 1
            }

            if (!matchedKey) {
              uploadDevWarn('[Upload] deep-link fallback: global search did not find file', {
                requestedFileKey,
              })
              return
            }

            const workspaceId = user?.workspaceId?.trim() || ''
            const matchedFolder = deriveRelativeFolderFromFileKey(matchedKey, workspaceId)
            uploadDevWarn('[Upload] deep-link fallback: found file globally, redirecting to folder', {
              requestedFileKey,
              matchedKey,
              matchedFolder,
            })

            // Navigate to the correct folder — the navigation effect will fetch and the
            // deep-link effect will scroll/highlight once files load
            if (matchedFolder !== currentPath) {
              setSearchParams(
                matchedFolder ? { folder: matchedFolder, file: matchedKey } : { file: matchedKey }
              )
            }
          } catch (error) {
            console.error('[Upload] deep-link fallback: global search failed', error)
          }
        })()
      }
      return
    }
    if (deepLinkLoadAttemptsRef.current >= 40) {
      uploadDevLog('[Upload] deep-link stopped', {
        requestedFileKey,
        reason: 'max-attempts',
        filesLoaded: filesHere.length,
        currentPath,
      })
      return
    }
    deepLinkLoadAttemptsRef.current += 1
    uploadDevLog('[Upload] deep-link not found yet, loading more', {
      requestedFileKey,
      attempts: deepLinkLoadAttemptsRef.current,
      filesLoaded: filesHere.length,
      hasMoreFiles,
      nextContinuationToken,
      currentPath,
    })
    void loadMoreFiles()
  }, [
    searchParams,
    filesHere,
    hasMoreFiles,
    isLoadingMoreFiles,
    loadingExplorer,
    loadMoreFiles,
  ])

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
        void fetchExplorerRef.current?.(true)
        if (showTrashRef.current) {
          void fetchTrashFilesRef.current?.()
        }
      },
      () => {
        // page stays usable even if realtime stream reconnects
      }
    )

    return unsubscribe
  }, [])

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

  return (
    <Box sx={{ height: '100%' }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <EncryptedUploadDropzone
          files={selectedFiles}
          onFilesChange={setSelectedFiles}
          uploading={uploading}
          encryptionPassword={encryptionPassword}
          onEncryptionPasswordRequest={() => { }}
          onUploadProgress={() => { }}
          onUploadComplete={scheduleExplorerRefreshAfterUpload}
          externalUploadItems={uploadItemStates}
          currentPath={currentPath}
        />

        <Box sx={{ mt: 2 }}>
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Tooltip title="عرض قائمة">
                <Button
                  variant={viewMode === 'list' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('list')}
                  disabled={uploading || loadingExplorer}
                  sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
                >
                  <ServerMinimalistic weight={'BoldDuotone'} size={24} />
                </Button>
              </Tooltip>
              <Tooltip title="عرض شبكة">
                <Button
                  variant={viewMode === 'grid' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('grid')}
                  disabled={uploading || loadingExplorer}
                  sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
                >
                  <Widget weight={'BoldDuotone'} size={24} />
                </Button>
              </Tooltip>
              <Button
                variant="outlined"
                onClick={() => setShowTrash(!showTrash)}
                disabled={uploading}
                sx={{ borderRadius: 999 }}
              >
                {showTrash ? 'الملفات' : 'سلة المهملات'}
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {/* Filter Dropdown */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="filter-label">تصفية</InputLabel>
                <Select
                  labelId="filter-label"
                  value={fileFilter}
                  onChange={e =>
                    setFileFilter(e.target.value as 'all' | 'images' | 'videos' | 'documents')
                  }
                  disabled={uploading || loadingExplorer}
                  label="تصفية"
                >
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="images">الصور</MenuItem>
                  <MenuItem value="videos">الفيديو</MenuItem>
                  <MenuItem value="documents">المستندات</MenuItem>
                </Select>
              </FormControl>

              {/* Sort Dropdown */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="sort-label">ترتيب</InputLabel>
                <Select
                  labelId="sort-label"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as 'name' | 'date' | 'size')}
                  disabled={uploading || loadingExplorer}
                  label="ترتيب"
                >
                  <MenuItem value="date">
                    {sortBy === 'date' && sortOrder === 'asc' ? 'الأحدث' : 'التاريخ'}
                  </MenuItem>
                  <MenuItem value="name">الاسم</MenuItem>
                  <MenuItem value="size">الحجم</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                onClick={() => setShowCreateFolderModal(true)}
                disabled={uploading || loadingExplorer}
                endIcon={<CreateNewFolderIcon />}
                sx={{ borderRadius: 999, gap: 1 }}
              >
                <span className="hidden md:inline">إنشاء مجلد</span>
              </Button>
            </Box>
          </Box>

          {/* Bulk Action Toolbar */}
          {selectedForBulk.size > 0 && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: 'primary.50',
                border: '1px solid',
                borderColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {selectedForBulk.size} عنصر محدد
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="outlined"
                size="small"
                onClick={clearSelection}
                sx={{ borderRadius: 999 }}
              >
                إلغاء التحديد
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SelectAllIcon />}
                onClick={selectAllFiles}
                sx={{ borderRadius: 999 }}
              >
                تحديد الكل
              </Button>
              {!showTrash && (
                <>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleBulkDownload}
                    disabled={bulkLoading}
                    sx={{ borderRadius: 999 }}
                  >
                    تنزيل ({selectedForBulk.size})
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={handleBulkDelete}
                    disabled={bulkLoading}
                    sx={{ borderRadius: 999 }}
                  >
                    حذف ({selectedForBulk.size})
                  </Button>
                </>
              )}
              {showTrash && (
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<RestoreIcon />}
                  onClick={handleBulkRestore}
                  disabled={bulkLoading}
                  sx={{ borderRadius: 999 }}
                >
                  استعادة ({selectedForBulk.size})
                </Button>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', gap: 0, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
            <FolderIcon sx={{ fontSize: 20, color: 'primary.main' }} />
            {breadcrumbs.map((c, idx) => (
              <Box key={`${c.path}_${idx}`} sx={{ display: 'flex', alignItems: 'center' }}>
                {idx > 0 && (
                  <Typography variant="body2" sx={{ opacity: 0.5 }}>
                    {'>'}
                  </Typography>
                )}
                <Button
                  size="small"
                  onClick={() => {
                    if (c.path) {
                      setSearchParams({ folder: c.path })
                    } else {
                      setSearchParams({})
                    }
                  }}
                  sx={{
                    borderRadius: 999,
                    minWidth: 'auto',
                    px: 1,
                    py: 0.5,
                    textTransform: 'none',
                    fontWeight: c.path === currentPath ? 600 : 400,
                    color: c.path === currentPath ? 'primary.main' : 'text.primary',
                    bgcolor: c.path === currentPath ? 'primary.50' : 'transparent',
                  }}
                >
                  {c.label}
                </Button>
              </Box>
            ))}
            <Box sx={{ flex: '1 1 auto' }} />
          </Box>

          {pinnedPaths.length > 0 && !showTrash && (
            <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, border: '1px dashed', borderColor: 'warning.light' }}>
              <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mb: 1, fontWeight: 600 }}>
                المجلدات المثبتة (ترتيبك الشخصي)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {pinnedPaths.map(path => {
                  const label = path.split('/').filter(Boolean).pop() || path
                  const active = path === currentPath
                  return (
                    <Button
                      key={path}
                      size="small"
                      variant={active ? 'contained' : 'outlined'}
                      color="warning"
                      startIcon={<PushPinIcon fontSize="small" />}
                      onClick={() => setSearchParams({ folder: path })}
                      sx={{ borderRadius: 999, textTransform: 'none' }}
                    >
                      {label}
                    </Button>
                  )
                })}
              </Box>
            </Box>
          )}

          {showTrash ? (
            loadingTrash && trashFiles.length === 0 ? (
              <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                <FileItemSkeleton />
                <FileItemSkeleton />
                <FileItemSkeleton />
                <FileItemSkeleton />
                <FileItemSkeleton />
              </Box>
            ) : trashFiles.length === 0 ? (
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                سلة المهملات فارغة.
              </Typography>
            ) : (
              <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                {trashFiles.map(file => (
                  <TrashFileItem
                    key={file.id}
                    file={file}
                    onRestore={handleRestore}
                    selected={selectedForBulk.has(file.originalKey)}
                    onToggleSelect={toggleFileSelection}
                  />
                ))}
              </Box>
            )
          ) : (
            <>
              {folderError ? (
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    backgroundColor: 'error.50',
                    border: '1px solid',
                    borderColor: 'error.main',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <ErrorOutlineIcon sx={{ fontSize: 32, color: 'error.main' }} />
                  <Box>
                    <Typography variant="h6" sx={{ color: 'error.main', mb: 0.5 }}>
                      خطأ في تحميل المجلد
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {folderError}
                    </Typography>
                  </Box>
                </Box>
              ) : loadingExplorer && filesHere.length === 0 ? (
                <>
                  {/* Skeleton for folders */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ opacity: 0.75, mb: 1, fontWeight: 600 }}>
                      المجلدات
                    </Typography>
                    {viewMode === 'list' ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        <FolderItemSkeleton />
                        <FolderItemSkeleton />
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',
                            sm: 'repeat(3, 1fr)',
                            md: 'repeat(4, 1fr)',
                            lg: 'repeat(5, 1fr)',
                          },
                          gap: 2,
                        }}
                      >
                        <FolderItemGridSkeleton />
                        <FolderItemGridSkeleton />
                        <FolderItemGridSkeleton />
                      </Box>
                    )}
                  </Box>
                  {/* Skeleton for files */}
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.75, mb: 1, fontWeight: 600 }}>
                      الملفات
                    </Typography>
                    {viewMode === 'list' ? (
                      <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                        <FileItemSkeleton />
                        <FileItemSkeleton />
                        <FileItemSkeleton />
                        <FileItemSkeleton />
                        <FileItemSkeleton />
                        <FileItemSkeleton />
                      </Box>
                    ) : (
                      <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                              xs: 'repeat(2, 1fr)',
                              sm: 'repeat(3, 1fr)',
                              md: 'repeat(4, 1fr)',
                              lg: 'repeat(5, 1fr)',
                            },
                            gap: 2,
                          }}
                        >
                          <FileItemGridSkeleton />
                          <FileItemGridSkeleton />
                          <FileItemGridSkeleton />
                          <FileItemGridSkeleton />
                          <FileItemGridSkeleton />
                          <FileItemGridSkeleton />
                        </Box>
                      </Box>
                    )}
                  </Box>
                </>
              ) : (
                <>
                  {sortedFoldersHere.length === 0 && filteredAndSortedFiles.length === 0 ? (
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                      لا يوجد شيء هنا (0).
                    </Typography>
                  ) : (
                    <>
                      {sortedFoldersHere.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="body2"
                            sx={{ opacity: 0.75, mb: 1, fontWeight: 600 }}
                          >
                            المجلدات ({sortedFoldersHere.length})
                          </Typography>
                          {viewMode === 'list' ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                              {sortedFoldersHere.map(p => {
                                const fullPath = folderFullPath(p, currentPath)
                                const pinnedIndex = pinnedPaths.indexOf(normalizeFolderPath(fullPath))
                                return (
                                  <FolderItem
                                    key={p}
                                    folderPath={fullPath}
                                    onClick={() => {
                                      setSearchParams({ folder: fullPath })
                                    }}
                                    onDelete={requestDeleteFolder}
                                    onDownload={handleDownloadFolder}
                                    canDelete={isWorkspaceAdmin}
                                    isDeleting={deletingFolders.has(fullPath)}
                                    isDownloading={downloadingFolders.has(fullPath)}
                                    isPinned={isPinned(fullPath)}
                                    onTogglePin={togglePin}
                                    onMovePinUp={path => movePin(path, 'up')}
                                    onMovePinDown={path => movePin(path, 'down')}
                                    canMovePinUp={pinnedIndex > 0}
                                    canMovePinDown={
                                      pinnedIndex >= 0 && pinnedIndex < pinnedPaths.length - 1
                                    }
                                  />
                                )
                              })}
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                  xs: 'repeat(2, 1fr)',
                                  sm: 'repeat(3, 1fr)',
                                  md: 'repeat(4, 1fr)',
                                  lg: 'repeat(5, 1fr)',
                                },
                                gap: 2,
                              }}
                            >
                              {sortedFoldersHere.map(p => {
                                const fullPath = folderFullPath(p, currentPath)
                                return (
                                  <FolderItemGrid
                                    key={p}
                                    folderPath={fullPath}
                                    onClick={() => {
                                      setSearchParams({ folder: fullPath })
                                    }}
                                    onDelete={requestDeleteFolder}
                                    onDownload={handleDownloadFolder}
                                    canDelete={isWorkspaceAdmin}
                                    isDeleting={deletingFolders.has(fullPath)}
                                    isDownloading={downloadingFolders.has(fullPath)}
                                    isPinned={isPinned(fullPath)}
                                    onTogglePin={togglePin}
                                  />
                                )
                              })}
                            </Box>
                          )}
                        </Box>
                      )}

                      {filteredAndSortedFiles.length > 0 && (
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{ opacity: 0.75, mb: 1, fontWeight: 600 }}
                          >
                            الملفات (
                            {totalFileCount !== null
                              ? totalFileCount
                              : filteredAndSortedFiles.length}
                            )
                          </Typography>
                          {viewMode === 'list' ? (
                            <Box
                              ref={scrollContainerRef}
                              sx={{ maxHeight: 500, overflow: 'auto' }}
                              onScroll={handleScroll}
                            >
                              {filteredAndSortedFiles.map(obj => {
                                const url = keyToPublicUrl(obj.key)
                                const thumbnailUrl = obj.thumbnailKey
                                  ? keyToPublicUrl(obj.thumbnailKey)
                                  : ''
                                return (
                                  <FileItem
                                    key={obj.key}
                                    obj={obj}
                                    url={url}
                                    thumbnailUrl={thumbnailUrl}
                                    onDelete={handleDelete}
                                    onPreview={handlePreview}
                                    onDownload={handleDownloadFile}
                                    onPrivacyToggle={openPrivacyModal}
                                    filePrivacySettings={filePrivacySettings}
                                    canAccessFile={canAccessFile}
                                    isDeleting={deletingFiles.has(obj.key)}
                                    selected={selectedForBulk.has(obj.key)}
                                    highlighted={highlightedFileKey === obj.key}
                                    onToggleSelect={toggleFileSelection}
                                  />
                                )
                              })}
                              {/* Infinite Scroll Loading Indicator */}
                              {isLoadingMoreFiles && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                  <CircularProgress size={24} />
                                  <Typography variant="body2" sx={{ ml: 2, opacity: 0.7 }}>
                                    جاري تحميل المزيد من الملفات...
                                  </Typography>
                                </Box>
                              )}
                              {!hasMoreFiles && filteredAndSortedFiles.length > 0 && (
                                <Typography
                                  variant="body2"
                                  sx={{ textAlign: 'center', opacity: 0.5, p: 2 }}
                                >
                                  تم تحميل جميع الملفات
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Box
                              ref={scrollContainerRef}
                              sx={{ maxHeight: 500, overflow: 'auto' }}
                              onScroll={handleScroll}
                            >
                              <Box
                                sx={{
                                  display: 'grid',
                                  gridTemplateColumns: {
                                    xs: 'repeat(2, 1fr)',
                                    sm: 'repeat(3, 1fr)',
                                    md: 'repeat(4, 1fr)',
                                    lg: 'repeat(5, 1fr)',
                                  },
                                  gap: 2,
                                }}
                              >
                                {filteredAndSortedFiles.map(obj => {
                                  const url = keyToPublicUrl(obj.key)
                                  const thumbnailUrl = obj.thumbnailKey
                                    ? keyToPublicUrl(obj.thumbnailKey)
                                    : ''
                                  return (
                                    <FileItemGrid
                                      key={obj.key}
                                      obj={obj}
                                      url={url}
                                      thumbnailUrl={thumbnailUrl}
                                      onDelete={handleDelete}
                                      onPreview={handlePreview}
                                      onDownload={handleDownloadFile}
                                      onPrivacyToggle={openPrivacyModal}
                                      filePrivacySettings={filePrivacySettings}
                                      canAccessFile={canAccessFile}
                                      isDeleting={deletingFiles.has(obj.key)}
                                      selected={selectedForBulk.has(obj.key)}
                                      highlighted={highlightedFileKey === obj.key}
                                      onToggleSelect={toggleFileSelection}
                                    />
                                  )
                                })}
                              </Box>
                              {/* Infinite Scroll Loading Indicator for Grid View */}
                              {isLoadingMoreFiles && (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    p: 2,
                                    gridColumn: '1 / -1',
                                  }}
                                >
                                  <CircularProgress size={24} />
                                  <Typography variant="body2" sx={{ ml: 2, opacity: 0.7 }}>
                                    جاري تحميل المزيد من الملفات...
                                  </Typography>
                                </Box>
                              )}
                              {!hasMoreFiles && filteredAndSortedFiles.length > 0 && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    textAlign: 'center',
                                    opacity: 0.5,
                                    p: 2,
                                    gridColumn: '1 / -1',
                                  }}
                                >
                                  تم تحميل جميع الملفات
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </Box>

        {!API_ENV.r2PublicBaseUrl && (
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
            لتفعيل زر (فتح)، اضف قيمة `VITE_R2_PUBLIC_BASE_URL` في `frontend/.env.local`.
          </Typography>
        )}
      </Container>

      <FilePreviewModal
        open={previewModalOpen}
        file={previewFile}
        onClose={handleClosePreview}
        onDownload={handlePreviewDownload}
      />

      {encryptedViewerFile && (
        <EncryptedFileViewer
          open={encryptedViewerOpen}
          onClose={handleCloseEncryptedViewer}
          fileId={encryptedViewerFile.fileId}
          filename={encryptedViewerFile.filename}
          mimeType={encryptedViewerFile.mimeType}
          size={encryptedViewerFile.size}
          encryptionEnabled={encryptedViewerFile.encryptionEnabled}
          encryptionIv={encryptedViewerFile.encryptionIv}
          encryptionSalt={encryptedViewerFile.encryptionSalt}
        />
      )}

      {/* Admin folder delete confirmation */}
      <Dialog
        open={!!folderPendingDelete}
        onClose={closeFolderDeleteDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'background.default',
            backgroundImage: 'none',
          },
        }}
      >
        <DialogTitle>تأكيد حذف المجلد</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            أنت على وشك حذف المجلد{' '}
            <strong>
              {folderPendingDelete?.split('/').filter(Boolean).pop() || folderPendingDelete}
            </strong>
            . سيتم نقل جميع الملفات بداخله (بما فيها المجلدات الفرعية) إلى سلة المهملات.
            <br />
            أدخل <strong>كلمة مرور حساب المدير</strong> (نفس كلمة مرور تسجيل الدخول — وليست كلمة مرور
            تشفير الملفات).
          </Typography>
          {folderDeleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {folderDeleteError}
            </Alert>
          )}
          <PasswordInput
            value={folderDeletePassword}
            onChange={setFolderDeletePassword}
            showPassword={folderDeletePasswordVisible}
            onToggleVisibility={() => setFolderDeletePasswordVisible(v => !v)}
            label="كلمة مرور تسجيل الدخول"
            autoComplete="current-password"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFolderDeleteDialog} disabled={folderDeleteSubmitting}>
            إلغاء
          </Button>
          <Button
            onClick={() => void confirmDeleteFolder()}
            variant="contained"
            color="error"
            disabled={folderDeleteSubmitting || !folderDeletePassword.trim()}
          >
            {folderDeleteSubmitting ? 'جاري الحذف...' : 'تأكيد الحذف'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Folder Modal */}
      <Dialog
        open={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'background.default',
            backgroundImage: 'none',
          },
        }}
      >
        <DialogTitle>إنشاء مجلد جديد</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="اسم المجلد"
            fullWidth
            variant="outlined"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            disabled={creatingFolder}
            error={!!folderNameError}
            helperText={
              folderNameError || 'أدخل اسمًا فريدًا للمجلد (الأحرف المسموحة: أ-ب، 0-9، _، -)'
            }
            inputProps={{
              maxLength: 255,
              style: { direction: 'ltr' },
            }}
            sx={{
              '& .MuiInputBase-input': {
                direction: 'ltr !important',
                textAlign: 'left !important',
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateFolderModal(false)} disabled={creatingFolder}>
            إلغاء
          </Button>
          <Button
            onClick={handleCreateFolder}
            disabled={creatingFolder || !newFolderName.trim()}
            variant="contained"
          >
            {creatingFolder ? 'جارٍ الإنشاء...' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Privacy Settings Modal */}
      <Dialog
        open={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'background.default',
            backgroundImage: 'none',
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon />
            <Typography>إعدادات الخصوصية: {selectedFileForPrivacy?.filename}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
            اختر أعضاء الفريق المسموح لهم الوصول إلى هذا الملف. إذا لم يتم تحديد أي عضو، سيكون الملف
            متاحًا للجميع.
          </Typography>

          {loadingTeamMembers ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                جارٍ تحميل أعضاء الفريق...
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {teamMembers.map(member => (
                <ListItem key={member.id}>
                  <ListItemIcon>
                    <Checkbox
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => toggleMemberSelection(member.id)}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={member.user?.name || member.name || member.email}
                    secondary={member.email}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPrivacyModal(false)}>إلغاء</Button>
          <Button onClick={savePrivacySettings} variant="contained">
            حفظ الإعدادات
          </Button>
        </DialogActions>
      </Dialog>

      <FolderZipDialog
        folderZipProgress={folderZipProgress}
        folderZipDisplayElapsed={folderZipDisplayElapsed}
        onCancel={cancelFolderZipDownload}
      />

      {showToast && <Toast message={toastMessage} type={toastType} onClose={closeToast} />}

      {/* Download Progress Dialog — rendered from global DownloadContext */}
      <DownloadProgressDialog />
    </Box>
  )
}
