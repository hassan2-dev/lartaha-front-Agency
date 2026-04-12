/**
 * Enhanced Upload Dropzone with Uppy and E2E Encryption
 * 
 * Supports:
 * - Chunked uploads via tus protocol
 * - Pause/resume for large files
 * - End-to-end encryption with user password
 * - Progress tracking
 */

import { useEffect, useRef, useState, useCallback, type ChangeEvent } from 'react'
// Uppy will be integrated once packages are installed
// import Uppy from '@uppy/core'
// import { Tus } from '@uppy/tus'
// import '@uppy/core/dist/style.min.css'
// import '@uppy/dashboard/dist/style.min.css'
// import '@uppy/status-bar/dist/style.min.css'

import {
  Box,
  Button,
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
} from '@mui/icons-material'

import Uppy from '@uppy/core'
import AwsS3Multipart from '@uppy/aws-s3'
import '@uppy/core/css/style.min.css'
import '@uppy/dashboard/css/style.min.css'
import '@uppy/status-bar/css/style.min.css'

import {
  encryptFile,
  encryptFileChunked,
  shouldUseChunkedEncryption,
  generateThumbnail,
  type EncryptionResult,
  type ChunkedEncryptionResult,
} from '../lib/encryption'
import {
  createMultipartUpload,
  signMultipartPart,
  completeMultipartUpload,
  abortMultipartUpload,
  confirmUpload,
  uploadImageThumbnail,
} from '../api/uploadApi'

// Build thumbnail key following server naming convention
function buildImageThumbnailKey(originalKey: string): string {
  const safeKey = String(originalKey || '').replace(/^\/+/, '')
  if (!safeKey) return ''

  const parts = safeKey.split('/').filter(Boolean)
  const filename = parts.pop() || 'image'
  const basename = filename.replace(/\.[^.]+$/, '') || filename
  const directory = parts.join('/')
  const thumbnailFilename = `${basename}__thumb.jpg`
  return directory ? `${directory}/.thumbnails/${thumbnailFilename}` : `.thumbnails/${thumbnailFilename}`
}

export type SelectedUploadFile = {
  file: File
  relativePath: string
  encrypted?: boolean
  encryptionResult?: EncryptionResult | ChunkedEncryptionResult
  uploadFile?: File
  thumbnailUploadFile?: File | null // Encrypted thumbnail to upload separately
}

type UploadItemState = {
  fileKey: string
  fileId: string
  status: 'idle' | 'uploading' | 'paused' | 'completed' | 'error'
  progress: number
}

interface EncryptedUploadDropzoneProps {
  files: SelectedUploadFile[]
  onFilesChange: (next: SelectedUploadFile[]) => void
  uploading: boolean
  error?: string | null
  encryptionPassword?: string
  onEncryptionPasswordRequest?: () => void
  onUploadProgress?: (progress: number) => void
}

// Simple file selection (without Uppy) for initial selection
function toSelectedFiles(files: FileList | File[] | null | undefined): SelectedUploadFile[] {
  if (!files) return []
  const arr = Array.isArray(files) ? files : Array.from(files)
  return arr
    .filter(Boolean)
    .map((f) => {
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
}: EncryptedUploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const [pendingFolderFiles, setPendingFolderFiles] = useState<SelectedUploadFile[] | null>(null)
  const [pendingFolderName, setPendingFolderName] = useState('')
  const [encryptEnabled] = useState(true)
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [encryptionProgress, setEncryptionProgress] = useState(0)
  const [showUppyDashboard, setShowUppyDashboard] = useState(false)
  const [_currentUploadId, setCurrentUploadId] = useState<string | null>(null)
  const [uploadItems, setUploadItems] = useState<Record<string, UploadItemState>>({})
  
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const folderInputRef = useRef<HTMLInputElement | null>(null)
  const uppyRef = useRef<Uppy | null>(null)
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
          (uppyRef.current as unknown as { close: () => void }).close()
        }
        uppyRef.current = null
      }
    }
  }, [])

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
  const encryptFiles = useCallback(async (filesToEncrypt: SelectedUploadFile[]) => {
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
        // Generate thumbnail from original file - SMALL and NON-ENCRYPTED
        // This can be stored in R2 publicly and loaded via <img> without CORS
        const thumbnailBlob = await generateThumbnail(sf.file, 200)

        const encryptionResult = await encryptSingleFile(
          sf.file,
          encryptionPasswordRef.current,
          (chunkProgress) => {
            // Report progress for current file
            const overallProgress = Math.round(
              ((i + chunkProgress / 100) / totalFiles) * 100
            )
            setEncryptionProgress(overallProgress)
          }
        )

        let uploadFile = sf.file
        if ('encryptedData' in encryptionResult) {
          uploadFile = new File([encryptionResult.encryptedData], sf.relativePath, {
            type: 'application/octet-stream',
          })
        } else if (Array.isArray(encryptionResult.encryptedChunks)) {
          const blob = new Blob(encryptionResult.encryptedChunks, {
            type: 'application/octet-stream',
          })
          uploadFile = new File([blob], sf.relativePath, { type: 'application/octet-stream' })
        }

        console.log('[DEBUG] encryptFiles: thumbnailBlob for', sf.relativePath, thumbnailBlob?.size, 'bytes')
        encryptedFiles.push({
          ...sf,
          encrypted: true,
          encryptionResult,
          uploadFile,
          thumbnailUploadFile: thumbnailBlob
            ? new File([thumbnailBlob], `thumb_${sf.relativePath}.jpg`, { type: 'image/jpeg' })
            : null,
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
  }, [encryptEnabled])

  // Handle file selection with encryption
  const handleFileSelection = async (selectedFiles: SelectedUploadFile[]) => {
    // If encryption is enabled and we have a password, encrypt files first
    if (encryptEnabled && encryptionPasswordRef.current) {
      const encrypted = await encryptFiles(selectedFiles)
      onFilesChange(encrypted)
    } else {
      onFilesChange(selectedFiles)
    }
  }

  // Initialize Uppy with S3 multipart for chunked uploads
  const initUppy = useCallback(async (fileToUpload: SelectedUploadFile) => {
    const dataFile = fileToUpload.uploadFile || fileToUpload.file

    const createResult = await createMultipartUpload({
      filename: fileToUpload.relativePath,
      mimeType: dataFile.type || 'application/octet-stream',
      size: dataFile.size,
    })

    if (!createResult.ok || !createResult.multipartUploadId || !createResult.key || !createResult.uploadId) {
      throw new Error('Failed to create multipart upload')
    }

    const multipartUploadId = createResult.multipartUploadId
    const uploadKey = createResult.key
    const uploadId = createResult.uploadId

    setCurrentUploadId(createResult.uploadId || null)

    // Create Uppy instance
    const uppy = new Uppy({
      restrictions: {
        maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
        allowedFileTypes: ['*'],
      },
      autoProceed: false,
    })

    // Add S3 multipart plugin for chunked uploads
    uppy.use(AwsS3Multipart, {
      limit: 4,
      shouldUseMultipart: (file: { size: number | null }) => (file.size ?? 0) > 5 * 1024 * 1024,
      createMultipartUpload: async (_file: unknown) => {
        return {
          uploadId: multipartUploadId,
          key: uploadKey,
        }
      },
      listParts: async (_file: unknown, _opts: unknown) => {
        // Return empty array as we don't need to list parts for new uploads
        return []
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
      completeMultipartUpload: async (_file: unknown, { parts }: { parts: Array<{ ETag?: string; PartNumber?: number }> }) => {
        await completeMultipartUpload({
          uploadId,
          key: uploadKey,
          multipartUploadId,
          parts,
        })
        return {}
      },
      abortMultipartUpload: async () => {
        await abortMultipartUpload({
          key: uploadKey,
          multipartUploadId,
        })
      },
      getUploadParameters: async (_file: unknown) => {
        // Return dummy parameters for non-multipart uploads
        return { url: '' }
      },
    })

    // Add the file
    const added = uppy.addFile({
      name: fileToUpload.relativePath,
      type: dataFile.type || 'application/octet-stream',
      data: dataFile,
      size: dataFile.size,
    })

    const fileKey = `${fileToUpload.relativePath}_${fileToUpload.file.size}`
    const fileId = typeof added === 'string'
      ? added
      : (added as unknown as { id?: string })?.id
    if (fileId) {
      setUploadItems((prev) => ({
        ...prev,
        [fileKey]: {
          fileKey,
          fileId,
          status: 'uploading',
          progress: 0,
        },
      }))
    }

    // Track progress
    uppy.on('progress', (progress: number) => {
      onUploadProgress?.(progress)
    })

    uppy.on('upload-progress', (fileMaybe, progress) => {
      const file = fileMaybe as { name?: string; size?: number; id?: string } | undefined
      if (!file?.name || !file?.size) return
      const fileKey = `${file.name}_${file.size}`
      const pct = progress?.bytesTotal
        ? Math.round((progress.bytesUploaded * 100) / progress.bytesTotal)
        : 0
      setUploadItems((prev) => ({
        ...prev,
        [fileKey]: {
          fileKey,
          fileId: file.id || prev[fileKey]?.fileId || '',
          status: 'uploading',
          progress: pct,
        },
      }))
    })

    uppy.on('complete', async () => {
      await confirmUpload({
        uploadId,
        key: uploadKey,
        filename: fileToUpload.relativePath,
        mimeType: dataFile.type || undefined,
        size: dataFile.size,
        encryptionEnabled: encryptEnabled,
        encryptionIv: fileToUpload.encryptionResult
          ? 'encryptionResult' in fileToUpload.encryptionResult
            ? fileToUpload.encryptionResult.iv
            : undefined
          : undefined,
        encryptionSalt: fileToUpload.encryptionResult
          ? 'encryptionResult' in fileToUpload.encryptionResult
            ? fileToUpload.encryptionResult.salt
            : undefined
          : undefined,
      })

      // Upload non-encrypted thumbnail for encrypted images
      console.log('[DEBUG] thumbnail check:', { hasThumbnailUploadFile: !!fileToUpload.thumbnailUploadFile, isEncrypted: fileToUpload.encrypted, thumbnailFileSize: fileToUpload.thumbnailUploadFile?.size })
      if (fileToUpload.thumbnailUploadFile && fileToUpload.encrypted) {
        const thumbnailKey = buildImageThumbnailKey(uploadKey)
        console.log('[DEBUG] Uploading thumbnail:', { uploadKey, thumbnailKey, hasFile: !!fileToUpload.thumbnailUploadFile, size: fileToUpload.thumbnailUploadFile.size })
        try {
          const result = await uploadImageThumbnail(uploadKey, thumbnailKey, fileToUpload.thumbnailUploadFile)
          console.log('[DEBUG] Thumbnail upload success:', result)
        } catch (err) {
          console.error('[DEBUG] Failed to upload thumbnail:', err)
          // Continue without thumbnail - not critical
        }
      }
      
      const fileKey = `${fileToUpload.relativePath}_${fileToUpload.file.size}`
      setUploadItems((prev) => ({
        ...prev,
        [fileKey]: {
          fileKey,
          fileId: fileId || prev[fileKey]?.fileId || '',
          status: 'completed',
          progress: 100,
        },
      }))

      setCurrentUploadId(null)
    })

    uppy.on('error', (err: Error) => {
      console.error('Uppy error:', err)
      const fileKey = `${fileToUpload.relativePath}_${fileToUpload.file.size}`
      setUploadItems((prev) => ({
        ...prev,
        [fileKey]: {
          fileKey,
          fileId: fileId || prev[fileKey]?.fileId || '',
          status: 'error',
          progress: prev[fileKey]?.progress ?? 0,
        },
      }))
      setCurrentUploadId(null)
    })

    // Start upload
    uppy.upload()

    uppyRef.current = uppy
    return uppy
  }, [encryptEnabled, onUploadProgress])

  const togglePauseResume = (fileKey: string) => {
    const item = uploadItems[fileKey]
    if (!item || !uppyRef.current) return
    if (!item.fileId) return
    try {
      uppyRef.current.pauseResume(item.fileId)
      const nextStatus = item.status === 'paused' ? 'uploading' : 'paused'
      setUploadItems((prev) => ({
        ...prev,
        [fileKey]: { ...item, status: nextStatus },
      }))
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

    const readAllEntries = async (
      reader: { readEntries: (cb: (entries: AnyEntry[]) => void, err?: (e: unknown) => void) => void },
    ): Promise<AnyEntry[]> => {
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
          entry.file!((f) => resolve(f), (err) => reject(err))
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
      .map((it) => (it as unknown as { webkitGetAsEntry?: () => AnyEntry | null }).webkitGetAsEntry?.())
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
      new Map(selected.map((sf) => [`${sf.relativePath}_${sf.file.size}`, sf])).values()
    )

    if (source === 'folder') {
      const hasAnyPath = deduped.some((sf) => sf.relativePath.includes('/'))
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

    const transformed = pendingFolderFiles.map((sf) => ({
      ...sf,
      relativePath: `${root}/${sf.relativePath}`,
    }))

    const deduped = Array.from(
      new Map(transformed.map((sf) => [`${sf.relativePath}_${sf.file.size}`, sf])).values()
    )
    setPendingFolderFiles(null)
    setPendingFolderName('')
    handleFileSelection(deduped)
  }


  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          borderColor: dragOver ? 'primary.main' : 'rgba(255,255,255,0.10)',
          background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}14, transparent 55%)`,
          transition: 'border-color 150ms ease',
        }}
        onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false) }}
        onDrop={(e) => {
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
          <Box sx={{ color: encryptEnabled ? 'success.main' : 'text.secondary' }}>
            <LockIcon />
          </Box>
          <Typography variant="body2" sx={{ flex: 1 }}>
            تشفير الملفات (E2E) — مفعّل دائمًا
          </Typography>
          <Button
            size="small"
            variant="contained"
            color="success"
            disabled
            sx={{ minWidth: 100 }}
          >
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
          onChange={(e) => onPickFiles(e.target.files ? Array.from(e.target.files) : [], 'files')}
        />

        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-expect-error: webkitdirectory is non-standard but supported in Chromium/WebKit browsers.
          webkitdirectory=""
          style={{ display: 'none' }}
          onChange={(e) => onPickFiles(e.target.files ? Array.from(e.target.files) : [], 'folder')}
        />

        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isEncrypting}
            startIcon={<FileIcon />}
            sx={{ borderRadius: 999, gap: 1 }}
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
                // Upload all files using Uppy
                for (const file of files) {
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
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Box sx={{ flex: '1 1 220px' }}>
                    <TextField
                      size="small"
                      label="اسم المجلد داخل uploads"
                      value={pendingFolderName}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setPendingFolderName(e.target.value)}
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
                {files.slice(0, 80).map((sf) => (
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
                    <Typography variant="body2" sx={{ wordBreak: 'break-word', opacity: 0.92, flex: 1 }}>
                      {sf.relativePath}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.6, fontSize: '0.75rem' }}>
                      {fmtBytes(sf.file.size)}
                    </Typography>
                    {uploadItems[`${sf.relativePath}_${sf.file.size}`] && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ opacity: 0.6, fontSize: '0.75rem' }}>
                          {uploadItems[`${sf.relativePath}_${sf.file.size}`].progress}%
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => togglePauseResume(`${sf.relativePath}_${sf.file.size}`)}
                          sx={{ minWidth: 'auto', p: 0.5 }}
                          disabled={uploadItems[`${sf.relativePath}_${sf.file.size}`].status === 'completed'}
                        >
                          {uploadItems[`${sf.relativePath}_${sf.file.size}`].status === 'paused'
                            ? <PlayArrowIcon sx={{ fontSize: 16 }} />
                            : <PauseIcon sx={{ fontSize: 16 }} />}
                        </Button>
                      </Box>
                    )}
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
      >
        <DialogTitle>رفع الملفات</DialogTitle>
        <DialogContent>
          <Box id="uppy-dashboard" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUppyDashboard(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// Re-export types
export type { }