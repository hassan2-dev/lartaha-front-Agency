export function formatSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '0 B/s'
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytesPerSecond) / Math.log(1024)))
  const value = bytesPerSecond / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--'
  if (seconds < 60) return `${Math.round(seconds)} ثانية`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} دقيقة`
  return `${Math.floor(seconds / 3600)} ساعة ${Math.floor((seconds % 3600) / 60)} دقيقة`
}

export function validateFileQuality(file: File): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = []

  // Check for common file types and their quality indicators
  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  // Image quality checks
  if (['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(extension)) {
    // For images, we'll check size as a basic quality indicator
    if (file.size < 10000) {
      // Less than 10KB might be low quality
      warnings.push('حجم الصورة صغير جداً قد يكون جودته منخفضة')
    }
  }

  // Video quality checks
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) {
    if (file.size < 100000) {
      // Less than 100KB for video is very small
      warnings.push('حجم الفيديو صغير جداً قد يكون جودته منخفضة')
    }
  }

  // Audio quality checks
  if (['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(extension)) {
    if (file.size < 50000) {
      // Less than 50KB for audio is very small
      warnings.push('حجم الملف الصوتي صغير جداً قد يكون جودته منخفضة')
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  }
}

export function fmtBytes(bytes: number | undefined) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

export function isHiddenChatUploadPath(pathOrKey: string) {
  const normalizedPath = String(pathOrKey || '').replace(/^\/+|\/+$/g, '')
  if (!normalizedPath) return false
  if (normalizedPath.includes('/.chat-files/')) return true

  const pathParts = normalizedPath.split('/').filter(Boolean)
  if (pathParts[0] === 'upload') return true
  if (pathParts[0] === 'chat') return true
  return pathParts.length >= 2 && pathParts[1] === 'chat'
}

export function isHiddenChatRootFolder(folderPath: string, currentPath: string) {
  const normalizedFolderPath = String(folderPath || '').replace(/^\/+|\/+$/g, '')
  if (!normalizedFolderPath) return false
  if (currentPath) return false
  if (normalizedFolderPath === 'upload') return true
  return /^[A-Za-z0-9_-]{10}$/.test(normalizedFolderPath)
}

export function buildVideoThumbnailKeyFromFileKey(fileKey: string) {
  const safeKey = String(fileKey || '').replace(/^\/+/, '')
  if (!safeKey) return ''

  const parts = safeKey.split('/').filter(Boolean)
  const filename = parts.pop() || 'video'
  const basename = filename.replace(/\.[^.]+$/, '') || filename
  const directory = parts.join('/')
  const thumbnailFilename = `${basename}__thumb.jpg`
  return directory
    ? `${directory}/.thumbnails/${thumbnailFilename}`
    : `.thumbnails/${thumbnailFilename}`
}

export function buildImageThumbnailKeyFromFileKey(fileKey: string) {
  const safeKey = String(fileKey || '').replace(/^\/+/, '')
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

export function getFileType(filename: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const imageExts = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'bmp',
    'webp',
    'svg',
    'avif',
    'ico',
    'heic',
    'heif',
  ]
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v']
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma']
  const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx']

  if (imageExts.includes(ext)) return 'image'
  if (videoExts.includes(ext)) return 'video'
  if (audioExts.includes(ext)) return 'audio'
  if (docExts.includes(ext)) return 'document'
  return 'other'
}

const CLIENT_KEY_STORAGE = 'file_encryption_password'

export function filenameFromKey(key: string) {
  const parts = String(key).split('/').filter(Boolean)
  return parts[parts.length - 1] || 'file'
}

export function getClientEncryptionKey(): string | null {
  try {
    return sessionStorage.getItem(CLIENT_KEY_STORAGE)
  } catch {
    return null
  }
}

export function setClientEncryptionKey(key: string) {
  try {
    sessionStorage.setItem(CLIENT_KEY_STORAGE, key)
  } catch {
    // ignore storage errors
  }
}
