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

export async function uploadFiles(
  formData: FormData,
  onUploadProgress?: (progressPercent: number) => void
): Promise<UploadResult> {
  const res = await api.post(API_ENV.uploadPath, formData, {
    headers: {
      // Let Axios set correct multipart boundary if you omit this header,
      // but keeping it explicit is fine for most backends.
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (evt) => {
      if (!evt.total) return
      const pct = Math.round((evt.loaded * 100) / evt.total)
      onUploadProgress?.(pct)
    },
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

