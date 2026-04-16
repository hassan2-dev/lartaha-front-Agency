import { API_ENV } from '../../../config/api'

export const buildLogoUrl = (logoKey: string): string => {
  if (!logoKey) return ''

  const baseUrl = (API_ENV.r2PublicBaseUrl || '').replace(/\/+$/, '')
  const safeKey = logoKey.replace(/^\/+/, '')
  return `${baseUrl}/${safeKey}`
}

export const createFilePreview = (file: File): string => {
  return URL.createObjectURL(file)
}

export const revokeFilePreview = (previewUrl: string): void => {
  if (previewUrl && previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl)
  }
}
