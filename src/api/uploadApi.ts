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
  objects?: Array<{ key: string; size?: number; lastModified?: string; createdAt?: string; updatedAt?: string; thumbnailKey?: string | null }>
  pagination?: {
    hasMore: boolean
    nextContinuationToken: string | null
    limit: number
    count: number
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

async function createVideoThumbnailBlob(file: File): Promise<Blob | null> {
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
    onUploadProgress?: (progress: StreamUploadProgress) => void
  },
): Promise<UploadResult> {
  const { batchName, folderName, onUploadProgress } = options
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
      const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      activeUploadId = uploadId
      activeFile = item
      activeFileIndex = index

      const response = await api.put('/api/upload/stream', item.file, {
        params: {
          batchName,
          path: item.relativePath,
          uploadId,
          ...(folderName ? { folderName } : {}),
        },
        headers: {
          'Content-Type': item.file.type || 'application/octet-stream',
        },
        timeout: 30 * 60 * 1000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      })

      const data = response.data as UploadResult
      if (Array.isArray(data.uploaded)) {
        uploaded.push(...data.uploaded)
      }

      const uploadedKey = data.uploaded?.[0]?.key
      if (uploadedKey && isVideoInputFile(item.file, item.relativePath)) {
        try {
          const thumbnailBlob = await createVideoThumbnailBlob(item.file)
          if (thumbnailBlob) {
            await uploadVideoThumbnail(uploadedKey, thumbnailBlob)
          }
        } catch {
          // Thumbnail upload failures should not fail the primary file upload.
        }
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
