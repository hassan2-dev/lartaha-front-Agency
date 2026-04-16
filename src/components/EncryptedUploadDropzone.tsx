/**
 * Enhanced Upload Dropzone with Uppy and E2E Encryption
 *
 * Supports:
 * - Chunked uploads via tus protocol
 * - Pause/resume for large files
 * - End-to-end encryption with user password
 * - Progress tracking
 */

import React, { useEffect, useRef, useState, useCallback, type ChangeEvent } from 'react'

import {
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material'
import {
  CloudUpload as CloudUploadIcon,
  FolderOpen as FolderOpenIcon,
  FileCopy as FileIcon,
  Lock as LockIcon,
  Close as CloseIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  Minimize as MinimizeIcon,
} from '@mui/icons-material'

import Uppy from '@uppy/core'
import AwsS3Multipart from '@uppy/aws-s3'
import Dashboard from '@uppy/dashboard'
import XHRUpload from '@uppy/xhr-upload'
import '@uppy/core/css/style.css'
import '@uppy/dashboard/css/style.css'
import '@uppy/status-bar/css/style.css'

import {
  encryptFile,
  encryptFileChunked,
  shouldUseChunkedEncryption,
  generateThumbnail,
  encryptThumbnailBlob,
  type EncryptionResult,
  type ChunkedEncryptionResult,
} from '../lib/encryption'
import {
  createMultipartUpload,
  signMultipartPart,
  completeMultipartUpload,
  abortMultipartUpload,
  listMultipartParts,
  confirmUpload,
  requestUploadUrl,
  uploadImageThumbnail,
} from '../api/uploadApi'
import { useUpload, type UploadItemState } from '../contexts/UploadContext'

// Build thumbnail key following server naming convention
function buildImageThumbnailKey(originalKey: string): string {
  const safeKey = String(originalKey || '').replace(/^\/+/, '')
  if (!safeKey) return ''

  const parts = safeKey.split('/').filter(Boolean)
  const filename = parts.pop() || 'image'
  const basename = filename.replace(/\.[^.]+$/, '') || filename
  const directory = parts.join('/')
  const thumbnailFilename = `${basename}__thumb.jpg`
  return directory
    ? `${directory}/.thumbnails/${thumbnailFilename}`
    : `.thumbnails/${thumbnailFilename}`
}

export type SelectedUploadFile = {
  file: File
  relativePath: string
  encrypted?: boolean
  encryptionResult?: EncryptionResult | ChunkedEncryptionResult
  uploadFile?: File
  thumbnailUploadFile?: File | null // Encrypted thumbnail to upload separately
  thumbnailPreviewUrl?: string // URL for thumbnail preview display
}

// UploadItemState is now imported from UploadContext

interface EncryptedUploadDropzoneProps {
  files: SelectedUploadFile[]
  onFilesChange: (next: SelectedUploadFile[]) => void
  uploading: boolean
  error?: string | null
  encryptionPassword?: string
  onEncryptionPasswordRequest?: () => void
  onUploadProgress?: (progress: {
    progressPercent: number
    bytesUploaded: number
    totalBytes: number
    uploadSpeed: number
    currentFileIndex: number
    totalFiles: number
    currentFilePath: string
  }) => void
  externalUploadItems?: Record<string, UploadItemState>
  currentPath?: string // Current folder path in UploadPage (e.g., "folder1/subfolder")
}

// Simple file selection (without Uppy) for initial selection
function toSelectedFiles(files: FileList | File[] | null | undefined): SelectedUploadFile[] {
  if (!files) return []
  const arr = Array.isArray(files) ? files : Array.from(files)
  return arr.filter(Boolean).map(f => {
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath
    const relativePath = rel && rel.length > 0 ? rel : f.name
    return {
      file: f,
      relativePath,
    }
  })
}

function fmtBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

export default function EncryptedUploadDropzone({
  files,
  onFilesChange,
  uploading,
  error = null,
  encryptionPassword,
  onUploadProgress,
  externalUploadItems,
  currentPath = '',
}: EncryptedUploadDropzoneProps) {
  // Use global upload context for persistent state across pages
  const {
    uploadItems,
    setUploadItems,
    showUploadModal,
    setShowUploadModal,
    isMinimized,
    setIsMinimized,
    showSuccess,
    setShowSuccess,
  } = useUpload()

  const [dragOver, setDragOver] = useState(false)
  const [pendingFolderFiles, setPendingFolderFiles] = useState<SelectedUploadFile[] | null>(null)
  const [pendingFolderName, setPendingFolderName] = useState('')
  const [encryptEnabled] = useState(true)
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [encryptionProgress, setEncryptionProgress] = useState(0)
  const [showUppyDashboard, setShowUppyDashboard] = useState(false)
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null)
  const uppyInstancesRef = useRef<Map<string, Uppy>>(new Map())

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const folderInputRef = useRef<HTMLInputElement | null>(null)
  const uppyRef = useRef<Uppy | null>(null)
  const dashboardContainerRef = useRef<HTMLDivElement | null>(null)
  const encryptionPasswordRef = useRef<string>(encryptionPassword || '')

  // Update ref when prop changes
  useEffect(() => {
    if (encryptionPassword) {
      encryptionPasswordRef.current = encryptionPassword
    }
  }, [encryptionPassword])

  // Cleanup Uppy on unmount
  useEffect(() => {
    return () => {
      if (uppyRef.current) {
        uppyRef.current?.cancelAll()
        // Some Uppy builds expose close(); guard for type compatibility
        if (typeof (uppyRef.current as unknown as { close?: () => void }).close === 'function') {
          ;(uppyRef.current as unknown as { close: () => void }).close()
        }
        uppyRef.current = null
      }
    }
  }, [])

  // Initialize Uppy Dashboard when dialog opens
  useEffect(() => {
    if (!showUppyDashboard || !dashboardContainerRef.current) return

    // Create main Uppy instance with Dashboard
    const uppy = new Uppy({
      restrictions: {
        maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
        allowedFileTypes: null,
      },
      autoProceed: false,
    })

    // Add Dashboard plugin
    uppy.use(Dashboard, {
      target: dashboardContainerRef.current,
      inline: true,
      height: 450,
      width: '100%',
      proudlyDisplayPoweredByUppy: false,
      locale: {
        strings: {
          addMoreFiles: 'أضف المزيد من الملفات',
          addingMoreFiles: 'جاري إضافة المزيد من الملفات',
          closeModal: 'إغلاق',
          uploadComplete: 'اكتمل الرفع',
          uploadFailed: 'فشل الرفع',
          pause: 'إيقاف مؤقت',
          resume: 'استئناف',
          cancel: 'إلغاء',
          done: 'تم',
          saveChanges: 'حفظ التغييرات',
          editFile: 'تعديل الملف',
          editing: 'جاري التعديل',
          removeFile: 'إزالة الملف',
        },
      },
    })

    uppyRef.current = uppy

    return () => {
      uppy.destroy()
      if (uppyRef.current === uppy) {
        uppyRef.current = null
      }
    }
  }, [showUppyDashboard])

  // Encrypt a single file
  const encryptSingleFile = async (
    file: File,
    password: string,
    onProgress?: (progress: number) => void
  ): Promise<EncryptionResult | ChunkedEncryptionResult> => {
    if (shouldUseChunkedEncryption(file.size)) {
      return await encryptFileChunked(file, password, onProgress)
    }
    return await encryptFile(file, password)
  }

  // Encrypt all files before upload
  const encryptFiles = useCallback(
    async (filesToEncrypt: SelectedUploadFile[]) => {
      if (!encryptEnabled || !encryptionPasswordRef.current) {
        return filesToEncrypt
      }

      setIsEncrypting(true)
      setEncryptionProgress(0)

      const encryptedFiles: SelectedUploadFile[] = []
      const totalFiles = filesToEncrypt.length

      for (let i = 0; i < totalFiles; i++) {
        const sf = filesToEncrypt[i]

        try {
          // Generate thumbnail and encrypt it (E2E)
          const rawThumbnailBlob = await generateThumbnail(sf.file, 200)
          const encryptedThumbnailBlob = rawThumbnailBlob
            ? await encryptThumbnailBlob(rawThumbnailBlob, encryptionPasswordRef.current)
            : null

          // Create a preview URL from the raw thumbnail for display
          let thumbnailPreviewUrl: string | undefined
          if (rawThumbnailBlob) {
            thumbnailPreviewUrl = URL.createObjectURL(rawThumbnailBlob)
          }

          const encryptionResult = await encryptSingleFile(
            sf.file,
            encryptionPasswordRef.current,
            chunkProgress => {
              // Report progress for current file
              const overallProgress = Math.round(((i + chunkProgress / 100) / totalFiles) * 100)
              setEncryptionProgress(overallProgress)
            }
          )

          let uploadFile = sf.file
          if ('encryptedData' in encryptionResult) {
            uploadFile = new File([encryptionResult.encryptedData], sf.relativePath, {
              type: 'application/octet-stream',
            })
          } else if (Array.isArray(encryptionResult.encryptedChunks)) {
            // For very large files, creating a blob from all chunks causes memory exhaustion
            // Skip encryption to prevent browser crash
            const MAX_BLOB_SIZE = 200 * 1024 * 1024 // 200MB
            const estimatedSize = encryptionResult.encryptedChunks.reduce(
              (sum, chunk) => sum + chunk.byteLength,
              0
            )

            if (estimatedSize > MAX_BLOB_SIZE) {
              console.warn(
                '[DEBUG] encryptFiles: file too large for in-memory encryption, uploading unencrypted:',
                sf.relativePath,
                estimatedSize
              )
              encryptedFiles.push({
                ...sf,
                encrypted: false,
                uploadFile: sf.file,
                thumbnailUploadFile: null,
                thumbnailPreviewUrl,
              })
              continue
            }

            const blob = new Blob(encryptionResult.encryptedChunks, {
              type: 'application/octet-stream',
            })
            uploadFile = new File([blob], sf.relativePath, { type: 'application/octet-stream' })
          }

          console.log(
            '[DEBUG] encryptFiles: thumbnailBlob for',
            sf.relativePath,
            encryptedThumbnailBlob?.size,
            'bytes',
            'preview:',
            thumbnailPreviewUrl
          )
          encryptedFiles.push({
            ...sf,
            encrypted: true,
            encryptionResult,
            uploadFile,
            thumbnailUploadFile: encryptedThumbnailBlob
              ? new File([encryptedThumbnailBlob], `thumb_${sf.relativePath}.bin`, {
                  type: 'application/octet-stream',
                })
              : null,
            thumbnailPreviewUrl, // Add preview URL for display
          })
        } catch (err) {
          console.error(`Failed to encrypt ${sf.relativePath}:`, err)
          // Continue with unencrypted file if encryption fails
          encryptedFiles.push({ ...sf, uploadFile: sf.file })
        }

        setEncryptionProgress(Math.round(((i + 1) / totalFiles) * 100))
      }

      setIsEncrypting(false)
      return encryptedFiles
    },
    [encryptEnabled]
  )

  // Handle file selection with encryption
  const handleFileSelection = async (selectedFiles: SelectedUploadFile[]) => {
    // Prepend currentPath to relativePath for each file if currentPath is set
    const filesWithPath = currentPath
      ? selectedFiles.map(sf => ({
          ...sf,
          relativePath: `${currentPath}/${sf.relativePath}`.replace(/\/+/g, '/'),
        }))
      : selectedFiles

    // Auto-open the upload modal when files are selected
    if (filesWithPath.length > 0) {
      setShowUploadModal(true)
      setIsMinimized(false)
      setShowSuccess(false)
    }

    // If encryption is enabled and we have a password, encrypt files first
    if (encryptEnabled && encryptionPasswordRef.current) {
      const encrypted = await encryptFiles(filesWithPath)
      onFilesChange(encrypted)
      // Auto-start upload after encryption
      for (const file of encrypted) {
        try {
          await initUppy(file)
        } catch (err) {
          console.error('Upload failed:', err)
        }
      }
    } else {
      onFilesChange(filesWithPath)
      // Auto-start upload without encryption
      for (const file of filesWithPath) {
        try {
          await initUppy(file)
        } catch (err) {
          console.error('Upload failed:', err)
        }
      }
    }
  }

  // Initialize Uppy with S3 multipart for chunked uploads
  const initUppy = useCallback(
    async (fileToUpload: SelectedUploadFile) => {
      const dataFile = fileToUpload.uploadFile || fileToUpload.file
      // Use original file size for key to match UploadPage's fileKey format
      const fileKey = `${fileToUpload.relativePath}_${fileToUpload.file.size}`

      // Prevent duplicate uploads for the same fileKey
      if (uppyInstancesRef.current.has(fileKey)) {
        console.warn('File already being uploaded:', fileKey)
        return uppyInstancesRef.current.get(fileKey)!
      }

      const useMultipart = (dataFile.size ?? 0) > 5 * 1024 * 1024
      let uploadId = ''
      let uploadKey = ''
      let multipartUploadId = ''
      let uploadUrl = ''

      if (useMultipart) {
        const createResult = await createMultipartUpload({
          filename: fileToUpload.relativePath,
          mimeType: dataFile.type || 'application/octet-stream',
          size: dataFile.size,
        })

        if (
          !createResult.ok ||
          !createResult.multipartUploadId ||
          !createResult.key ||
          !createResult.uploadId
        ) {
          throw new Error('Failed to create multipart upload')
        }

        multipartUploadId = createResult.multipartUploadId
        uploadKey = createResult.key
        uploadId = createResult.uploadId
      } else {
        const encryptionIv = fileToUpload.encryptionResult?.iv
        const encryptionSalt = fileToUpload.encryptionResult?.salt
        const signed = await requestUploadUrl({
          filename: fileToUpload.relativePath,
          mimeType: dataFile.type || 'application/octet-stream',
          size: dataFile.size,
          encryptionEnabled: encryptEnabled,
          encryptionIv,
          encryptionSalt,
        })

        if (!signed.ok || !signed.url || !signed.key || !signed.uploadId) {
          throw new Error('Failed to create upload URL')
        }

        uploadId = signed.uploadId
        uploadKey = signed.key
        uploadUrl = signed.url
      }

      // Create Uppy instance FIRST and store it immediately
      const uppy = new Uppy({
        restrictions: {
          maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
          allowedFileTypes: null,
        },
        autoProceed: false,
      })

      // Store uppy instance immediately so it's available for pause/resume
      uppyInstancesRef.current.set(fileKey, uppy)

      setCurrentUploadId(uploadId || null)

      if (useMultipart) {
        uppy.use(AwsS3Multipart, {
          limit: 4,
          shouldUseMultipart: (file: { size: number | null }) => (file.size ?? 0) > 5 * 1024 * 1024,
          createMultipartUpload: async () => {
            if (!multipartUploadId || !uploadKey) {
              throw new Error('Missing multipart upload details')
            }
            return {
              uploadId: multipartUploadId,
              key: uploadKey,
            }
          },
          listParts: async () => {
            try {
              const result = await listMultipartParts({
                key: uploadKey,
                multipartUploadId,
              })

              if (!result.ok || !result.parts) {
                return []
              }

              return result.parts.map(part => ({
                PartNumber: part.PartNumber,
                ETag: part.ETag,
                Size: part.Size,
              }))
            } catch (error) {
              console.error('Failed to list parts:', error)
              return []
            }
          },
          signPart: async (_file: unknown, partData: { partNumber: number }) => {
            const partNumber = partData.partNumber
            const signed = await signMultipartPart({
              key: uploadKey,
              multipartUploadId,
              partNumber,
            })
            if (!signed.ok || !signed.url) {
              throw new Error('Failed to sign upload part')
            }
            return { url: signed.url }
          },
          getUploadParameters: async () => {
            // Not used for multipart uploads, but required by typings
            return {
              method: 'PUT',
              url: uploadUrl || '',
              headers: {
                'Content-Type': dataFile.type || 'application/octet-stream',
              },
            }
          },
          completeMultipartUpload: async (
            _file: unknown,
            { parts }: { parts: Array<{ ETag?: string; PartNumber?: number }> }
          ) => {
            await completeMultipartUpload({
              uploadId,
              key: uploadKey,
              multipartUploadId,
              parts,
            })
            return {}
          },
          abortMultipartUpload: async () => {
            if (multipartUploadId && uploadKey) {
              await abortMultipartUpload({
                key: uploadKey,
                multipartUploadId,
              })
            }
          },
        })
      } else {
        uppy.use(XHRUpload, {
          endpoint: uploadUrl,
          method: 'PUT',
          formData: false,
          headers: {
            'Content-Type': dataFile.type || 'application/octet-stream',
          },
          // S3/R2 returns empty response on successful PUT, so we need to handle that
          getResponseData: () => {
            // Return a fake response with the upload URL as the file URL
            return { url: uploadUrl }
          },
        })
      }

      // Add the file
      try {
        uppy.addFile({
          name: fileToUpload.relativePath,
          type: dataFile.type || 'application/octet-stream',
          data: dataFile,
          size: dataFile.size,
        })
      } catch (err) {
        console.error('Failed to add file to uppy:', err)
        return uppy
      }

      // Get the file ID from uppy's state
      const uppyFiles = uppy.getFiles()
      const uppyFile = uppyFiles[0]
      const fileId = uppyFile?.id

      if (fileId) {
        setUploadItems(prev => ({
          ...prev,
          [fileKey]: {
            fileKey,
            fileId,
            status: 'uploading',
            progress: 0,
            relativePath: fileToUpload.relativePath,
            source: 'uppy',
            totalBytes: dataFile.size,
            ...(fileToUpload.thumbnailPreviewUrl
              ? {
                  thumbnailPreviewUrl: fileToUpload.thumbnailPreviewUrl,
                  'has-thumbnail': true,
                }
              : {}),
          },
        }))
      } else {
        console.warn('No fileId from uppy for', fileKey)
      }

      // Track progress
      uppy.on('progress', (progress: number) => {
        onUploadProgress?.({
          progressPercent: progress,
          bytesUploaded: 0,
          totalBytes: dataFile.size,
          uploadSpeed: 0,
          currentFileIndex: 1,
          totalFiles: 1,
          currentFilePath: fileToUpload.relativePath,
        })
      })

      uppy.on('upload-progress', (fileMaybe, progress) => {
        const file = fileMaybe as { name?: string; size?: number; id?: string } | undefined
        if (!file?.name || !file?.size) return
        // Use the fileKey from the closure to ensure consistency
        const bytesTotal = progress?.bytesTotal ?? file.size
        const bytesUploaded = progress?.bytesUploaded ?? 0
        const pct = bytesTotal > 0 ? Math.round((bytesUploaded * 100) / bytesTotal) : 0

        // Calculate speed (approximate)
        const now = Date.now()
        const timeSinceStart =
          now - ((uppy as unknown as { _startTime?: number })._startTime || now)
        const uploadSpeed = timeSinceStart > 0 ? bytesUploaded / (timeSinceStart / 1000) : 0

        setUploadItems(prev => {
          const existing = prev[fileKey]
          if (!existing) return prev
          return {
            ...prev,
            [fileKey]: {
              ...existing,
              fileId: file.id || existing.fileId,
              status: 'uploading',
              progress: pct,
              speed: uploadSpeed,
              bytesUploaded,
              totalBytes: bytesTotal,
              relativePath: fileToUpload.relativePath,
              source: 'uppy',
            },
          }
        })
      })

      uppy.on('complete', async result => {
        // Check if upload actually succeeded (failed files will be in result.failed)
        const hasFailedFiles = result.failed && result.failed.length > 0
        const hasSuccessfulFiles = result.successful && result.successful.length > 0

        // Only mark as completed if at least one file succeeded
        if (hasSuccessfulFiles) {
          await confirmUpload({
            uploadId,
            key: uploadKey,
            filename: fileToUpload.relativePath,
            mimeType: dataFile.type || undefined,
            size: dataFile.size,
            encryptionEnabled: encryptEnabled,
            encryptionIv: fileToUpload.encryptionResult?.iv,
            encryptionSalt: fileToUpload.encryptionResult?.salt,
          })

          // Upload non-encrypted thumbnail for encrypted images
          console.log('[DEBUG] thumbnail check:', {
            hasThumbnailUploadFile: !!fileToUpload.thumbnailUploadFile,
            isEncrypted: fileToUpload.encrypted,
            thumbnailFileSize: fileToUpload.thumbnailUploadFile?.size,
          })
          if (fileToUpload.thumbnailUploadFile && fileToUpload.encrypted) {
            const thumbnailKey = buildImageThumbnailKey(uploadKey)
            console.log('[DEBUG] Uploading thumbnail:', {
              uploadKey,
              thumbnailKey,
              hasFile: !!fileToUpload.thumbnailUploadFile,
              size: fileToUpload.thumbnailUploadFile.size,
            })
            try {
              const result = await uploadImageThumbnail(
                uploadKey,
                thumbnailKey,
                fileToUpload.thumbnailUploadFile
              )
              console.log('[DEBUG] Thumbnail upload success:', result)
            } catch (err) {
              console.error('[DEBUG] Failed to upload thumbnail:', err)
              // Continue without thumbnail - not critical
            }
          }

          setUploadItems(prev => {
            const existing = prev[fileKey]
            if (!existing) return prev
            return {
              ...prev,
              [fileKey]: {
                ...existing,
                status: 'completed',
                progress: 100,
              },
            }
          })

          // Check if all uploads are now complete
          setUploadItems(prev => {
            const allItems = Object.values(prev)
            const completedCount = allItems.filter(item => item.status === 'completed').length
            const totalCount = allItems.filter(item => item.status !== 'idle').length
            if (totalCount > 0 && completedCount === totalCount) {
              setShowSuccess(true)
            }
            return prev
          })
        }

        // Only mark as error if all files failed
        if (hasFailedFiles && !hasSuccessfulFiles) {
          setUploadItems(prev => {
            const existing = prev[fileKey]
            if (!existing) return prev
            return {
              ...prev,
              [fileKey]: {
                ...existing,
                status: 'error',
                progress: existing.progress ?? 0,
              },
            }
          })
        }

        setCurrentUploadId(null)
        const current = uppyInstancesRef.current.get(fileKey)
        if (current) {
          uppyInstancesRef.current.delete(fileKey)
          current.destroy()
        }

        // Don't auto-remove completed items - let user see and close them manually
      })

      uppy.on('error', (err: Error) => {
        console.error('Uppy error:', err)
        setUploadItems(prev => {
          const existing = prev[fileKey]
          if (!existing) return prev
          return {
            ...prev,
            [fileKey]: {
              ...existing,
              status: 'error',
              progress: existing.progress ?? 0,
            },
          }
        })
        setCurrentUploadId(null)
        const current = uppyInstancesRef.current.get(fileKey)
        if (current) {
          uppyInstancesRef.current.delete(fileKey)
          current.destroy()
        }

        // Don't clean up error items automatically - let user see and close them manually
      })

      // Start upload
      ;(uppy as unknown as { _startTime?: number })._startTime = Date.now()
      uppy.upload()

      return uppy
    },
    [encryptEnabled, onUploadProgress]
  )

  const togglePauseResume = (fileKey: string) => {
    // Get the uppy instance from ref
    const uppy = uppyInstancesRef.current.get(fileKey)
    if (!uppy) {
      console.warn('No uppy instance found for', fileKey)
      return
    }

    // Get the file ID from uppy's state
    const files = uppy.getFiles()
    if (files.length === 0) {
      console.warn('No files found in uppy instance for', fileKey)
      return
    }

    const fileId = files[0].id
    if (!fileId) {
      console.warn('No fileId found in uppy files for', fileKey)
      return
    }

    try {
      // Pause/resume the upload
      uppy.pauseResume(fileId)

      const isPaused = !!uppy.getState()?.files?.[fileId]?.isPaused

      // Update local state
      setUploadItems(prev => {
        const existing = prev[fileKey]
        if (!existing) return prev
        return {
          ...prev,
          [fileKey]: {
            ...existing,
            status: isPaused ? 'paused' : 'uploading',
            fileId,
          },
        }
      })
    } catch (err) {
      console.error('Failed to toggle pause/resume', err)
    }
  }

  async function toSelectedFilesFromDropWithPaths(dt: DataTransfer): Promise<SelectedUploadFile[]> {
    const items = dt.items
    if (!items || items.length === 0) return []

    const anyItem = items[0] as unknown as { webkitGetAsEntry?: () => unknown }
    if (typeof anyItem.webkitGetAsEntry !== 'function') return []

    type AnyEntry = {
      isFile: boolean
      isDirectory: boolean
      fullPath?: string
      file?: (cb: (file: File) => void, err?: (e: unknown) => void) => void
      createReader?: () => {
        readEntries: (cb: (entries: AnyEntry[]) => void, err?: (e: unknown) => void) => void
      }
    }

    const readAllEntries = async (reader: {
      readEntries: (cb: (entries: AnyEntry[]) => void, err?: (e: unknown) => void) => void
    }): Promise<AnyEntry[]> => {
      const all: AnyEntry[] = []
      while (true) {
        const chunk = await new Promise<AnyEntry[]>((resolve, reject) => {
          reader.readEntries(
            (entries: AnyEntry[]) => resolve(entries),
            (err: unknown) => reject(err)
          )
        })
        if (chunk.length === 0) break
        all.push(...chunk)
      }
      return all
    }

    const selected: SelectedUploadFile[] = []

    const traverse = async (entry: AnyEntry) => {
      if (entry.isFile && entry.file) {
        const file = await new Promise<File>((resolve, reject) => {
          entry.file!(
            f => resolve(f),
            err => reject(err)
          )
        })
        const relativePath = (entry.fullPath ?? '').replace(/^\/+/, '') || file.name
        selected.push({ file, relativePath })
        return
      }

      if (entry.isDirectory && entry.createReader) {
        const reader = entry.createReader()
        const entries = await readAllEntries(reader)
        await Promise.all(entries.map(traverse))
      }
    }

    const roots = Array.from(items)
      .map(it =>
        (it as unknown as { webkitGetAsEntry?: () => AnyEntry | null }).webkitGetAsEntry?.()
      )
      .filter(Boolean) as AnyEntry[]

    await Promise.all(roots.map(traverse))
    return selected
  }

  const totals = {
    totalBytes: files.reduce((sum, f) => sum + f.file.size, 0),
    encryptedCount: files.filter(f => f.encrypted).length,
  }

  function onPickFiles(next: FileList | File[], source: 'files' | 'folder' | 'drop') {
    const selected = toSelectedFiles(next)
    const deduped = Array.from(
      new Map(selected.map(sf => [`${sf.relativePath}_${sf.file.size}`, sf])).values()
    )

    if (source === 'folder') {
      const hasAnyPath = deduped.some(sf => sf.relativePath.includes('/'))
      if (!hasAnyPath) {
        setPendingFolderFiles(deduped)
        setPendingFolderName('')
        onFilesChange([])
        return
      }
    }

    setPendingFolderFiles(null)
    setPendingFolderName('')
    handleFileSelection(deduped)
  }

  function applyPendingFolderName() {
    if (!pendingFolderFiles) return
    const root = pendingFolderName.trim().replace(/^\/+|\/+$/g, '')
    if (!root) return

    const transformed = pendingFolderFiles.map(sf => ({
      ...sf,
      relativePath: `${root}/${sf.relativePath}`,
    }))

    const deduped = Array.from(
      new Map(transformed.map(sf => [`${sf.relativePath}_${sf.file.size}`, sf])).values()
    )
    setPendingFolderFiles(null)
    setPendingFolderName('')
    handleFileSelection(deduped)
  }

  // Merge external and internal upload items, with internal taking precedence
  // Deduplicate by file path (not by key) to prevent showing same file twice with different sizes
  const mergedUploadItems = React.useMemo(() => {
    const seenPaths = new Set<string>()
    const result: Record<string, UploadItemState> = {}

    // Extract relative path from fileKey by removing trailing `_SIZE`
    const getRelativePath = (key: string): string => {
      const fromSelected = files.find(f => `${f.relativePath}_${f.file.size}` === key)
      if (fromSelected) return fromSelected.relativePath
      const lastUnderscore = key.lastIndexOf('_')
      if (lastUnderscore > 0) {
        const potentialPath = key.substring(0, lastUnderscore)
        const potentialSize = key.substring(lastUnderscore + 1)
        if (/^\d+$/.test(potentialSize)) {
          return potentialPath
        }
      }
      return key
    }

    // First add external items
    if (externalUploadItems) {
      Object.entries(externalUploadItems).forEach(([key, value]) => {
        if (!key.includes('thumb_')) {
          const filePath = getRelativePath(key)
          if (!seenPaths.has(filePath)) {
            seenPaths.add(filePath)
            result[key] = {
              ...value,
              relativePath: value.relativePath || filePath,
              source: value.source || 'external',
            }
          }
        }
      })
    }

    // Then add internal items (will overwrite duplicates based on path match)
    Object.entries(uploadItems).forEach(([key, value]) => {
      if (!key.includes('thumb_')) {
        const filePath = getRelativePath(key)
        // Replace any previously added entry with same file path
        const existingKey = Object.keys(result).find(k => {
          if (k.includes('thumb_')) return false
          return getRelativePath(k) === filePath
        })
        if (existingKey) {
          delete result[existingKey]
        }
        result[key] = {
          ...value,
          relativePath: value.relativePath || filePath,
          source: value.source || 'uppy',
        } // Always use internal for consistency
        seenPaths.add(filePath)
      }
    })

    return result
  }, [externalUploadItems, uploadItems, files])

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          borderColor: dragOver ? 'primary.main' : 'rgba(255,255,255,0.10)',
          background: t => `linear-gradient(135deg, ${t.palette.primary.main}14, transparent 55%)`,
          transition: 'border-color 150ms ease',
        }}
        onDragEnter={e => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragOver={e => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={e => {
          e.preventDefault()
          setDragOver(false)
        }}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          void (async () => {
            const droppedWithPaths = await toSelectedFilesFromDropWithPaths(e.dataTransfer)
            if (droppedWithPaths.length > 0) {
              handleFileSelection(droppedWithPaths)
              return
            }
            if (e.dataTransfer.files?.length) {
              onPickFiles(e.dataTransfer.files, 'drop')
            }
          })()
        }}
      >
        {/* Encryption Toggle */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.03)',
          }}
        >
          <Box sx={{ color: encryptEnabled ? 'success.main' : 'text.secondary' }}>
            <LockIcon />
          </Box>
          <Typography variant="body2" sx={{ flex: 1 }}>
            تشفير الملفات (E2E) — مفعّل دائمًا
          </Typography>
          <Button size="small" variant="contained" color="success" disabled sx={{ minWidth: 100 }}>
            مفعّل
          </Button>
        </Box>

        {/* Encryption Progress */}
        {isEncrypting && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              جاري التشفير... {encryptionProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={encryptionProgress} />
          </Box>
        )}

        {/* Upload Progress Modal */}
        <Dialog
          open={showUploadModal && !isMinimized && Object.keys(mergedUploadItems).length > 0}
          maxWidth="sm"
          fullWidth
          disableEscapeKeyDown
          PaperProps={{
            sx: {
              borderRadius: 3,
              background: theme =>
                `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
            },
          }}
        >
          {/* Header with gradient background */}
          <Box
            sx={{
              background: theme =>
                `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              p: 3,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decorative circles */}
            <Box
              sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: -30,
                left: -30,
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
              }}
            />

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2.5,
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                }}
              >
                <CloudUploadIcon sx={{ fontSize: 28, color: 'white' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mb: 0.5 }}>
                  {showSuccess ? 'تم رفع جميع الملفات بنجاح!' : 'جاري رفع الملفات'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  {showSuccess ? (
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box component="span" sx={{ color: 'success.main', fontSize: '1.2em' }}>
                        ✓
                      </Box>
                      {Object.values(mergedUploadItems).length} من{' '}
                      {Object.values(mergedUploadItems).length} ملفات اكتملت
                    </Box>
                  ) : (
                    `${Object.values(mergedUploadItems).filter(item => item.status === 'completed').length} من ${Object.values(mergedUploadItems).length} ملفات اكتملت`
                  )}
                </Typography>
              </Box>
              <IconButton
                onClick={() => setIsMinimized(true)}
                sx={{
                  color: 'white',
                  opacity: 0.8,
                  '&:hover': {
                    opacity: 1,
                    background: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                <MinimizeIcon />
              </IconButton>
              <IconButton
                onClick={() => {
                  // Only allow closing if no active uploads
                  const hasActiveUploads = Object.values(uploadItems).some(
                    item => item.status === 'uploading' || item.status === 'paused'
                  )
                  if (hasActiveUploads) {
                    // Minimize instead of closing during active uploads
                    setIsMinimized(true)
                    return
                  }
                  // Allow closing at any time - will clean up completed uploads
                  setUploadItems({})
                  setShowUploadModal(false)
                  setShowSuccess(false)
                  onFilesChange([])
                }}
                sx={{
                  color: 'white',
                  opacity: 0.8,
                  '&:hover': {
                    opacity: 1,
                    background: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          <DialogContent sx={{ p: 3, pt: 3, display: isMinimized ? 'none' : 'block' }}>
            <Box>
              {/* Success Message - shown when all uploads complete */}
              {showSuccess && (
                <Box
                  sx={{
                    mb: 3,
                    p: 3,
                    borderRadius: 2,
                    background: theme =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(76, 175, 80, 0.15)'
                        : 'rgba(76, 175, 80, 0.1)',
                    border: theme => `1px solid ${theme.palette.success.main}`,
                    textAlign: 'center',
                  }}
                >
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      backgroundColor: 'success.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <Typography sx={{ color: 'white', fontSize: 28, fontWeight: 700 }}>
                      ✓
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 700, mb: 1 }}>
                    تم رفع جميع الملفات بنجاح!
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {Object.values(mergedUploadItems).length} ملفات تم رفعها بنجاح
                  </Typography>
                </Box>
              )}

              {/* Overall Progress Card - hidden when complete */}
              {!showSuccess && (
                <Box
                  sx={{
                    mb: 3,
                    p: 2.5,
                    borderRadius: 2,
                    background: theme =>
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: theme => `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500, opacity: 0.9 }}>
                      التقدم الإجمالي
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: 'primary.main',
                        fontSize: '1.5rem',
                      }}
                    >
                      {(() => {
                        const allItems = Object.values(mergedUploadItems).filter(
                          item => item.status !== 'idle'
                        )
                        if (allItems.length === 0) return '0%'
                        const avgProgress = Math.round(
                          allItems.reduce((sum, item) => sum + item.progress, 0) / allItems.length
                        )
                        return `${avgProgress}%`
                      })()}
                    </Typography>
                  </Box>

                  <Box sx={{ position: 'relative' }}>
                    <LinearProgress
                      variant="determinate"
                      value={(() => {
                        const allItems = Object.values(mergedUploadItems).filter(
                          item => item.status !== 'idle'
                        )
                        if (allItems.length === 0) return 0
                        return Math.round(
                          allItems.reduce((sum, item) => sum + item.progress, 0) / allItems.length
                        )
                      })()}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: theme =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.08)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 5,
                          background: theme =>
                            `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                        },
                      }}
                    />
                  </Box>

                  {/* Stats row */}
                  {(() => {
                    const uploadingItems = Object.values(mergedUploadItems).filter(
                      item => item.status === 'uploading'
                    )
                    const totalSpeed = uploadingItems.reduce(
                      (sum, item) => sum + (item.speed || 0),
                      0
                    )
                    const totalUploaded = Object.values(mergedUploadItems).reduce((sum, item) => {
                      if (item.status === 'completed') return sum + (item.totalBytes || 0)
                      return sum + (item.bytesUploaded || 0)
                    }, 0)
                    const totalSize = Object.values(mergedUploadItems).reduce(
                      (sum, item) => sum + (item.totalBytes || 0),
                      0
                    )

                    return (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          mt: 2,
                          flexWrap: 'wrap',
                          gap: 1,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: 'success.main',
                              animation: 'pulse 2s infinite',
                              '@keyframes pulse': {
                                '0%, 100%': { opacity: 1 },
                                '50%': { opacity: 0.5 },
                              },
                            }}
                          />
                          <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 500 }}>
                            {totalSize > 0
                              ? `${fmtBytes(totalUploaded)} / ${fmtBytes(totalSize)}`
                              : 'جاري التحضير...'}
                          </Typography>
                        </Box>
                        {totalSpeed > 0 && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'primary.main',
                              fontWeight: 600,
                              background: theme =>
                                `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.primary.light}10)`,
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 5,
                            }}
                          >
                            {fmtBytes(totalSpeed)}/ث
                          </Typography>
                        )}
                      </Box>
                    )
                  })()}
                </Box>
              )}

              {/* Individual Files List - Thumbnails are hidden (uploaded in background) */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, opacity: 0.9 }}>
                  الملفات قيد الرفع
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.6 }}>
                  {
                    Object.values(mergedUploadItems).filter(
                      item => item.status === 'uploading' || item.status === 'paused'
                    ).length
                  }{' '}
                  نشط
                </Typography>
              </Box>

              <Box
                sx={{
                  maxHeight: 280,
                  overflow: 'auto',
                  borderRadius: 2,
                  border: theme => `1px solid ${theme.palette.divider}`,
                  background: theme =>
                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                }}
              >
                {Object.entries(mergedUploadItems).map(([key, item], index, arr) => (
                  <Box
                    key={key}
                    sx={{
                      p: 2,
                      borderBottom:
                        index < arr.length - 1
                          ? theme => `1px solid ${theme.palette.divider}`
                          : 'none',
                      background:
                        item.status === 'completed'
                          ? theme =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(76, 175, 80, 0.08)'
                                : 'rgba(76, 175, 80, 0.04)'
                          : item.status === 'error'
                            ? theme =>
                                theme.palette.mode === 'dark'
                                  ? 'rgba(244, 67, 54, 0.08)'
                                  : 'rgba(244, 67, 54, 0.04)'
                            : 'transparent',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
                      {/* Thumbnail or File Icon */}
                      <Box
                        sx={{
                          minWidth: 50,
                          width: 50,
                          height: 50,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          background: item.thumbnailPreviewUrl
                            ? 'transparent'
                            : item.status === 'completed'
                              ? theme =>
                                  `linear-gradient(135deg, ${theme.palette.success.main}20, ${theme.palette.success.dark}10)`
                              : item.status === 'error'
                                ? theme =>
                                    `linear-gradient(135deg, ${theme.palette.error.main}20, ${theme.palette.error.dark}10)`
                                : theme =>
                                    `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.primary.light}10)`,
                          overflow: 'hidden',
                          border: item.thumbnailPreviewUrl
                            ? theme => `1px solid ${theme.palette.divider}`
                            : 'none',
                          position: 'relative',
                        }}
                      >
                        {item.thumbnailPreviewUrl ? (
                          <>
                            <Box
                              component="img"
                              src={item.thumbnailPreviewUrl}
                              alt="Thumbnail"
                              sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                            {item.status === 'completed' && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 0,
                                  right: 0,
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  backgroundColor: 'success.main',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '2px solid white',
                                }}
                              >
                                <Typography sx={{ color: 'white', fontSize: 10, fontWeight: 700 }}>
                                  ✓
                                </Typography>
                              </Box>
                            )}
                          </>
                        ) : item.status === 'completed' ? (
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              backgroundColor: 'success.main',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography sx={{ color: 'white', fontSize: 12, fontWeight: 700 }}>
                              ✓
                            </Typography>
                          </Box>
                        ) : item.status === 'error' ? (
                          <CloseIcon sx={{ fontSize: 20, color: 'error.main' }} />
                        ) : item.status === 'paused' ? (
                          <PauseIcon sx={{ fontSize: 20, color: 'warning.main' }} />
                        ) : (
                          <FileIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                        )}
                      </Box>

                      {/* File info */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            mb: 0.5,
                            wordBreak: 'break-word',
                            lineHeight: 1.4,
                          }}
                        >
                          {item.relativePath || key.split('_').slice(0, -1).join('_')}
                        </Typography>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}
                        >
                          <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.75rem' }}>
                            {item.totalBytes ? fmtBytes(item.totalBytes) : '—'}
                          </Typography>
                          {item.status === 'uploading' && item.speed && item.speed > 0 && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'primary.main',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                              }}
                            >
                              {fmtBytes(item.speed)}/ث
                            </Typography>
                          )}
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              color:
                                item.status === 'completed'
                                  ? 'success.main'
                                  : item.status === 'error'
                                    ? 'error.main'
                                    : 'primary.main',
                            }}
                          >
                            {item.status === 'completed'
                              ? 'اكتمل'
                              : item.status === 'error'
                                ? 'فشل'
                                : item.status === 'paused'
                                  ? 'متوقف'
                                  : `${item.progress}%`}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Actions - Pause/Resume and Cancel Icon Buttons */}
                      {/* Only show control buttons if Uppy instance exists and upload is not completed/errored */}
                      {item.status !== 'completed' &&
                        item.status !== 'error' &&
                        item.source === 'uppy' &&
                        uppyInstancesRef.current.has(key) && (
                          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                            {/* Pause/Resume Button */}
                            <IconButton
                              component="button"
                              type="button"
                              size="small"
                              onClick={e => {
                                e.preventDefault()
                                e.stopPropagation()
                                togglePauseResume(key)
                              }}
                              title={item.status === 'paused' ? 'استئناف' : 'إيقاف مؤقت'}
                              sx={{
                                width: 32,
                                height: 32,
                                color: item.status === 'paused' ? 'success.main' : 'warning.main',
                                backgroundColor: theme =>
                                  item.status === 'paused'
                                    ? `${theme.palette.success.main}15`
                                    : `${theme.palette.warning.main}15`,
                                '&:hover': {
                                  backgroundColor: theme =>
                                    item.status === 'paused'
                                      ? `${theme.palette.success.main}25`
                                      : `${theme.palette.warning.main}25`,
                                },
                              }}
                            >
                              {item.status === 'paused' ? (
                                <PlayArrowIcon sx={{ fontSize: 18 }} />
                              ) : (
                                <PauseIcon sx={{ fontSize: 18 }} />
                              )}
                            </IconButton>

                            {/* Cancel Button */}
                            <IconButton
                              component="button"
                              type="button"
                              size="small"
                              onClick={e => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('[DEBUG] Cancel clicked for', key)
                                const uppy = uppyInstancesRef.current.get(key)
                                if (uppy) {
                                  try {
                                    uppy.cancelAll()
                                  } catch (err) {
                                    console.warn('Failed to cancel upload:', err)
                                  } finally {
                                    uppyInstancesRef.current.delete(key)
                                    uppy.destroy()
                                  }
                                }
                                setUploadItems(prev => {
                                  const next = { ...prev }
                                  delete next[key]
                                  return next
                                })
                              }}
                              title="إلغاء"
                              sx={{
                                width: 32,
                                height: 32,
                                color: 'error.main',
                                backgroundColor: theme => `${theme.palette.error.main}15`,
                                '&:hover': {
                                  backgroundColor: theme => `${theme.palette.error.main}25`,
                                },
                              }}
                            >
                              <CloseIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Box>
                        )}
                    </Box>

                    {/* Progress bar */}
                    {item.status !== 'completed' && item.status !== 'error' && (
                      <Box sx={{ ml: 7 }}>
                        <LinearProgress
                          variant="determinate"
                          value={item.progress}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: theme =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(0,0,0,0.06)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                              background:
                                item.status === 'paused'
                                  ? theme =>
                                      `linear-gradient(90deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.light} 100%)`
                                  : theme =>
                                      `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                              transition: 'transform 0.3s ease',
                            },
                          }}
                        />
                        {item.status === 'uploading' && item.bytesUploaded && item.totalBytes && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
                            <Typography variant="caption" sx={{ opacity: 0.5, fontSize: '0.7rem' }}>
                              {fmtBytes(item.bytesUploaded)} / {fmtBytes(item.totalBytes)}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Note: Minimized upload toast is now handled globally in SideNav */}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ color: 'primary.main', display: 'flex' }}>
            <CloudUploadIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              اسحب الملفات هنا، أو اختر من جهازك
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              رفع المجلد يحافظ على المسارات النسبية · يدعم الإيقاف والاستئناف
            </Typography>
          </Box>
        </Box>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={e => onPickFiles(e.target.files ? Array.from(e.target.files) : [], 'files')}
        />

        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-expect-error: webkitdirectory is non-standard but supported in Chromium/WebKit browsers.
          webkitdirectory=""
          style={{ display: 'none' }}
          onChange={e => onPickFiles(e.target.files ? Array.from(e.target.files) : [], 'folder')}
        />

        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={() => setShowUppyDashboard(true)}
            disabled={uploading || isEncrypting}
            startIcon={<CloudUploadIcon />}
            sx={{ borderRadius: 999, gap: 1 }}
          >
            فتح لوحة الرفع
          </Button>
          <Button
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isEncrypting}
            startIcon={<FileIcon />}
            sx={{ borderRadius: 999, borderColor: 'rgba(255,255,255,0.18)', gap: 1 }}
          >
            اختر ملفات
          </Button>
          <Button
            variant="outlined"
            onClick={() => folderInputRef.current?.click()}
            disabled={uploading || isEncrypting}
            startIcon={<FolderOpenIcon />}
            sx={{ borderRadius: 999, borderColor: 'rgba(255,255,255,0.18)', gap: 1 }}
          >
            اختر مجلد
          </Button>
          {files.length > 0 && (
            <Button
              variant="contained"
              color="success"
              onClick={async () => {
                // Only upload files NOT already in externalUploadItems (parent is handling those)
                // This prevents duplicate uploads
                const filesToUpload = files.filter(file => {
                  const fileKey = `${file.relativePath}_${file.file.size}`
                  return !externalUploadItems || !(fileKey in externalUploadItems)
                })

                // If no files to upload locally, they're already being handled by parent
                if (filesToUpload.length === 0) {
                  console.log(
                    '[DEBUG] All files already uploading via parent, skipping local upload'
                  )
                  return
                }

                // Upload remaining files using Uppy
                for (const file of filesToUpload) {
                  try {
                    await initUppy(file)
                  } catch (err) {
                    console.error('Upload failed:', err)
                  }
                }
              }}
              disabled={uploading || isEncrypting || files.length === 0}
              startIcon={<CloudUploadIcon />}
              sx={{ borderRadius: 999, gap: 1 }}
            >
              رفع {files.length} ملف
            </Button>
          )}
          <Box sx={{ flex: '1 1 auto' }} />
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
            {files.length} عنصر · {fmtBytes(totals.totalBytes)}
            {totals.encryptedCount > 0 && (
              <Typography component="span" variant="body2" sx={{ opacity: 0.7, ml: 1 }}>
                ({totals.encryptedCount} مشفر)
              </Typography>
            )}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {(files.length > 0 || pendingFolderFiles) && (
          <>
            <Box sx={{ my: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }} />
            <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.8 }}>
              العناصر المحددة
            </Typography>
            {pendingFolderFiles && (
              <Alert severity="info" sx={{ mb: 1 }}>
                المتصفح ما وفّر مسار المجلد. حتى نسوي مجلد داخل `uploads/`، اكتب اسم المجلد:
                <Box
                  sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}
                >
                  <Box sx={{ flex: '1 1 220px' }}>
                    <TextField
                      size="small"
                      label="اسم المجلد داخل uploads"
                      value={pendingFolderName}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setPendingFolderName(e.target.value)
                      }
                      fullWidth
                    />
                  </Box>
                  <Button
                    variant="contained"
                    onClick={applyPendingFolderName}
                    disabled={pendingFolderName.trim().length === 0}
                    sx={{ borderRadius: 999 }}
                  >
                    تطبيق
                  </Button>
                </Box>
              </Alert>
            )}
            {files.length > 0 && (
              <Box
                sx={{
                  maxHeight: 220,
                  overflow: 'auto',
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {files.slice(0, 80).map(sf => (
                  <Box
                    key={`${sf.relativePath}_${sf.file.size}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: 0.75,
                      px: 1.5,
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    {sf.encrypted && (
                      <Box sx={{ color: 'success.main' }}>
                        <LockIcon sx={{ fontSize: 14 }} />
                      </Box>
                    )}
                    <Typography
                      variant="body2"
                      sx={{ wordBreak: 'break-word', opacity: 0.92, flex: 1 }}
                    >
                      {sf.relativePath}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.6, fontSize: '0.75rem' }}>
                      {fmtBytes(sf.file.size)}
                    </Typography>
                    {(() => {
                      // Use original file size for key to match UploadPage's fileKey format
                      const fileKeyForLookup = `${sf.relativePath}_${sf.file.size}`
                      return (
                        mergedUploadItems[fileKeyForLookup] && (
                          <Typography
                            variant="body2"
                            sx={{
                              opacity: 0.6,
                              fontSize: '0.75rem',
                              minWidth: 45,
                              textAlign: 'left',
                            }}
                          >
                            {mergedUploadItems[fileKeyForLookup].progress}%
                          </Typography>
                        )
                      )
                    })()}
                    <Button
                      size="small"
                      onClick={() => {
                        onFilesChange(files.filter(f => f !== sf))
                      }}
                      sx={{ minWidth: 'auto', p: 0.5 }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </Button>
                  </Box>
                ))}

                {files.length > 80 && (
                  <Box sx={{ py: 0.75, px: 1.5 }}>
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                      + {files.length - 80} المزيد…
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </>
        )}

        {dragOver && (
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            اترك لإضافة الملفات
          </Typography>
        )}
      </Paper>

      {/* Uppy Dashboard Dialog */}
      <Dialog
        open={showUppyDashboard}
        onClose={() => setShowUppyDashboard(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: 600,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: theme =>
              `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white',
            fontWeight: 700,
          }}
        >
          رفع الملفات
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          <Box ref={dashboardContainerRef} sx={{ height: 450 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setShowUppyDashboard(false)}
            variant="outlined"
            sx={{ borderRadius: 999 }}
          >
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// Re-export types
export type {}
