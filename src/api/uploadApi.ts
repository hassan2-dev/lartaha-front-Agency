import { api } from './http'
import { API_ENV } from '../config/api'
import { subscribeRealtime } from './realtimeApi'

export type UploadResult = {
  ok?: boolean
  message?: string
  uploaded?: Array<{ key: string; size?: number }>
}

export type ListObjectsResult = {
  ok?: boolean
  prefix?: string
  delimiter?: boolean
  folders?: string[]
  objects?: Array<{
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
  pagination?: {
    hasMore: boolean
    nextContinuationToken: string | null
    limit: number
    count: number
    totalFileCount?: number
  }
}

export type TrashResult = {
  ok?: boolean
  message?: string
}

export type TrashFile = {
  id: string
  originalKey: string
  trashKey?: string
  filename: string
  size?: number
  mimeType?: string
  isTrashed: boolean
  deletedAt?: string
  permanentDeleteAt?: string
  createdAt: string
  updatedAt: string
}

export type ListTrashResult = {
  ok?: boolean
  files?: TrashFile[]
}

export type StreamUploadInputFile = {
  file: File
  relativePath: string
  encryptionEnabled?: boolean
  encryptionIv?: string
  encryptionSalt?: string
  thumbnailUploadFile?: File | null
}

export type StreamUploadProgress = {
  progressPercent: number
  bytesUploaded: number
  totalBytes: number
  uploadSpeed: number
  currentFileIndex: number
  totalFiles: number
  currentFilePath: string
}

function isVideoInputFile(file: File, relativePath: string) {
  if (file.type?.toLowerCase().startsWith('video/')) return true
  const ext = relativePath.split('.').pop()?.toLowerCase() || ''
  return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'].includes(ext)
}

function isImageInputFile(file: File, relativePath: string) {
  if (file.type?.toLowerCase().startsWith('image/')) return true
  const ext = relativePath.split('.').pop()?.toLowerCase() || ''
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg', 'ico', 'heic', 'heif'].includes(ext)
}

function buildImageThumbnailKey(originalKey: string) {
  const safeKey = String(originalKey || '').replace(/^\/+/, '')
  if (!safeKey) return ''

  const parts = safeKey.split('/').filter(Boolean)
  const filename = parts.pop() || 'image'
  const basename = filename.replace(/\.[^.]+$/, '') || filename
  const directory = parts.join('/')
  const thumbnailFilename = `${basename}__thumb.jpg`
  return directory ? `${directory}/.thumbnails/${thumbnailFilename}` : `.thumbnails/${thumbnailFilename}`
}

export async function createImageThumbnailBlob(file: File): Promise<Blob | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null

  return await new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.src = objectUrl

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      img.src = ''
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const width = img.naturalWidth || 0
        const height = img.naturalHeight || 0
        if (width <= 0 || height <= 0) {
          cleanup()
          resolve(null)
          return
        }

        // Use original dimensions for high quality thumbnail
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) {
          cleanup()
          resolve(null)
          return
        }

        context.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            cleanup()
            resolve(blob || null)
          },
          'image/jpeg',
          0.82,
        )
      } catch {
        cleanup()
        resolve(null)
      }
    }

    img.onerror = () => {
      cleanup()
      resolve(null)
    }
  })
}

export async function createVideoThumbnailBlob(file: File): Promise<Blob | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null

  return await new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.src = objectUrl

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      video.removeAttribute('src')
      video.load()
    }

    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        cleanup()
        resolve(null)
        return
      }

      video.currentTime = Math.min(0.1, Math.max(video.duration * 0.1, 0.01))
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        const width = video.videoWidth || 0
        const height = video.videoHeight || 0
        if (width <= 0 || height <= 0) {
          cleanup()
          resolve(null)
          return
        }

        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) {
          cleanup()
          resolve(null)
          return
        }

        context.drawImage(video, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            cleanup()
            resolve(blob || null)
          },
          'image/jpeg',
          0.82,
        )
      } catch {
        cleanup()
        resolve(null)
      }
    }

    video.onerror = () => {
      cleanup()
      resolve(null)
    }
  })
}

async function uploadVideoThumbnail(originalKey: string, thumbnailBlob: Blob) {
  await api.put('/api/upload/video-thumbnail', thumbnailBlob, {
    params: { key: originalKey },
    headers: {
      'Content-Type': 'image/jpeg',
    },
    timeout: 2 * 60 * 1000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  })
}

export async function uploadImageThumbnail(key: string, thumbnailKey: string, thumbnailBlob: Blob): Promise<void> {
  // Use FormData to send both file and metadata
  const formData = new FormData()
  formData.append('key', key)
  formData.append('thumbnailKey', thumbnailKey)
  formData.append('file', thumbnailBlob, 'thumbnail.jpg')
  
  await api.post('/api/upload/image-thumbnail', formData, {
    timeout: 2 * 60 * 1000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  })
}

export async function uploadFiles(
  formData: FormData,
  onUploadProgress?: (progressPercent: number, bytesUploaded?: number, totalBytes?: number, uploadSpeed?: number) => void
): Promise<UploadResult> {
  let lastTime = Date.now()
  let lastLoaded = 0

  const res = await api.post(API_ENV.uploadPath, formData, {
    headers: {
      // Let Axios set correct multipart boundary if you omit this header,
      // but keeping it explicit is fine for most backends.
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (evt) => {
      if (!evt.total) return

      const currentTime = Date.now()
      const timeDiff = (currentTime - lastTime) / 1000 // seconds
      const bytesDiff = evt.loaded - lastLoaded

      // Calculate upload speed (bytes per second)
      const uploadSpeed = timeDiff > 0 ? bytesDiff / timeDiff : 0

      // Update progress with detailed information
      const pct = Math.round((evt.loaded * 100) / evt.total)
      onUploadProgress?.(pct, evt.loaded, evt.total, uploadSpeed)

      // Update last values for next calculation
      lastTime = currentTime
      lastLoaded = evt.loaded
    },
    // Increase timeout for large files (30 minutes)
    timeout: 30 * 60 * 1000,
    // Ensure no compression for file uploads
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  })
  return res.data as UploadResult
}

export async function uploadFilesStreamed(
  files: StreamUploadInputFile[],
  options: {
    batchName: string
    folderName?: string
    skipFiles?: Set<string>
    onUploadProgress?: (progress: StreamUploadProgress) => void
  },
): Promise<UploadResult> {
  const { batchName, folderName, skipFiles = new Set(), onUploadProgress } = options
  const totalFiles = files.length
  const totalBytes = files.reduce((sum, item) => sum + item.file.size, 0)

  if (totalFiles === 0) {
    return { ok: true, uploaded: [] }
  }

  let completedBytes = 0
  let lastTime = Date.now()
  let lastLoaded = 0
  const uploaded: Array<{ key: string; size?: number }> = []
  let finalizingStartedAt: number | null = null

  let activeUploadId = ''
  let activeFile: StreamUploadInputFile | null = null
  let activeFileIndex = 0

  const unsubscribeRealtime = subscribeRealtime((event) => {
    if (event.scope !== 'files' || event.action !== 'upload_progress') return
    if (!event.data || typeof event.data !== 'object') return

    const data = event.data as {
      uploadId?: unknown
      status?: unknown
      bytesUploaded?: unknown
    }

    const eventUploadId = typeof data.uploadId === 'string' ? data.uploadId : ''
    if (!eventUploadId || eventUploadId !== activeUploadId || !activeFile) return

    const status = data.status === 'completed' || data.status === 'failed' || data.status === 'running'
      || data.status === 'finalizing'
      ? data.status
      : 'running'
    const currentFileUploadedRaw = typeof data.bytesUploaded === 'number' ? data.bytesUploaded : 0
    const currentFileUploaded = Math.min(Math.max(currentFileUploadedRaw, 0), activeFile.file.size)
    const bytesUploaded = Math.min(totalBytes, completedBytes + currentFileUploaded)
    const now = Date.now()
    const elapsedSeconds = (now - lastTime) / 1000
    const deltaBytes = bytesUploaded - lastLoaded
    const uploadSpeed = elapsedSeconds > 0 ? deltaBytes / elapsedSeconds : 0
    const rawPercent = totalBytes > 0 ? (bytesUploaded * 100) / totalBytes : 100
    let progressPercent = 0

    if (status === 'running') {
      finalizingStartedAt = null
      progressPercent = Math.min(90, Math.floor(rawPercent * 0.9))
    } else if (status === 'finalizing') {
      if (finalizingStartedAt === null) {
        finalizingStartedAt = now
      }
      const elapsedMs = now - finalizingStartedAt
      const rampPercent = 90 + Math.floor(elapsedMs / 1500)
      progressPercent = Math.min(99, Math.max(90, rampPercent))
    } else if (status === 'completed') {
      progressPercent = 100
    } else {
      progressPercent = Math.min(99, Math.floor(rawPercent))
    }

    onUploadProgress?.({
      progressPercent,
      bytesUploaded,
      totalBytes,
      uploadSpeed,
      currentFileIndex: activeFileIndex + 1,
      totalFiles,
      currentFilePath: activeFile.relativePath,
    })

    lastTime = now
    lastLoaded = bytesUploaded
  })

  try {
    for (let index = 0; index < files.length; index += 1) {
      const item = files[index]

      // Skip already uploaded files when resuming
      if (skipFiles.has(item.relativePath)) {
        completedBytes += item.file.size
        continue
      }

      const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      activeUploadId = uploadId
      activeFile = item
      activeFileIndex = index

      let lastProgressTime = Date.now()
      let lastProgressLoaded = 0

      const response = await api.put('/api/upload/stream', item.file, {
        params: {
          batchName,
          path: item.relativePath,
          uploadId,
          ...(folderName ? { folderName } : {}),
          ...(item.encryptionEnabled ? { encryptionEnabled: '1' } : {}),
          ...(item.encryptionIv ? { encryptionIv: item.encryptionIv } : {}),
          ...(item.encryptionSalt ? { encryptionSalt: item.encryptionSalt } : {}),
        },
        headers: {
          'Content-Type': item.file.type || 'application/octet-stream',
        },
        timeout: 30 * 60 * 1000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        onUploadProgress: (evt) => {
          if (!evt.total) return
          const now = Date.now()
          const timeDiff = (now - lastProgressTime) / 1000
          const bytesDiff = evt.loaded - lastProgressLoaded
          const uploadSpeed = timeDiff > 0 ? bytesDiff / timeDiff : 0
          const bytesUploaded = completedBytes + evt.loaded
          const rawPercent = (bytesUploaded * 100) / totalBytes
          const progressPercent = Math.min(90, Math.floor(rawPercent * 0.9))
          onUploadProgress?.({
            progressPercent,
            bytesUploaded,
            totalBytes,
            uploadSpeed,
            currentFileIndex: index + 1,
            totalFiles,
            currentFilePath: item.relativePath,
          })
          lastProgressTime = now
          lastProgressLoaded = evt.loaded
        },
      })

      const data = response.data as UploadResult
      if (Array.isArray(data.uploaded)) {
        uploaded.push(...data.uploaded)
      }

      const uploadedKey = data.uploaded?.[0]?.key

      if (uploadedKey && item.thumbnailUploadFile) {
        try {
          if (isImageInputFile(item.file, item.relativePath)) {
            const thumbnailKey = buildImageThumbnailKey(uploadedKey)
            if (thumbnailKey) {
              await uploadImageThumbnail(uploadedKey, thumbnailKey, item.thumbnailUploadFile)
            }
          } else if (isVideoInputFile(item.file, item.relativePath)) {
            await uploadVideoThumbnail(uploadedKey, item.thumbnailUploadFile)
          }
        } catch {
          // Thumbnail upload failures should not fail the primary file upload.
        }
      }

      if (uploadedKey && !item.thumbnailUploadFile && isVideoInputFile(item.file, item.relativePath)) {
        try {
          const thumbnailBlob = await createVideoThumbnailBlob(item.file)
          if (thumbnailBlob) {
            await uploadVideoThumbnail(uploadedKey, thumbnailBlob)
          }
        } catch {
          // Thumbnail upload failures should not fail the primary file upload.
        }
      }

      // Generate and upload thumbnail for non-encrypted images
      console.debug('[uploadFilesStreamed] deciding on thumbnail generation', {
        uploadedKey,
        isImage: isImageInputFile(item.file, item.relativePath),
        encryptionEnabled: item.encryptionEnabled,
        relativePath: item.relativePath,
        fileType: item.file.type,
      })
      if (uploadedKey && !item.thumbnailUploadFile && isImageInputFile(item.file, item.relativePath) && !item.encryptionEnabled) {
        try {
          const thumbnailBlob = await createImageThumbnailBlob(item.file)
          console.debug('[uploadFilesStreamed] thumbnail blob created', { uploadedKey, thumbnailBlobSize: thumbnailBlob?.size })
          if (thumbnailBlob) {
            const thumbnailKey = buildImageThumbnailKey(uploadedKey)
            console.debug('[uploadFilesStreamed] thumbnail key built', { uploadedKey, thumbnailKey })
            if (thumbnailKey) {
              await uploadImageThumbnail(uploadedKey, thumbnailKey, thumbnailBlob)
              console.debug('[uploadFilesStreamed] thumbnail upload completed', { uploadedKey, thumbnailKey })
            }
          }
        } catch (err) {
          console.error('[uploadFilesStreamed] thumbnail generation failed', err)
          // Thumbnail upload failures should not fail the primary file upload.
        }
      } else {
        console.debug('[uploadFilesStreamed] skipping thumbnail - condition not met', {
          hasUploadedKey: Boolean(uploadedKey),
          isImage: isImageInputFile(item.file, item.relativePath),
          notEncrypted: !item.encryptionEnabled,
        })
      }

      completedBytes += item.file.size
      const progressPercent = totalBytes > 0 ? Math.round((completedBytes * 100) / totalBytes) : 100
      onUploadProgress?.({
        progressPercent,
        bytesUploaded: Math.min(completedBytes, totalBytes),
        totalBytes,
        uploadSpeed: 0,
        currentFileIndex: index + 1,
        totalFiles,
        currentFilePath: item.relativePath,
      })
    }
  } finally {
    unsubscribeRealtime()
  }

  return {
    ok: true,
    uploaded,
    message: `Uploaded ${uploaded.length} file(s) to R2.`,
  }
}

export type ListObjectsParams = {
  prefix?: string
  limit?: number
  delimiter?: boolean
  continuationToken?: string
}

export async function listUploadedObjects(
  prefix: string,
  limit: number = 50,
  delimiter: boolean = true,
  continuationToken?: string
): Promise<ListObjectsResult> {
  const params: ListObjectsParams = { prefix, limit, delimiter }
  if (continuationToken) {
    params.continuationToken = continuationToken
  }

  const res = await api.get(`${API_ENV.uploadPath}/list`, {
    params,
  })
  return res.data as ListObjectsResult
}

export async function moveFileToTrash(key: string): Promise<TrashResult> {
  const res = await api.post('/api/files/trash', { key })
  return res.data as TrashResult
}

export async function restoreFileFromTrash(key: string): Promise<TrashResult> {
  const res = await api.post('/api/files/restore', { key })
  return res.data as TrashResult
}

export async function bulkMoveToTrash(keys: string[]): Promise<TrashResult> {
  const res = await api.post('/api/files/trash/bulk', { keys })
  return res.data as TrashResult
}

export async function bulkRestoreFromTrash(keys: string[]): Promise<TrashResult> {
  const res = await api.post('/api/files/restore/bulk', { keys })
  return res.data as TrashResult
}

export async function listTrashFiles(): Promise<ListTrashResult> {
  const res = await api.get('/api/files/trash')
  return res.data as ListTrashResult
}

export type BulkPrivacyResult = {
  ok?: boolean
  settings?: Record<string, { restricted: boolean; allowedMembers: string[]; canAccess: boolean }>
}

export async function fetchBulkPrivacySettings(fileKeys: string[]): Promise<BulkPrivacyResult> {
  if (fileKeys.length === 0) {
    return { ok: true, settings: {} }
  }
  const res = await api.post('/api/files/privacy/bulk', { fileKeys })
  return res.data as BulkPrivacyResult
}

// ========== Encrypted Upload API ==========

export type UploadUrlResult = {
  ok?: boolean
  uploadId?: string
  key?: string
  url?: string
  r2Endpoint?: string
  r2Bucket?: string
  r2PublicUrl?: string
}

export type MultipartCreateResult = {
  ok?: boolean
  uploadId?: string
  key?: string
  multipartUploadId?: string
}

export type MultipartSignPartResult = {
  ok?: boolean
  url?: string
}

export type MultipartCompleteResult = {
  ok?: boolean
}

export type MultipartAbortResult = {
  ok?: boolean
}

export type ConfirmUploadResult = {
  ok?: boolean
  message?: string
  file?: {
    id: string
    originalKey: string
    filename: string
    size: number
    mimeType: string
    encryptionEnabled: boolean
    encryptionIv?: string
    encryptionSalt?: string
  }
}

export type UploadProgressResult = {
  ok?: boolean
  status?: string
  bytesUploaded?: number
  totalBytes?: number
  progressPercent?: number
  error?: string
}

export type DownloadUrlResult = {
  ok?: boolean
  url?: string
  filename?: string
  mimeType?: string
  size?: number
  encryptionEnabled?: boolean
  encryptionIv?: string
  encryptionSalt?: string
}

/**
 * Request a pre-signed URL for direct R2 upload
 */
export async function requestUploadUrl(params: {
  filename: string
  mimeType?: string
  size?: number
  encryptionEnabled?: boolean
  encryptionIv?: string
  encryptionSalt?: string
}): Promise<UploadUrlResult> {
  const res = await api.post('/api/upload/url', params)
  return res.data as UploadUrlResult
}

// ========== Multipart Upload API ==========

export async function createMultipartUpload(params: {
  filename: string
  mimeType?: string
  size?: number
}): Promise<MultipartCreateResult> {
  const res = await api.post('/api/upload/multipart/create', params)
  return res.data as MultipartCreateResult
}

export async function signMultipartPart(params: {
  key: string
  multipartUploadId: string
  partNumber: number
}): Promise<MultipartSignPartResult> {
  const res = await api.post('/api/upload/multipart/part', params)
  return res.data as MultipartSignPartResult
}

export async function completeMultipartUpload(params: {
  uploadId: string
  key: string
  multipartUploadId: string
  parts: Array<{ ETag?: string; etag?: string; PartNumber?: number; partNumber?: number }>
}): Promise<MultipartCompleteResult> {
  const res = await api.post('/api/upload/multipart/complete', params)
  return res.data as MultipartCompleteResult
}

export async function abortMultipartUpload(params: {
  key: string
  multipartUploadId: string
}): Promise<MultipartAbortResult> {
  const res = await api.post('/api/upload/multipart/abort', params)
  return res.data as MultipartAbortResult
}

export async function listMultipartParts(params: {
  key: string
  multipartUploadId: string
}): Promise<{
  ok?: boolean
  parts?: Array<{
    PartNumber?: number
    ETag?: string
    Size?: number
  }>
}> {
  const res = await api.post('/api/upload/multipart/list-parts', params)
  return res.data
}

/**
 * Confirm upload completion and save file metadata
 */
export async function confirmUpload(params: {
  uploadId: string
  key: string
  filename: string
  mimeType?: string
  size?: number
  encryptionEnabled?: boolean
  encryptionIv?: string
  encryptionSalt?: string
  folderName?: string
  batchName?: string
}): Promise<ConfirmUploadResult> {
  const res = await api.post('/api/upload/confirm', params)
  return res.data as ConfirmUploadResult
}

/**
 * Get upload progress for a specific upload
 */
export async function getUploadProgress(uploadId: string): Promise<UploadProgressResult> {
  const res = await api.get(`/api/upload/progress/${uploadId}`)
  return res.data as UploadProgressResult
}

/**
 * Get file download URL (for encrypted files, returns R2 URL for client-side decryption)
 */
export async function getDownloadUrl(fileId: string): Promise<DownloadUrlResult> {
  const res = await api.get(`/api/upload/download/${fileId}`)
  return res.data as DownloadUrlResult
}
