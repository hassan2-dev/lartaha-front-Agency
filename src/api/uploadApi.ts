import { api } from './http'
import { API_ENV } from '../config/api'

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
  objects?: Array<{ key: string; size?: number }>
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

export async function listUploadedObjects(
  prefix: string,
  limit: number = 200,
  delimiter: boolean = true
): Promise<ListObjectsResult> {
  const res = await api.get(`${API_ENV.uploadPath}/list`, {
    params: { prefix, limit, delimiter },
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

