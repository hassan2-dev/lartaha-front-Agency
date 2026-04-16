/**
 * Upload Page Types
 * Centralized type definitions for the upload page module
 */

import type { SelectedUploadFile } from '../../components/EncryptedUploadDropzone'

// File type categories
export type FileType = 'image' | 'video' | 'audio' | 'document' | 'other'

// View mode for file display
export type ViewMode = 'list' | 'grid'

// Filter options for files
export type FileFilter = 'all' | 'images' | 'videos' | 'documents'

// Sort options
export type SortBy = 'name' | 'date' | 'size'
export type SortOrder = 'asc' | 'desc'

// File object from API
export interface FileObject {
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
}

// Folder representation
export type FolderPath = string

// Privacy settings for a file
export interface FilePrivacySettings {
  restricted: boolean
  allowedMembers: string[]
  canAccess?: boolean
}

// Team member for privacy settings
export interface TeamMember {
  id: string
  email: string
  name?: string
  user?: {
    name: string
    email: string
  }
}

// Trashed file
export interface TrashedFile {
  id: string
  originalKey: string
  filename: string
  deletedAt: string
  permanentDeleteAt: string
  deletedBy?: {
    name: string
    isAdmin: boolean
  }
}

// Preview file state
export interface PreviewFile {
  key: string
  url: string
  filename: string
  type: FileType
}

// Encrypted viewer file state
export interface EncryptedViewerFile {
  fileId: string
  filename: string
  mimeType?: string
  size?: number
  encryptionEnabled?: boolean
  encryptionIv?: string
  encryptionSalt?: string
}

// Upload item state
export interface UploadItemState {
  fileKey: string
  fileId: string
  status: 'idle' | 'uploading' | 'paused' | 'completed' | 'error'
  progress: number
  speed?: number
  bytesUploaded?: number
  totalBytes?: number
}

// Props for file item components
export interface FileItemProps {
  obj: FileObject
  url: string
  thumbnailUrl?: string
  onDelete: (key: string) => void
  onPreview: (key: string, url: string) => void
  onDownload: (key: string, filename: string) => void
  onPrivacyToggle: (key: string, filename: string) => void
  filePrivacySettings: Record<string, FilePrivacySettings>
  canAccessFile: (key: string) => boolean
  isDeleting?: boolean
  selected?: boolean
  onToggleSelect?: (key: string) => void
}

// Props for folder item components
export interface FolderItemProps {
  folderPath: string
  onClick: () => void
  onDelete: (folderPath: string) => void
  onDownload: (folderPath: string) => void
  isDeleting?: boolean
}

// Props for trash file item
export interface TrashFileItemProps {
  file: TrashedFile
  onRestore: (key: string) => void
  selected?: boolean
  onToggleSelect?: (key: string) => void
}

// Props for thumbnail components
export interface ImageThumbnailProps {
  url: string
  filename: string
  size?: number
  encryptionEnabled?: boolean
  thumbnailKey?: string | null
}

export interface VideoThumbnailProps {
  url: string
  thumbnailKey?: string | null
  size?: number
  encryptionEnabled?: boolean
}

// File quality validation result
export interface FileQualityValidation {
  isValid: boolean
  warnings: string[]
}

// Export SelectedUploadFile for convenience
export type { SelectedUploadFile }
