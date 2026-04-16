/**
 * File Utilities
 * Helper functions for file operations, formatting, and validation
 */

import { API_ENV } from '../../../config/api'
import type { FileType, FileObject, FileQualityValidation } from '../types'

/**
 * Format bytes to human-readable string
 */
export function fmtBytes(bytes: number | undefined): string {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

/**
 * Format download/upload speed
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '0 B/s'
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytesPerSecond) / Math.log(1024)))
  const value = bytesPerSecond / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

/**
 * Format time duration
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--'
  if (seconds < 60) return `${Math.round(seconds)} ثانية`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} دقيقة`
  return `${Math.floor(seconds / 3600)} ساعة ${Math.floor((seconds % 3600) / 60)} دقيقة`
}

/**
 * Get file type from filename extension
 */
export function getFileType(filename: string): FileType {
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

/**
 * Extract filename from S3 key
 */
export function filenameFromKey(key: string): string {
  const parts = String(key).split('/').filter(Boolean)
  return parts[parts.length - 1] || 'file'
}

/**
 * Build thumbnail key for video files
 */
export function buildVideoThumbnailKeyFromFileKey(fileKey: string): string {
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

/**
 * Build thumbnail key for image files
 */
export function buildImageThumbnailKeyFromFileKey(fileKey: string): string {
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

/**
 * Check if path is a hidden chat upload path
 */
export function isHiddenChatUploadPath(pathOrKey: string): boolean {
  const normalizedPath = String(pathOrKey || '').replace(/^\/+|\/+$/g, '')
  if (!normalizedPath) return false
  if (normalizedPath.includes('/.chat-files/')) return true

  const pathParts = normalizedPath.split('/').filter(Boolean)
  if (pathParts[0] === 'upload') return true
  if (pathParts[0] === 'chat') return true
  return pathParts.length >= 2 && pathParts[1] === 'chat'
}

/**
 * Check if folder is a hidden chat root folder
 */
export function isHiddenChatRootFolder(folderPath: string, currentPath: string): boolean {
  const normalizedFolderPath = String(folderPath || '').replace(/^\/+|\/+$/g, '')
  if (!normalizedFolderPath) return false
  if (currentPath) return false
  if (normalizedFolderPath === 'upload') return true
  return /^[A-Za-z0-9_-]{10}$/.test(normalizedFolderPath)
}

/**
 * Convert S3 key to public URL
 */
export function keyToPublicUrl(key: string): string {
  const publicBase = API_ENV.r2PublicBaseUrl?.trim() || ''
  const safeKey = key.startsWith('/') ? key.slice(1) : key

  if (publicBase) {
    const base = publicBase.endsWith('/') ? publicBase.slice(0, -1) : publicBase
    return `${base}/${safeKey}`
  }

  const base = API_ENV.apiBaseUrl?.trim() || ''
  if (!base) return ''
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base
  return `${normalized}/api/image/${encodeURIComponent(safeKey)}`
}

/**
 * Validate file quality based on size and type
 */
export function validateFileQuality(file: File): FileQualityValidation {
  const warnings: string[] = []
  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  // Image quality checks
  if (['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(extension)) {
    if (file.size < 10000) {
      warnings.push('حجم الصورة صغير جداً قد يكون جودته منخفضة')
    }
  }

  // Video quality checks
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) {
    if (file.size < 100000) {
      warnings.push('حجم الفيديو صغير جداً قد يكون جودته منخفضة')
    }
  }

  // Audio quality checks
  if (['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(extension)) {
    if (file.size < 50000) {
      warnings.push('حجم الملف الصوتي صغير جداً قد يكون جودته منخفضة')
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  }
}

/**
 * Extract timestamp from file key for sorting
 */
export function extractTimestampFromKey(key: string): number | null {
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

/**
 * Get the most reliable date for a file
 */
export function getFileDate(file: FileObject): Date | null {
  if (file.createdAt) {
    return new Date(file.createdAt)
  }
  if (file.updatedAt) {
    return new Date(file.updatedAt)
  }
  if (file.lastModified) {
    return new Date(file.lastModified)
  }
  const timestamp = extractTimestampFromKey(file.key)
  return timestamp ? new Date(timestamp) : null
}

/**
 * Filter files by type
 */
export function filterFiles(
  files: FileObject[],
  filter: 'all' | 'images' | 'videos' | 'documents'
): FileObject[] {
  if (filter === 'all') return files

  return files.filter(file => {
    const filename = file.key.split('/').pop() || ''
    const fileType = getFileType(filename)

    switch (filter) {
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

/**
 * Sort files by criteria
 */
export function sortFiles(
  files: FileObject[],
  sortBy: 'name' | 'date' | 'size',
  sortOrder: 'asc' | 'desc' = 'asc'
): FileObject[] {
  return [...files].sort((a, b) => {
    const filenameA = a.key.split('/').pop() || ''
    const filenameB = b.key.split('/').pop() || ''

    let comparison = 0

    switch (sortBy) {
      case 'name':
        comparison = filenameA.localeCompare(filenameB)
        break
      case 'size':
        comparison = (a.size || 0) - (b.size || 0)
        break
      case 'date': {
        const dateA = getFileDate(a)
        const dateB = getFileDate(b)

        if (dateA && dateB) {
          comparison = dateB.getTime() - dateA.getTime() // Newer first
        } else if (dateA) {
          comparison = -1
        } else if (dateB) {
          comparison = 1
        } else {
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

/**
 * Validate folder name
 */
export function validateFolderName(
  name: string,
  existingFolders: string[]
): { isValid: boolean; error?: string } {
  const trimmedName = name.trim()

  if (!trimmedName) {
    return { isValid: false, error: 'يرجى إدخال اسم المجلد' }
  }

  const invalidChars = /[<>:"/\\|?*]/
  if (invalidChars.test(trimmedName)) {
    return { isValid: false, error: 'اسم المجلد يحتوي على أحرف غير صالحة: < > : " / \\ | ? *' }
  }

  if (
    trimmedName.startsWith('.') ||
    trimmedName.startsWith(' ') ||
    trimmedName.endsWith('.') ||
    trimmedName.endsWith(' ')
  ) {
    return { isValid: false, error: 'اسم المجلد لا يمكن أن يبدأ أو ينتهي بنقطة أو مسافة' }
  }

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
    return { isValid: false, error: 'اسم المجلد محجوز. يرجى استخدام اسم مختلف.' }
  }

  if (trimmedName.length > 255) {
    return { isValid: false, error: 'اسم المجلد طويل جداً. الحد الأقصى هو 255 حرفًا.' }
  }

  const existingNames = existingFolders.map(folder => {
    const cleaned = folder.endsWith('/') ? folder.slice(0, -1) : folder
    return cleaned.split('/').pop() || cleaned
  })

  if (existingNames.includes(trimmedName)) {
    return { isValid: false, error: 'مجلد بهذا الاسم موجود بالفعل في هذا الموقع' }
  }

  return { isValid: true }
}

/**
 * Build breadcrumbs from current path
 */
export function buildBreadcrumbs(currentPath: string): Array<{ label: string; path: string }> {
  const parts = currentPath.split('/').filter(Boolean)
  const crumbs: Array<{ label: string; path: string }> = [{ label: 'uploads', path: '' }]
  const acc: string[] = []

  for (const seg of parts) {
    acc.push(seg)
    crumbs.push({ label: seg, path: acc.join('/') })
  }

  return crumbs
}
