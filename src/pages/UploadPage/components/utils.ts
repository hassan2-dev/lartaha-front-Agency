import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import ImageIcon from '@mui/icons-material/Image'
import VideoFileIcon from '@mui/icons-material/VideoFile'
import AudioFileIcon from '@mui/icons-material/AudioFile'
import DescriptionIcon from '@mui/icons-material/Description'
import React from 'react'

export function fmtBytes(bytes: number | undefined) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

export function fmtDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:00'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  const mm = m.toString().padStart(2, '0')
  const ss = s.toString().padStart(2, '0')
  if (h > 0) return `${h}:${mm}:${ss}`
  return `${mm}:${ss}`
}

export function getFileType(filename: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const imageExts = [
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'avif', 'ico', 'heic', 'heif',
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

export function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'image':
      return React.createElement(ImageIcon)
    case 'video':
      return React.createElement(VideoFileIcon)
    case 'audio':
      return React.createElement(AudioFileIcon)
    case 'document':
      return React.createElement(DescriptionIcon)
    default:
      return React.createElement(InsertDriveFileIcon)
  }
}

export function filenameFromKey(key: string) {
  const parts = String(key).split('/').filter(Boolean)
  return parts[parts.length - 1] || 'file'
}

export function objectKeyMatchesDeepLink(fileKey: string, requested: string): boolean {
  const stripMeta = (s: string) => (s.includes(':') ? s.slice(0, s.indexOf(':')) : s)
  const safeDecode = (s: string) => {
    try {
      return decodeURIComponent(s)
    } catch {
      return s
    }
  }
  const stripInvisible = (s: string) =>
    s.replace(/[\u200B-\u200D\u2060\uFEFF\u200E\u200F]/g, '').replace(/\s+/g, ' ').trim()
  const canonicalize = (value: string) =>
    stripInvisible(
      safeDecode(stripMeta(String(value || '').trim()))
        .replace(/\+/g, ' ')
        .replace(/^\/+/, '')
        .normalize('NFKC')
    )

  const a = canonicalize(fileKey)
  const b = canonicalize(requested)
  if (!a || !b) return false
  if (a === b) return true
  if (a.endsWith(`/${b}`) || b.endsWith(`/${a}`)) return true

  const aParts = a.split('/').filter(Boolean)
  const bParts = b.split('/').filter(Boolean)
  const aName = aParts[aParts.length - 1] || ''
  const bName = bParts[bParts.length - 1] || ''
  if (aName && bName && aName === bName) {
    const aDir = aParts.slice(0, -1).join('/')
    const bDir = bParts.slice(0, -1).join('/')
    if (aDir === bDir || aDir.endsWith(`/${bDir}`) || bDir.endsWith(`/${aDir}`)) {
      return true
    }
  }
  return false
}

export function deriveRelativeFolderFromFileKey(fileKey: string, workspaceId: string): string {
  const trimmed = String(fileKey || '').trim()
  if (!trimmed) return ''
  const baseKey = trimmed.includes(':') ? trimmed.slice(0, trimmed.indexOf(':')) : trimmed
  const normalized = baseKey.replace(/^\/+/, '')
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length <= 1) return ''
  const directory = parts.slice(0, -1).join('/')
  if (!directory) return ''

  const uploadsWorkspacePrefix = `uploads/${workspaceId}/`
  if (directory.startsWith(uploadsWorkspacePrefix)) {
    return directory.slice(uploadsWorkspacePrefix.length)
  }
  if (directory === `uploads/${workspaceId}`) {
    return ''
  }
  if (directory.startsWith('uploads/')) {
    return directory.slice('uploads/'.length)
  }
  if (directory.startsWith(`${workspaceId}/`)) {
    return directory.slice(workspaceId.length + 1)
  }
  return directory
}

export function validateFileQuality(file: File): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = []
  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  if (['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(extension)) {
    if (file.size < 10000) {
      warnings.push('حجم الصورة صغير جداً قد يكون جودته منخفضة')
    }
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) {
    if (file.size < 100000) {
      warnings.push('حجم الفيديو صغير جداً قد يكون جودته منخفضة')
    }
  }
  if (['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(extension)) {
    if (file.size < 50000) {
      warnings.push('حجم الملف الصوتي صغير جداً قد يكون جودته منخفضة')
    }
  }

  return { isValid: warnings.length === 0, warnings }
}

export const CLIENT_KEY_STORAGE = 'file_encryption_password'

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

export const uploadDevLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args)
}
export const uploadDevWarn = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.warn(...args)
}
