import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import {
  Box,
  Button,
  Container,
  Typography,
  Tooltip,
  CircularProgress,
  MenuItem,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  useTheme,
  alpha,
  Card,
  FormControl,
  InputLabel,
  Select,
  ListItemIcon,
  Checkbox,
} from '@mui/material'
import FolderIcon from '@mui/icons-material/Folder'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import ImageIcon from '@mui/icons-material/Image'
import VideoFileIcon from '@mui/icons-material/VideoFile'
import AudioFileIcon from '@mui/icons-material/AudioFile'
import DescriptionIcon from '@mui/icons-material/Description'
import ViewListIcon from '@mui/icons-material/ViewList'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import DeleteIcon from '@mui/icons-material/Delete'
import RestoreIcon from '@mui/icons-material/Restore'
import CloseIcon from '@mui/icons-material/Close'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DownloadIcon from '@mui/icons-material/Download'
import LinkIcon from '@mui/icons-material/Link'
import CheckIcon from '@mui/icons-material/Check'
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder'
import SelectAllIcon from '@mui/icons-material/SelectAll'
import LockIcon from '@mui/icons-material/Lock'
import EncryptedUploadDropzone, { type SelectedUploadFile } from '../components/EncryptedUploadDropzone'
import EncryptedFileViewer from '../components/EncryptedFileViewer'
import { getWorkspaceEncryptionKey } from '../api/workspaceApi'
import { useAuth } from '../contexts/AuthContext'
import { API_ENV } from '../config/api'
import { listUploadedObjects, uploadFilesStreamed, moveFileToTrash, restoreFileFromTrash, listTrashFiles, fetchBulkPrivacySettings, bulkMoveToTrash, bulkRestoreFromTrash } from '../api/uploadApi'
import { subscribeRealtime } from '../api/realtimeApi'
import { api } from '../api/http'
import { FileItemSkeleton, FileItemGridSkeleton, FolderItemSkeleton, FolderItemGridSkeleton } from '../components/SkeletonLoaders'
import Toast from '../components/Toast'

function fmtBytes(bytes: number | undefined) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

function isHiddenChatUploadPath(pathOrKey: string) {
  const normalizedPath = String(pathOrKey || '').replace(/^\/+|\/+$/g, '')
  if (!normalizedPath) return false
  if (normalizedPath.includes('/.chat-files/')) return true

  const pathParts = normalizedPath.split('/').filter(Boolean)
  if (pathParts[0] === 'upload') return true
  if (pathParts[0] === 'chat') return true
  return pathParts.length >= 2 && pathParts[1] === 'chat'
}

function isHiddenChatRootFolder(folderPath: string, currentPath: string) {
  const normalizedFolderPath = String(folderPath || '').replace(/^\/+|\/+$/g, '')
  if (!normalizedFolderPath) return false
  if (currentPath) return false
  if (normalizedFolderPath === 'upload') return true
  return /^[A-Za-z0-9_-]{10}$/.test(normalizedFolderPath)
}

function buildVideoThumbnailKeyFromFileKey(fileKey: string) {
  const safeKey = String(fileKey || '').replace(/^\/+/, '')
  if (!safeKey) return ''

  const parts = safeKey.split('/').filter(Boolean)
  const filename = parts.pop() || 'video'
  const basename = filename.replace(/\.[^.]+$/, '') || filename
  const directory = parts.join('/')
  const thumbnailFilename = `${basename}__thumb.jpg`
  return directory ? `${directory}/.thumbnails/${thumbnailFilename}` : `.thumbnails/${thumbnailFilename}`
}

function getFileType(filename: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'avif', 'ico', 'heic', 'heif']
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v']
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma']
  const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx']

  if (imageExts.includes(ext)) return 'image'
  if (videoExts.includes(ext)) return 'video'
  if (audioExts.includes(ext)) return 'audio'
  if (docExts.includes(ext)) return 'document'
  return 'other'
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'image': return <ImageIcon />
    case 'video': return <VideoFileIcon />
    case 'audio': return <AudioFileIcon />
    case 'document': return <DescriptionIcon />
    default: return <InsertDriveFileIcon />
  }
}

function ThumbnailTypeBadge({ fileType, size = 16 }: { fileType: string; size?: number }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: 4,
        bottom: 4,
        width: size + 8,
        height: size + 8,
        borderRadius: 999,
        backgroundColor: 'rgba(0,0,0,0.65)',
        border: '1px solid rgba(255,255,255,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
      }}
    >
      <Box sx={{ display: 'inline-flex', color: 'white', '& svg': { fontSize: size } }}>
        {getFileIcon(fileType)}
      </Box>
    </Box>
  )
}

function filenameFromKey(key: string) {
  const parts = String(key).split('/').filter(Boolean)
  return parts[parts.length - 1] || 'file'
}

// Thumbnail preview component for images
// Uses thumbnailKey for non-encrypted thumbnails, or shows lock for encrypted files without thumbnail
function ImageThumbnail({ 
  url, 
  filename, 
  size = 60,
  encryptionEnabled,
  thumbnailKey,
}: { 
  url: string; 
  filename: string; 
  size?: number
  encryptionEnabled?: boolean
  thumbnailKey?: string | null
}) {
  const [imgError, setImgError] = useState(false)
  
  // Determine which URL to use:
  // 1. If thumbnailKey is available (non-encrypted thumbnail), use it directly
  // 2. If no thumbnailKey but file is encrypted, show lock icon
  // 3. Otherwise use the main file URL
  const displayUrl = (() => {
    if (thumbnailKey) {
      // Non-encrypted thumbnail available - use R2 URL directly
      const publicBase = API_ENV.r2PublicBaseUrl?.trim() || ''
      const safeKey = thumbnailKey.startsWith('/') ? thumbnailKey.slice(1) : thumbnailKey
      if (publicBase) {
        const base = publicBase.endsWith('/') ? publicBase.slice(0, -1) : publicBase
        return `${base}/${safeKey}`
      } else {
        const base = API_ENV.apiBaseUrl?.trim() || ''
        const normalized = base.endsWith('/') ? base.slice(0, -1) : base
        return `${normalized}/api/image/${encodeURIComponent(safeKey)}`
      }
    }
    // No thumbnail - use main URL
    return url
  })()

  // Show lock if encrypted without thumbnail
  const showLock = encryptionEnabled && !thumbnailKey

  const handleImageError = () => {
    if (!imgError) {
      setImgError(true)
    }
  }

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {showLock ? (
        <LockIcon sx={{ fontSize: size * 0.5, color: 'text.secondary' }} />
      ) : (
        <img
          src={displayUrl}
          alt={filename}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={handleImageError}
        />
      )}
    </Box>
  )
}

// Video thumbnail component with play icon overlay
// Uses thumbnailKey for non-encrypted thumbnails
function VideoThumbnail({ 
  url, 
  thumbnailKey, 
  size = 60,
}: { 
  url: string; 
  thumbnailKey?: string | null; 
  size?: number
}) {
  // Determine which URL to use:
  // 1. If thumbnailKey is available (non-encrypted thumbnail), use it directly
  // 2. Otherwise use the main file URL
  const displayUrl = (() => {
    if (thumbnailKey) {
      // Non-encrypted thumbnail available - use R2 URL directly
      const publicBase = API_ENV.r2PublicBaseUrl?.trim() || ''
      const safeKey = thumbnailKey.startsWith('/') ? thumbnailKey.slice(1) : thumbnailKey
      if (publicBase) {
        const base = publicBase.endsWith('/') ? publicBase.slice(0, -1) : publicBase
        return `${base}/${safeKey}`
      } else {
        const base = API_ENV.apiBaseUrl?.trim() || ''
        const normalized = base.endsWith('/') ? base.slice(0, -1) : base
        return `${normalized}/api/image/${encodeURIComponent(safeKey)}`
      }
    }
    // No thumbnail - use main URL
    return url
  })()

  const showPlayIcon = !!displayUrl

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {showPlayIcon ? (
        <img
          src={displayUrl}
          alt="Video thumbnail"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <Avatar
          sx={{
            width: size * 0.8,
            height: size * 0.8,
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'inherit',
          }}
        >
          <VideoFileIcon />
        </Avatar>
      )}

      {/* Play icon overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.3)',
          transition: 'background-color 0.2s',
        }}
      >
        <PlayArrowIcon
          sx={{
            fontSize: size * 0.4,
            color: 'white',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          }}
        />
      </Box>

    </Box>
  )
}

// File item component with thumbnail or icon
function FileItem({
  obj,
  url,
  thumbnailUrl,
  onDelete,
  onPreview,
  onDownload,
  onPrivacyToggle,
  filePrivacySettings,
  canAccessFile,
  isDeleting,
  selected,
  onToggleSelect
}: {
  obj: { key: string; size?: number; thumbnailKey?: string | null; encryptionEnabled?: boolean; fileId?: string }
  url: string
  thumbnailUrl?: string
  onDelete: (key: string) => void
  onPreview: (key: string, url: string) => void
  onDownload: (key: string, filename: string) => void
  onPrivacyToggle: (key: string, filename: string) => void
  filePrivacySettings: Record<string, { restricted: boolean; allowedMembers: string[]; canAccess?: boolean }>
  canAccessFile: (key: string) => boolean
  isDeleting?: boolean
  selected?: boolean
  onToggleSelect?: (key: string) => void
}) {
  const filename = filenameFromKey(obj.key)
  const fileType = getFileType(filename)
  const isImage = fileType === 'image'
  const isVideo = fileType === 'video'
  const resolvedThumbnailKey = obj.thumbnailKey || (isVideo ? buildVideoThumbnailKeyFromFileKey(obj.key) : null)
  const hasAccess = canAccessFile(obj.key)
  const privacySettings = filePrivacySettings[obj.key]
  const isRestricted = privacySettings?.restricted
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <ListItem
      key={obj.key}
      onClick={() => hasAccess && url && onPreview(obj.key, url)}
      sx={{
        py: 1.5,
        px: 2,
        alignItems: 'center',
        gap: 2,
        borderRadius: 2,
        mb: 1,
        border: '1px solid',
        borderColor: selected ? 'primary.main' : (isDark ? 'rgba(255,255,255,0.08)' : theme.palette.divider),
        backgroundColor: isRestricted
          ? (isDark ? 'rgba(255,0,0,0.02)' : 'rgba(211, 47, 47, 0.04)')
          : (isDark ? 'rgba(255,255,255,0.02)' : theme.palette.background.paper),
        boxShadow: !isDark ? '0 2px 4px rgba(0,0,0,0.02)' : 'none',
        cursor: hasAccess && url ? 'pointer' : 'default',
        opacity: isRestricted && !hasAccess ? 0.6 : 1,
        '&:hover': {
          backgroundColor: hasAccess
            ? (isDark ? 'rgba(255,255,255,0.05)' : alpha(theme.palette.primary.main, 0.04))
            : (isDark ? 'rgba(255,0,0,0.05)' : 'rgba(211, 47, 47, 0.08)'),
        },
      }}
    >
      {onToggleSelect && (
        <Checkbox
          checked={!!selected}
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect(obj.key)
          }}
          sx={{ p: 0, mr: 1 }}
        />
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
        {isImage && url && hasAccess ? (
          <Box sx={{ position: 'relative' }}>
            <ImageThumbnail url={url} filename={filename} encryptionEnabled={obj.encryptionEnabled} thumbnailKey={obj.thumbnailKey} />
            <ThumbnailTypeBadge fileType={fileType} size={14} />
            {isRestricted && !hasAccess && (
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1,
              }}>
                <LockIcon sx={{ fontSize: 24, color: 'white' }} />
              </Box>
            )}
          </Box>
        ) : isVideo && hasAccess ? (
          <Box sx={{ position: 'relative' }}>
            <VideoThumbnail url={thumbnailUrl || ''} thumbnailKey={resolvedThumbnailKey} />
            <ThumbnailTypeBadge fileType={fileType} size={14} />
            {isRestricted && !hasAccess && (
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1,
              }}>
                <LockIcon sx={{ fontSize: 24, color: 'white' }} />
              </Box>
            )}
          </Box>
        ) : (
          <Avatar
            sx={{
              width: 48,
              height: 48,
              backgroundColor: isRestricted ? 'rgba(255,0,0,0.1)' : 'rgba(255,255,255,0.1)',
              color: 'inherit',
            }}
          >
            {isRestricted ? <LockIcon /> : getFileIcon(fileType)}
          </Avatar>
        )}
        <Box sx={{ minWidth: 0, maxWidth: 300, display: "flex", flexDirection: "column" }}>
          <Typography variant="body2" sx={{ wordBreak: 'break-word', opacity: 0.92, fontWeight: 500 }}>
            {filename}
          </Typography>
          {obj.size && (
            <Typography variant="caption" sx={{ opacity: 0.7, textAlign: "start" }}>
              {fmtBytes(obj.size)}
            </Typography>
          )}
          {isRestricted && (
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', color: 'error.main' }}>
              محدود الوصول
            </Typography>
          )}
        </Box>
      </Box>

      {url && (
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title="إعدادات الخصوصية">
            <Button
              size="small"
              variant="text"
              onClick={(e) => {
                e.stopPropagation()
                onPrivacyToggle(obj.key, filename)
              }}
              sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
            >
              <LockIcon sx={{ fontSize: 16, color: isRestricted ? 'error.main' : 'text.secondary' }} />
            </Button>
          </Tooltip>
          <Tooltip title="تنزيل">
            <Button
              size="small"
              variant="text"
              onClick={(e) => {
                e.stopPropagation()
                onDownload(obj.key, filename)
              }}
              disabled={!hasAccess}
              sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
            >
              <DownloadIcon />
            </Button>
          </Tooltip>
          <CopyLinkButton url={url} />
          <Tooltip title="حذف">
            <Button
              size="small"
              variant="text"
              onClick={(e) => {
                e.stopPropagation()
                void onDelete(obj.key)
              }}
              disabled={isDeleting}
              sx={{ borderRadius: 999, minWidth: 'auto', p: 1, color: '#666' }}
            >
              {isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
            </Button>
          </Tooltip>
        </Box>
      )}
    </ListItem>
  )
}

// Grid view file item component
function FileItemGrid({
  obj,
  url,
  thumbnailUrl,
  onDelete,
  onPreview,
  onDownload,
  onPrivacyToggle,
  filePrivacySettings,
  canAccessFile,
  isDeleting,
  selected,
  onToggleSelect
}: {
  obj: { key: string; size?: number; thumbnailKey?: string | null; encryptionEnabled?: boolean }
  url: string
  thumbnailUrl?: string
  onDelete: (key: string) => void
  onPreview: (key: string, url: string) => void
  onDownload: (key: string, filename: string) => void
  onPrivacyToggle: (key: string, filename: string) => void
  filePrivacySettings: Record<string, { restricted: boolean; allowedMembers: string[]; canAccess?: boolean }>
  canAccessFile: (key: string) => boolean
  isDeleting?: boolean
  selected?: boolean
  onToggleSelect?: (key: string) => void
}) {
  const filename = filenameFromKey(obj.key)
  const fileType = getFileType(filename)
  const isImage = fileType === 'image'
  const isVideo = fileType === 'video'
  const resolvedThumbnailKey = obj.thumbnailKey || (isVideo ? buildVideoThumbnailKeyFromFileKey(obj.key) : null)
  const hasAccess = canAccessFile(obj.key)
  const privacySettings = filePrivacySettings[obj.key]
  const isRestricted = privacySettings?.restricted
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Card
      onClick={() => hasAccess && url && onPreview(obj.key, url)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        border: '1px solid',
        borderColor: selected ? 'primary.main' : (isDark ? 'rgba(255,255,255,0.08)' : theme.palette.divider),
        backgroundColor: isRestricted
          ? (isDark ? 'rgba(211, 47, 47, 0.12)' : 'rgba(211, 47, 47, 0.08)')
          : (isDark ? 'rgba(255,255,255,0.02)' : theme.palette.background.paper),
        boxShadow: !isDark ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
        cursor: hasAccess && url ? 'pointer' : 'default',
        opacity: isRestricted && !hasAccess ? 0.6 : 1,
        '&:hover': {
          backgroundColor: hasAccess
            ? (isDark ? 'rgba(255,255,255,0.05)' : alpha(theme.palette.primary.main, 0.04))
            : (isDark ? 'rgba(211, 47, 47, 0.15)' : 'rgba(211, 47, 47, 0.12)'),
        },
      }}
    >
      {onToggleSelect && (
        <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}>
          <Checkbox
            checked={!!selected}
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelect(obj.key)
            }}
            sx={{ p: 0 }}
          />
        </Box>
      )}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 120, position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {isImage && url && hasAccess ? (
            <Box sx={{ position: 'relative' }}>
              <ImageThumbnail url={url} filename={filename} size={60} encryptionEnabled={obj.encryptionEnabled} thumbnailKey={obj.thumbnailKey} />
              <ThumbnailTypeBadge fileType={fileType} size={14} />
              {isRestricted && !hasAccess && (
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1,
                }}>
                  <LockIcon sx={{ fontSize: 20, color: 'white' }} />
                </Box>
              )}
            </Box>
          ) : isVideo && hasAccess ? (
            <Box sx={{ position: 'relative' }}>
              <VideoThumbnail url={thumbnailUrl || ''} thumbnailKey={resolvedThumbnailKey} size={60} />
              <ThumbnailTypeBadge fileType={fileType} size={14} />
              {isRestricted && !hasAccess && (
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1,
                }}>
                  <LockIcon sx={{ fontSize: 20, color: 'white' }} />
                </Box>
              )}
            </Box>
          ) : (
            <Avatar
              sx={{
                width: 48,
                height: 48,
                backgroundColor: isRestricted ? 'rgba(211, 47, 47, 0.1)' : 'rgba(0,0,0,0.05)',
                color: isRestricted ? 'error.main' : 'text.secondary',
              }}
            >
              {isRestricted ? <LockIcon /> : getFileIcon(fileType)}
            </Avatar>
          )}
          <Box sx={{ minWidth: 0, maxWidth: 120, flex: 1 }}>
            <Typography variant="body2" sx={{ wordBreak: 'break-word', opacity: 0.92, fontWeight: 500, fontSize: '0.75rem', lineHeight: 1.2 }}>
              {filename}
            </Typography>
          </Box>
        </Box>
        {obj.size && (
          <Typography
            variant="caption"
            sx={{
              opacity: 0.7,
              textAlign: 'center'
            }}
          >
            {fmtBytes(obj.size)}
          </Typography>
        )}
        {isRestricted && (
          <Typography
            variant="caption"
            sx={{
              opacity: 0.7,
              textAlign: 'center',
              color: 'error.main'
            }}
          >
            محدود الوصول
          </Typography>
        )}
      </Box>

      {url && (
        <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'center' }}>
          <Tooltip title="إعدادات الخصوصية">
            <Button
              size="small"
              variant="text"
              onClick={(e) => {
                e.stopPropagation()
                onPrivacyToggle(obj.key, filename)
              }}
              sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
            >
              <LockIcon sx={{ fontSize: 16, color: isRestricted ? 'error.main' : 'text.secondary' }} />
            </Button>
          </Tooltip>
          <Tooltip title="تنزيل">
            <Button
              size="small"
              variant="text"
              onClick={(e) => {
                e.stopPropagation()
                onDownload(obj.key, filename)
              }}
              disabled={!hasAccess}
              sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
            >
              <DownloadIcon />
            </Button>
          </Tooltip>
          <CopyLinkButton url={url} />
          <Tooltip title="حذف">
            <Button
              size="small"
              variant="text"
              onClick={(e) => {
                e.stopPropagation()
                void onDelete(obj.key)
              }}
              disabled={isDeleting}
              sx={{ borderRadius: 999, minWidth: 'auto', p: 1, color: '#666' }}
            >
              {isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
            </Button>
          </Tooltip>
        </Box>
      )}
    </Card>
  )
}

// Trash file item component
function TrashFileItem({
  file,
  onRestore,
  selected,
  onToggleSelect
}: {
  file: any
  onRestore: (key: string) => void
  selected?: boolean
  onToggleSelect?: (key: string) => void
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const filename = file.filename
  const fileType = getFileType(filename)
  const deletedDate = file.deletedAt ? new Date(file.deletedAt).toLocaleDateString('ar-SA') : ''
  const permanentDeleteDate = file.permanentDeleteAt ? new Date(file.permanentDeleteAt).toLocaleDateString('ar-SA') : ''
  const deletedBy = file.deletedBy
  const isImage = fileType === 'image'
  const isVideo = fileType === 'video'

  // Build thumbnail URL for trashed files
  const buildTrashThumbnailUrl = () => {
    if (!file.originalKey) return null
    const baseUrl = API_ENV.apiBaseUrl?.trim() || ''
    if (isImage) {
      return `${baseUrl}/api/image/${encodeURIComponent(file.originalKey)}`
    }
    if (isVideo) {
      const videoThumbnailKey = buildVideoThumbnailKeyFromFileKey(file.originalKey)
      return videoThumbnailKey ? `${baseUrl}/api/image/${encodeURIComponent(videoThumbnailKey)}` : null
    }
    return null
  }

  const thumbnailUrl = buildTrashThumbnailUrl()

  return (
    <ListItem
      key={file.id}
      sx={{
        py: 1.5,
        px: 2,
        alignItems: 'center',
        gap: 2,
        borderRadius: 2,
        mb: 1,
        border: '1px solid',
        borderColor: selected ? 'primary.main' : (isDark ? 'rgba(255,255,255,0.08)' : theme.palette.divider),
        backgroundColor: isDark ? 'rgba(211, 47, 47, 0.12)' : 'rgba(211, 47, 47, 0.08)',
        '&:hover': {
          backgroundColor: isDark ? 'rgba(211, 47, 47, 0.15)' : 'rgba(211, 47, 47, 0.12)',
        },
      }}
    >
      {onToggleSelect && (
        <Checkbox
          checked={!!selected}
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect(file.originalKey)
          }}
          sx={{ p: 0, mr: 1 }}
        />
      )}
      {/* Thumbnail or icon */}
      {isImage && thumbnailUrl ? (
        <Box sx={{ position: 'relative' }}>
          <ImageThumbnail url={thumbnailUrl} filename={filename} />
          <ThumbnailTypeBadge fileType={fileType} size={14} />
        </Box>
      ) : isVideo && thumbnailUrl ? (
        <Box sx={{ position: 'relative' }}>
          <VideoThumbnail url={thumbnailUrl} thumbnailKey={buildVideoThumbnailKeyFromFileKey(file.originalKey)} />
          <ThumbnailTypeBadge fileType={fileType} size={14} />
        </Box>
      ) : (
        <Avatar
          sx={{
            width: 48,
            height: 48,
            backgroundColor: isDark ? 'rgba(211, 47, 47, 0.12)' : 'rgba(211, 47, 47, 0.08)',
            color: 'error.main',
          }}
        >
          {getFileIcon(fileType)}
        </Avatar>
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ wordBreak: 'break-word', opacity: 0.92, fontWeight: 500 }}>
          {filename}
        </Typography>

        {/* Deleted by information */}
        {deletedBy && (
          <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', color: 'primary.main' }}>
            حذف بواسطة: {deletedBy.name} {deletedBy.isAdmin ? '(مدير)' : '(عضو)'}
          </Typography>
        )}

        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          تم الحذف: {deletedDate} | سيتم الحذف النهائي: {permanentDeleteDate}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
        <Tooltip title="استعادة">
          <Button
            size="small"
            variant="text"
            onClick={() => void onRestore(file.originalKey)}
            sx={{ borderRadius: 999, minWidth: 'auto', p: 1, color: 'success.main' }}
          >
            <RestoreIcon />
          </Button>
        </Tooltip>
      </Box>
    </ListItem>
  )
}

// File preview modal component
function FilePreviewModal({
  open,
  file,
  onClose
}: {
  open: boolean
  file: { key: string; url: string; filename: string; type: string } | null
  onClose: () => void
}) {
  if (!file) return null

  const renderPreview = () => {
    switch (file.type) {
      case 'image':
        return (
          <Box sx={{ textAlign: 'center' }}>
            <img
              src={file.url}
              alt={file.filename}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
              }}
            />
          </Box>
        )

      case 'video':
        return (
          <Box sx={{ textAlign: 'center' }}>
            <video
              controls
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
              }}
            >
              <source src={file.url} />
              متصفحك لا يدعم تشغيل الفيديو
            </video>
          </Box>
        )

      case 'audio':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <audio controls style={{ width: '100%' }}>
              <source src={file.url} />
              متصفحك لا يدعم تشغيل الصوت
            </audio>
            <Typography variant="body2" sx={{ mt: 2, opacity: 0.7 }}>
              {file.filename}
            </Typography>
          </Box>
        )

      default:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'inherit',
                mx: 'auto',
                mb: 2,
              }}
            >
              {getFileIcon(file.type)}
            </Avatar>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {file.filename}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>
              لا يمكن معاينة هذا النوع من الملفات
            </Typography>
            <Button
              variant="contained"
              href={file.url}
              target="_blank"
              rel="noreferrer"
              sx={{ borderRadius: 999 }}
            >
              فتح الملف
            </Button>
          </Box>
        )
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'background.default',
          backgroundImage: 'none',
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body1" sx={{ fontSize: '1.25rem', fontWeight: 500 }}>معاينة: {file.filename}</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ minHeight: 300, display: 'flex', alignItems: 'center' }}>
        {renderPreview()}
      </DialogContent>
    </Dialog>
  )
}

// Folder item component
function FolderItem({
  folderPath,
  onClick,
  onDelete,
  onDownload,
  isDeleting
}: {
  folderPath: string
  onClick: () => void
  onDelete: (folderPath: string) => void
  onDownload: (folderPath: string) => void
  isDeleting?: boolean
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const name = folderPath.split('/').filter(Boolean).pop() || folderPath

  return (
    <ListItem
      sx={{
        py: 1.5,
        px: 2,
        borderRadius: 2,
        mb: 1,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.palette.divider,
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : theme.palette.background.paper,
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : alpha(theme.palette.primary.main, 0.04),
        },
      }}
    >
      <Box
        onClick={onClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flex: 1,
          cursor: 'pointer'
        }}
      >
        <Avatar
          sx={{
            width: 48,
            height: 48,
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'inherit',
          }}
        >
          <FolderIcon />
        </Avatar>
        <Box sx={{ minWidth: 0, maxWidth: 300, justifyContent: "center", display: "flex", flexDirection: "column" }}>
          <Typography variant="body2" sx={{ wordBreak: 'break-word', opacity: 0.92, fontWeight: 500 }}>
            {name}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7, textAlign: "start" }}>
            مجلد
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
        <Tooltip title="تنزيل المجلد">
          <Button
            size="small"
            variant="text"
            onClick={(e) => {
              e.stopPropagation()
              onDownload(folderPath)
            }}
            sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
          >
            <DownloadIcon />
          </Button>
        </Tooltip>
        <Tooltip title="حذف المجلد">
          <Button
            size="small"
            variant="text"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(folderPath)
            }}
            disabled={isDeleting}
            sx={{ borderRadius: 999, minWidth: 'auto', p: 1, color: '#666' }}
          >
            {isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          </Button>
        </Tooltip>
      </Box>
    </ListItem>
  )
}

// Grid view folder item component
function FolderItemGrid({
  folderPath,
  onClick,
  onDelete,
  onDownload,
  isDeleting
}: {
  folderPath: string
  onClick: () => void
  onDelete: (folderPath: string) => void
  onDownload: (folderPath: string) => void
  isDeleting?: boolean
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const name = folderPath.split('/').filter(Boolean).pop() || folderPath

  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.palette.divider,
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : theme.palette.background.paper,
        boxShadow: !isDark ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : alpha(theme.palette.primary.main, 0.04),
        },
      }}
    >
      <Box
        onClick={onClick}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          cursor: 'pointer'
        }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 120 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'inherit',
              }}
            >
              <FolderIcon />
            </Avatar>
            <Box sx={{ minWidth: 0, maxWidth: 120, flex: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  wordBreak: 'break-word',
                  opacity: 0.92,
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  lineHeight: 1.2
                }}
              >
                {name}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.7,
                  display: 'block'
                }}
              >
                مجلد
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 0.5, justifyContent: 'center' }}>
        <Tooltip title="تنزيل المجلد">
          <Button
            size="small"
            variant="text"
            onClick={(e) => {
              e.stopPropagation()
              onDownload(folderPath)
            }}
            sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
          >
            <DownloadIcon />
          </Button>
        </Tooltip>
        <Tooltip title="حذف المجلد">
          <Button
            size="small"
            variant="text"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(folderPath)
            }}
            disabled={isDeleting}
            sx={{ borderRadius: 999, minWidth: 'auto', p: 1, color: '#666' }}
          >
            {isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          </Button>
        </Tooltip>
      </Box>
    </Card>
  )
}

function validateFileQuality(file: File): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = []

  // Check for common file types and their quality indicators
  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  // Image quality checks
  if (['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(extension)) {
    // For images, we'll check size as a basic quality indicator
    if (file.size < 10000) { // Less than 10KB might be low quality
      warnings.push('حجم الصورة صغير جداً قد يكون جودته منخفضة')
    }
  }

  // Video quality checks
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) {
    if (file.size < 100000) { // Less than 100KB for video is very small
      warnings.push('حجم الفيديو صغير جداً قد يكون جودته منخفضة')
    }
  }

  // Audio quality checks
  if (['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(extension)) {
    if (file.size < 50000) { // Less than 50KB for audio is very small
      warnings.push('حجم الملف الصوتي صغير جداً قد يكون جودته منخفضة')
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings
  }
}

// Copy link button component with feedback
function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000) // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  return (
    <Tooltip title={copied ? "تم نسخ الرابط!" : "نسخ الرابط"}>
      <Button
        size="small"
        variant="text"
        onClick={(e) => {
          e.stopPropagation()
          void handleCopy()
        }}
        sx={{
          borderRadius: 999,
          minWidth: 'auto',
          p: 1,
          color: copied ? 'success.main' : 'text.primary'
        }}
      >
        {copied ? (
          <CheckIcon />
        ) : (
          <LinkIcon
            sx={{
              transform: 'rotate(-45deg)',
              color: 'text.secondary'
            }}
          />
        )}
      </Button>
    </Tooltip>
  )
}

async function handleDownload(key: string, filename: string) {
  try {
    const base = API_ENV.apiBaseUrl?.trim() || ''
    const token = localStorage.getItem('larthaa_auth_token')

    if (!base) {
      throw new Error('Missing API base URL')
    }

    if (!token) {
      throw new Error('Missing auth token')
    }

    const normalized = base.endsWith('/') ? base.slice(0, -1) : base
    const downloadUrl = `${normalized}/api/download/direct?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = filename
    a.rel = 'noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } catch (error) {
    console.error('Download error:', error)
  }
}

export default function UploadPage() {
  const { user } = useAuth()

  const [selectedFiles, setSelectedFiles] = useState<SelectedUploadFile[]>([])
  const [encryptionPassword, setEncryptionPassword] = useState<string>('')
  // Explorer path under "uploads/". Examples: "" (root), "team1", "team1/sub1"
  const [currentPath, setCurrentPath] = useState('')
  const [foldersHere, setFoldersHere] = useState<string[]>([])
  const [filesHere, setFilesHere] = useState<Array<{ key: string; size?: number; lastModified?: string; createdAt?: string; updatedAt?: string; thumbnailKey?: string | null; fileId?: string; mimeType?: string; encryptionEnabled?: boolean; encryptionIv?: string; encryptionSalt?: string }>>([])
  const [hasMoreFiles, setHasMoreFiles] = useState(true)
  const [nextContinuationToken, setNextContinuationToken] = useState<string | null>(null)
  const [isLoadingMoreFiles, setIsLoadingMoreFiles] = useState(false)
  const [totalFileCount, setTotalFileCount] = useState<number | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const [uploading, setUploading] = useState(false)
  const [completedUploadedFiles, setCompletedUploadedFiles] = useState<Set<string>>(new Set())
  const [showToast, setShowToast] = useState(false)
  const [toastType, setToastType] = useState<'error' | 'success' | 'info'>('error')
  const [toastMessage, setToastMessage] = useState('')
  const [loadingExplorer, setLoadingExplorer] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [trashFiles, setTrashFiles] = useState<Array<any>>([])
  const [loadingTrash, setLoadingTrash] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ key: string; url: string; filename: string; type: string } | null>(null)
  const [encryptedViewerOpen, setEncryptedViewerOpen] = useState(false)
  const [encryptedViewerFile, setEncryptedViewerFile] = useState<{ fileId: string; filename: string; mimeType?: string; size?: number; encryptionEnabled?: boolean; encryptionIv?: string; encryptionSalt?: string } | null>(null)

  // Folder creation state
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

  // Privacy controls state
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [selectedFileForPrivacy, setSelectedFileForPrivacy] = useState<{ key: string; filename: string } | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; email: string; name?: string; user?: { name: string; email: string } }>>([])
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false)
  const [filePrivacySettings, setFilePrivacySettings] = useState<Record<string, { restricted: boolean; allowedMembers: string[]; canAccess?: boolean }>>({})

  // Deletion loading states
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set())
  const [deletingFolders, setDeletingFolders] = useState<Set<string>>(new Set())

  // Filter and sort state
  const [fileFilter, setFileFilter] = useState<'all' | 'images' | 'videos' | 'documents'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date')
  const sortOrder = 'asc' // Fixed sort order since setSortOrder is unused

  // Bulk selection state
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const canUpload = useMemo(() => selectedFiles.length > 0 && !uploading, [selectedFiles, uploading])

  // Helper function to show toast notifications
  const showToastNotification = useCallback((message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
  }, [])

  // Helper function to close toast
  const closeToast = useCallback(() => {
    setShowToast(false)
    setToastMessage('')
  }, [])

  // Filtered and sorted files
  const filteredAndSortedFiles = useMemo(() => {
    const filtered = filterFiles(filesHere)
    const sorted = sortFiles(filtered)
    return sorted
  }, [filesHere, fileFilter, sortBy, sortOrder])

  // Auto-upload when files are selected (but not during initial render)
  const [hasTriggeredUpload, setHasTriggeredUpload] = useState(false)

  useEffect(() => {
    if (canUpload && selectedFiles.length > 0 && !hasTriggeredUpload) {
      setHasTriggeredUpload(true)
      void handleUpload()
    } else if (selectedFiles.length === 0) {
      setHasTriggeredUpload(false)
    }
  }, [canUpload, selectedFiles.length, hasTriggeredUpload])

  useEffect(() => {
    const loadWorkspaceKey = async () => {
      try {
        const res = await getWorkspaceEncryptionKey()
        if (res.ok && res.key) {
          // Convert Node.js base64 to standard base64 for browser compatibility
          const standardBase64 = res.key
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
          setEncryptionPassword(standardBase64)
        }
      } catch (error) {
        console.error('Failed to load workspace encryption key', error)
      }
    }

    void loadWorkspaceKey()
  }, [])

  const ROOT_PREFIX = useMemo(() => {
    const workspaceId = user?.workspaceId?.trim()
    return workspaceId ? `uploads/${workspaceId}` : 'uploads'
  }, [user?.workspaceId])
  const explorerPrefix = currentPath.trim()
    ? `${ROOT_PREFIX}/${currentPath.trim()}`
    : ROOT_PREFIX

  const [folderNameError, setFolderNameError] = useState<string | null>(null)

  async function handleUpload() {
    setFolderNameError(null)

    if (selectedFiles.length === 0) {
      showToastNotification('يرجى اختيار ملفات أو مجلد للرفع.', 'error')
      return
    }

    // Validate file quality
    const qualityWarnings: string[] = []
    selectedFiles.forEach(sf => {
      const validation = validateFileQuality(sf.file)
      if (!validation.isValid) {
        qualityWarnings.push(...validation.warnings)
      }
    })

    if (qualityWarnings.length > 0) {
      const warningMessage = `تحذيرات الجودة:\n${qualityWarnings.join('\n')}\n\nهل تريد المتابعة في الرفع؟`
      if (!confirm(warningMessage)) {
        return
      }
    }

    setUploading(true)

    try {
      const hasFolderStructure = selectedFiles.some(sf => sf.relativePath.includes('/'))
      let rootFolderName = ''

      if (hasFolderStructure) {
        // Extract the root folder name from the first file that has a path
        const firstFileWithPath = selectedFiles.find(sf => sf.relativePath.includes('/'))
        if (firstFileWithPath) {
          rootFolderName = firstFileWithPath.relativePath.split('/')[0]
        }
      }

      // Filter out already completed files before uploading
      const filesToUpload = selectedFiles
        .filter(sf => !completedUploadedFiles.has(sf.file.name))
        .map(sf => {
          const encryptionResult = sf.encryptionResult
          // For simple encryption (small files), encryptionResult has encryptedData, iv, salt
          // For chunked encryption (large files), encryptionResult has encryptedChunks, iv, salt
          const hasEncryption = !!encryptionResult
          const iv = encryptionResult?.iv
          const salt = encryptionResult?.salt
          return {
            file: sf.uploadFile ?? sf.file,
            relativePath: sf.relativePath,
            encryptionEnabled: hasEncryption,
            encryptionIv: iv,
            encryptionSalt: salt,
          }
        })

      const res = await uploadFilesStreamed(filesToUpload, {
        batchName: explorerPrefix,
        ...(rootFolderName ? { folderName: rootFolderName } : {}),
        skipFiles: completedUploadedFiles,
        onUploadProgress: () => {}
      })

      const uploaded = res.uploaded ?? []

      // Track uploaded files for resume
      uploaded.forEach(item => {
        setCompletedUploadedFiles(prev => new Set(prev).add(item.key))
      })

      const count = uploaded.length
      showToastNotification(`تم الرفع بنجاح. عدد الملفات: ${count}`, 'success')
      setSelectedFiles([])
      setCompletedUploadedFiles(new Set())
      // Keep selected destination so user can keep uploading.

      // Refresh explorer after upload.
      void fetchExplorer()
    } catch (e: unknown) {
      const err = e as {
        message?: string
        response?: { data?: { message?: string; error?: string }; status?: number }
      }
      const backendMsg = err.response?.data?.message ?? err.response?.data?.error

      // Handle specific folder conflict error
      if (err.response?.status === 409) {
        showToastNotification('مجلد بهذا الاسم موجود بالفعل. يرجى استخدام اسم مختلف.', 'error')
      } else {
        showToastNotification(`فشل الرفع: ${backendMsg ?? err.message ?? 'خطأ غير معروف'}`, 'error')
      }
    } finally {
      setUploading(false)
      setHasTriggeredUpload(false) // Reset for next upload
    }
  }

  async function handleDelete(key: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الملف؟ سيتم نقله إلى سلة المهملات وحذفه نهائياً بعد 7 أيام.')) {
      return
    }

    setDeletingFiles(prev => new Set(prev).add(key))
    try {
      await moveFileToTrash(key)
      showToastNotification('تم نقل الملف إلى سلة المهملات بنجاح', 'success')
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      showToastNotification(`فشل حذف الملف: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`, 'error')
    } finally {
      setDeletingFiles(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  async function handleRestore(key: string) {
    if (!confirm('هل أنت متأكد من استعادة هذا الملف؟')) {
      return
    }

    try {
      await restoreFileFromTrash(key)
      showToastNotification('تم استعادة الملف بنجاح', 'success')
      await fetchTrashFiles()
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      showToastNotification(`فشل استعادة الملف: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`, 'error')
    }
  }

  // Bulk selection handlers
  function toggleFileSelection(key: string) {
    setSelectedForBulk(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function selectAllFiles() {
    const allKeys = filteredAndSortedFiles.map(f => f.key)
    setSelectedForBulk(new Set(allKeys))
  }

  function clearSelection() {
    setSelectedForBulk(new Set())
  }

  async function handleBulkDelete() {
    if (selectedForBulk.size === 0) return
    if (!confirm(`هل أنت متأكد من حذف ${selectedForBulk.size} ملفات؟ سيتم نقلها إلى سلة المهملات.`)) {
      return
    }

    setBulkLoading(true)
    try {
      const keys = Array.from(selectedForBulk)
      await bulkMoveToTrash(keys)
      showToastNotification(`تم نقل ${keys.length} ملفات إلى سلة المهملات`, 'success')
      setSelectedForBulk(new Set())
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      showToastNotification(`فشل حذف الملفات: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`, 'error')
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleBulkDownload() {
    if (selectedForBulk.size === 0) return

    const keys = Array.from(selectedForBulk)
    showToastNotification(`جاري تنزيل ${keys.length} ملفات...`, 'info')
    
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const filename = filenameFromKey(key)
      try {
        await handleDownload(key, filename)
        // Add small delay between downloads to prevent browser blocking
        if (i < keys.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`Failed to download ${filename}:`, error)
      }
    }
    
    showToastNotification(`تم بدء تنزيل ${keys.length} ملفات`, 'success')
  }

  async function handleBulkRestore() {
    if (selectedForBulk.size === 0) return
    if (!confirm(`هل أنت متأكد من استعادة ${selectedForBulk.size} ملفات؟`)) {
      return
    }

    setBulkLoading(true)
    try {
      const keys = Array.from(selectedForBulk)
      await bulkRestoreFromTrash(keys)
      showToastNotification(`تم استعادة ${keys.length} ملفات بنجاح`, 'success')
      setSelectedForBulk(new Set())
      await fetchTrashFiles()
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      showToastNotification(`فشل استعادة الملفات: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`, 'error')
    } finally {
      setBulkLoading(false)
    }
  }

  const fetchTrashFiles = useCallback(async () => {
    setLoadingTrash(true)
    try {
      const res = await listTrashFiles()
      setTrashFiles(res.files || [])
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      showToastNotification(`فشل جلب ملفات المهملات: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`, 'error')
    } finally {
      setLoadingTrash(false)
    }
  }, [])

  useEffect(() => {
    if (showTrash) {
      void fetchTrashFiles()
    }
  }, [showTrash, fetchTrashFiles])

  function handlePreview(key: string, url: string) {
    const filename = filenameFromKey(key)
    const fileType = getFileType(filename)

    const fileMeta = filesHere.find(file => file.key === key)
    if (fileMeta?.encryptionEnabled && fileMeta.fileId && fileMeta.encryptionIv && fileMeta.encryptionSalt) {
      setEncryptedViewerFile({
        fileId: fileMeta.fileId,
        filename,
        mimeType: fileMeta.mimeType,
        size: fileMeta.size,
        encryptionEnabled: fileMeta.encryptionEnabled,
        encryptionIv: fileMeta.encryptionIv,
        encryptionSalt: fileMeta.encryptionSalt,
      })
      setEncryptedViewerOpen(true)
      return
    }

    setPreviewFile({ key, url, filename, type: fileType })
    setPreviewModalOpen(true)
  }

  function handleClosePreview() {
    setPreviewModalOpen(false)
    setPreviewFile(null)
  }

  function handleCloseEncryptedViewer() {
    setEncryptedViewerOpen(false)
    setEncryptedViewerFile(null)
  }

  function handleDownloadFile(key: string, filename: string) {
    const fileMeta = filesHere.find(file => file.key === key)
    if (fileMeta?.encryptionEnabled && fileMeta.fileId && fileMeta.encryptionIv && fileMeta.encryptionSalt) {
      setEncryptedViewerFile({
        fileId: fileMeta.fileId,
        filename,
        mimeType: fileMeta.mimeType,
        size: fileMeta.size,
        encryptionEnabled: fileMeta.encryptionEnabled,
        encryptionIv: fileMeta.encryptionIv,
        encryptionSalt: fileMeta.encryptionSalt,
      })
      setEncryptedViewerOpen(true)
      return
    }

    void handleDownload(key, filename)
  }

  // Folder creation functions
  async function handleCreateFolder() {
    const trimmedName = newFolderName.trim()

    // Client-side validation
    if (!trimmedName) {
      showToastNotification('يرجى إدخال اسم المجلد', 'error')
      return
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/
    if (invalidChars.test(trimmedName)) {
      showToastNotification('اسم المجلد يحتوي على أحرف غير صالحة: < > : " / \\ | ? *', 'error')
      return
    }

    // Check for names that start or end with dots or spaces
    if (trimmedName.startsWith('.') || trimmedName.startsWith(' ') ||
      trimmedName.endsWith('.') || trimmedName.endsWith(' ')) {
      showToastNotification('اسم المجلد لا يمكن أن يبدأ أو ينتهي بنقطة أو مسافة', 'error')
      return
    }

    // Check for reserved names
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
    if (reservedNames.includes(trimmedName.toUpperCase())) {
      showToastNotification('اسم المجلد محجوز. يرجى استخدام اسم مختلف.', 'error')
      return
    }

    // Check length
    if (trimmedName.length > 255) {
      showToastNotification('اسم المجلد طويل جداً. الحد الأقصى هو 255 حرفًا.', 'error')
      return
    }

    // Check for duplicate folder names in current location
    const existingFolders = foldersHere.map(folder => {
      const cleaned = folder.endsWith('/') ? folder.slice(0, -1) : folder
      return cleaned.split('/').pop() || cleaned
    })

    if (existingFolders.includes(trimmedName)) {
      showToastNotification('مجلد بهذا الاسم موجود بالفعل في هذا الموقع', 'error')
      return
    }

    setCreatingFolder(true)
    setFolderNameError(null)

    try {
      const folderPath = currentPath ? `${currentPath}/${trimmedName}` : trimmedName
      const token = localStorage.getItem('larthaa_auth_token')

      const response = await fetch(`${API_ENV.apiBaseUrl?.trim()}/api/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          name: trimmedName,
          path: folderPath,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          showToastNotification('مجلد بهذا الاسم موجود بالفعل في هذا الموقع', 'error')
        } else {
          showToastNotification(data.message || 'فشل إنشاء المجلد', 'error')
        }
        return
      }

      showToastNotification('تم إنشاء المجلد بنجاح', 'success')
      setNewFolderName('')
      setShowCreateFolderModal(false)
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string }
      showToastNotification(`فشل إنشاء المجلد: ${err.message || 'خطأ غير معروف'}`, 'error')
    } finally {
      setCreatingFolder(false)
    }
  }

  // Folder deletion function
  async function handleDeleteFolder(folderPath: string) {
    if (!confirm('هل أنت متأكد من أنك تريد حذف هذا المجلد وجميع محتوياته؟')) {
      return
    }

    setFolderNameError(null)
    setDeletingFolders(prev => new Set(prev).add(folderPath))
    try {
      const token = localStorage.getItem('larthaa_auth_token')

      const response = await fetch(`${API_ENV.apiBaseUrl?.trim()}/api/folders`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          path: folderPath,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete folder')
      }

      showToastNotification('تم حذف المجلد بنجاح', 'success')
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string }
      showToastNotification(`فشل حذف المجلد: ${err.message || 'خطأ غير معروف'}`, 'error')
    } finally {
      setDeletingFolders(prev => {
        const next = new Set(prev)
        next.delete(folderPath)
        return next
      })
    }
  }

  // Folder download function with polling for prebuilt ZIP
  async function handleDownloadFolder(folderPath: string) {
    try {
      const token = localStorage.getItem('larthaa_auth_token')
      const baseUrl = API_ENV.apiBaseUrl?.trim() || ''

      if (!token) {
        throw new Error('Missing auth token')
      }

      if (!baseUrl) {
        throw new Error('Missing API base URL')
      }

      const normalizedFolderPath = String(folderPath || '').replace(/^\/+|\/+$/g, '')
      const downloadUrl = `${baseUrl}/api/download/folder?path=${encodeURIComponent(normalizedFolderPath)}&token=${encodeURIComponent(token)}`

      showToastNotification('جاري تحضير ملف ZIP للمجلد...', 'info')

      // Poll for ZIP readiness
      let attempts = 0
      const maxAttempts = 30 // 30 seconds max

      while (attempts < maxAttempts) {
        const response = await fetch(downloadUrl)

        if (response.status === 200) {
          // ZIP is ready, trigger download
          const a = document.createElement('a')
          a.href = downloadUrl
          a.download = `${folderPath.split('/').pop() || 'folder'}.zip`
          a.rel = 'noreferrer'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          showToastNotification('بدأ تنزيل المجلد', 'success')
          return
        }

        if (response.status === 202) {
          // ZIP is being prepared, wait and retry
          await new Promise(resolve => setTimeout(resolve, 1000))
          attempts++
          continue
        }

        // Other error
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(errorData.message || 'فشل في تحضير المجلد')
      }

      throw new Error('انتهت مهلة تحضير المجلد. يرجى المحاولة مرة أخرى.')
    } catch (error) {
      console.error('Folder download error:', error)
      showToastNotification(`فشل تنزيل المجلد: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`, 'error')
    }
  }

  // Team members functions
  const fetchTeamMembers = useCallback(async () => {
    setLoadingTeamMembers(true)
    try {
      const response = await api.get('/api/workspace/members')
      setTeamMembers(response.data.members || [])
    } catch (e: unknown) {
      const err = e as { message?: string }
      console.error('Failed to fetch team members:', err.message)
    } finally {
      setLoadingTeamMembers(false)
    }
  }, [])

  useEffect(() => {
    void fetchTeamMembers()
  }, [fetchTeamMembers])

  // Privacy control functions
  function openPrivacyModal(fileKey: string, filename: string) {
    setSelectedFileForPrivacy({ key: fileKey, filename })
    const currentSettings = filePrivacySettings[fileKey]
    setSelectedMembers(currentSettings?.allowedMembers || [])
    setShowPrivacyModal(true)
  }

  async function savePrivacySettings() {
    if (!selectedFileForPrivacy) return

    try {
      const token = localStorage.getItem('larthaa_auth_token')

      const response = await fetch(`${API_ENV.apiBaseUrl?.trim()}/api/files/privacy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          fileKey: selectedFileForPrivacy.key,
          restricted: selectedMembers.length > 0,
          allowedMembers: selectedMembers,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save privacy settings')
      }

      setFilePrivacySettings(prev => ({
        ...prev,
        [selectedFileForPrivacy.key]: {
          restricted: selectedMembers.length > 0,
          allowedMembers: selectedMembers,
          canAccess: true,
        }
      }))

      showToastNotification('تم حفظ إعدادات الخصوصية', 'success')
      setShowPrivacyModal(false)
      setSelectedFileForPrivacy(null)
      setSelectedMembers([])
    } catch (e: unknown) {
      const err = e as { message?: string }
      showToastNotification(`فشل حفظ الإعدادات: ${err.message || 'خطأ غير معروف'}`, 'error')
    }
  }

  function toggleMemberSelection(memberId: string) {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  function canAccessFile(fileKey: string): boolean {
    const privacy = filePrivacySettings[fileKey]
    if (!privacy) return true
    return privacy.canAccess !== false
  }

  // Helper functions for filtering and sorting
  function getFileType(filename: string): 'image' | 'video' | 'document' | 'other' {
    const ext = filename.split('.').pop()?.toLowerCase() || ''

    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico']
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v']
    const documentExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp']

    if (imageExts.includes(ext)) return 'image'
    if (videoExts.includes(ext)) return 'video'
    if (documentExts.includes(ext)) return 'document'
    return 'other'
  }

  function filterFiles(files: Array<{ key: string; size?: number; lastModified?: string; createdAt?: string; updatedAt?: string; thumbnailKey?: string | null }>) {
    if (fileFilter === 'all') return files

    return files.filter(file => {
      const filename = file.key.split('/').pop() || ''
      const fileType = getFileType(filename)

      switch (fileFilter) {
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

  function sortFiles(files: Array<{ key: string; size?: number; lastModified?: string; createdAt?: string; updatedAt?: string; thumbnailKey?: string | null }>) {
    return [...files].sort((a, b) => {
      const filenameA = a.key.split('/').pop() || ''
      const filenameB = b.key.split('/').pop() || ''

      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = filenameA.localeCompare(filenameB)
          break
        case 'size':
          const sizeA = a.size || 0
          const sizeB = b.size || 0
          comparison = sizeA - sizeB
          break
        case 'date':
          // Use actual creation dates from database, fallback to lastModified, then key
          const dateA = getFileDate(a)
          const dateB = getFileDate(b)

          if (dateA && dateB) {
            comparison = dateB.getTime() - dateA.getTime() // Newer first (descending)
          } else if (dateA) {
            comparison = -1 // a has date, b doesn't, so a comes first
          } else if (dateB) {
            comparison = 1 // b has date, a doesn't, so b comes first
          } else {
            // Fallback: reverse alphabetical order on key (often works for timestamped uploads)
            comparison = b.key.localeCompare(a.key)
          }
          break
        default:
          comparison = 0
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  // Helper function to get the most reliable date for a file
  function getFileDate(file: { key: string; size?: number; lastModified?: string; createdAt?: string; updatedAt?: string }): Date | null {
    // Prefer database creation date
    if (file.createdAt) {
      return new Date(file.createdAt)
    }

    // Then try database updated date
    if (file.updatedAt) {
      return new Date(file.updatedAt)
    }

    // Then try S3 last modified date
    if (file.lastModified) {
      return new Date(file.lastModified)
    }

    // Finally, try to extract timestamp from filename as fallback
    return extractTimestampFromKey(file.key) ? new Date(extractTimestampFromKey(file.key)!) : null
  }

  // Helper function to extract timestamp from file key
  function extractTimestampFromKey(key: string): number | null {
    // Try to extract timestamp from common patterns
    // Example: uploads/folder/1640995200000_filename.jpg or uploads/folder/2022-01-01_filename.jpg

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

  const fetchExplorer = useCallback(async (reset: boolean = true, continuationTokenOverride?: string | null) => {
    if (reset) {
      setLoadingExplorer(true)
      setFilesHere([])
      setHasMoreFiles(true)
      setNextContinuationToken(null)
      setTotalFileCount(null)
    } else {
      setIsLoadingMoreFiles(true)
    }

    try {
      const limit = 50
      const continuationToken = reset ? undefined : (continuationTokenOverride || undefined)
      const res = await listUploadedObjects(explorerPrefix, limit, true, continuationToken)
      const visibleObjects = (res.objects ?? []).filter((obj) => !isHiddenChatUploadPath(obj.key))

      if (reset) {
        // Filter out system folders like workspace-assets and workspace-logo
        const filteredFolders = (res.folders ?? []).filter(folder => {
          const folderName = folder.split('/').filter(Boolean).pop()
          return folderName !== 'workspace-assets'
            && folderName !== 'workspace-logo'
            && !isHiddenChatUploadPath(folder)
            && !isHiddenChatRootFolder(folder, currentPath)
        })
        setFoldersHere(filteredFolders)
        setFilesHere(visibleObjects)
      } else {
        setFilesHere(prev => [...prev, ...visibleObjects])
      }

      setHasMoreFiles(res.pagination?.hasMore ?? false)
      setNextContinuationToken(res.pagination?.nextContinuationToken ?? null)

      // Store total file count from first page response
      if (reset && res.pagination?.totalFileCount !== undefined) {
        setTotalFileCount(res.pagination.totalFileCount)
      }

      // Fetch privacy settings for all files (only on reset or first load)
      if (reset || (!continuationToken && res.objects)) {
        const fileKeys = visibleObjects.map(obj => obj.key)
        if (fileKeys.length > 0) {
          try {
            const privacyRes = await fetchBulkPrivacySettings(fileKeys)
            if (privacyRes.settings) {
              setFilePrivacySettings(prev => ({ ...prev, ...privacyRes.settings }))
            }
          } catch (privacyError) {
            console.error('Failed to fetch privacy settings:', privacyError)
          }
        }
      }
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      showToastNotification(err.response?.data?.message ?? err.message ?? 'فشل جلب الملفات', 'error')
    } finally {
      if (reset) {
        setLoadingExplorer(false)
      } else {
        setIsLoadingMoreFiles(false)
      }
    }
  }, [currentPath, explorerPrefix])

  const loadMoreFiles = useCallback(async () => {
    if (!hasMoreFiles || isLoadingMoreFiles || loadingExplorer) return

    await fetchExplorer(false, nextContinuationToken)
  }, [hasMoreFiles, isLoadingMoreFiles, loadingExplorer, fetchExplorer, nextContinuationToken])

  // Infinite scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget

    // When user is within 200px of bottom, load more
    if (scrollHeight - scrollTop - clientHeight < 200) {
      void loadMoreFiles()
    }
  }, [loadMoreFiles])

  useEffect(() => {
    void fetchExplorer(true)
  }, [fetchExplorer])

  useEffect(() => {
    const unsubscribe = subscribeRealtime(
      (event) => {
        if (event.scope !== 'files') return
        if (event.action === 'upload_progress') return
        void fetchExplorer(true)
        if (showTrash) {
          void fetchTrashFiles()
        }
      },
      () => {
        // page stays usable even if realtime stream reconnects
      }
    )

    return unsubscribe
  }, [fetchExplorer, fetchTrashFiles, showTrash])

  function keyToPublicUrl(key: string) {
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

  const breadcrumbs = useMemo(() => {
    const parts = currentPath.split('/').filter(Boolean)
    const crumbs: Array<{ label: string; path: string }> = [{ label: 'uploads', path: '' }]
    const acc: string[] = []
    for (const seg of parts) {
      acc.push(seg)
      crumbs.push({ label: seg, path: acc.join('/') })
    }
    return crumbs
  }, [currentPath])

  return (
    <Box sx={{ height: '100%' }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <EncryptedUploadDropzone
          files={selectedFiles}
          onFilesChange={setSelectedFiles}
          uploading={uploading}
          encryptionPassword={encryptionPassword}
          onEncryptionPasswordRequest={() => {}}
          onUploadProgress={() => {}}
        />

        <Box sx={{ mt: 2 }}>
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>

            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Tooltip title="عرض قائمة">
                <Button
                  variant={viewMode === 'list' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('list')}
                  disabled={uploading || loadingExplorer}
                  sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
                >
                  <ViewListIcon />
                </Button>
              </Tooltip>
              <Tooltip title="عرض شبكة">
                <Button
                  variant={viewMode === 'grid' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('grid')}
                  disabled={uploading || loadingExplorer}
                  sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
                >
                  <ViewModuleIcon />
                </Button>
              </Tooltip>
              <Button
                variant="outlined"
                onClick={() => setShowTrash(!showTrash)}
                disabled={uploading}
                sx={{ borderRadius: 999 }}
              >
                {showTrash ? 'الملفات' : 'سلة المهملات'}
              </Button>

            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {/* Filter Dropdown */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="filter-label">تصفية</InputLabel>
                <Select
                  labelId="filter-label"
                  value={fileFilter}
                  onChange={(e) => setFileFilter(e.target.value as 'all' | 'images' | 'videos' | 'documents')}
                  disabled={uploading || loadingExplorer}
                  label="تصفية"
                >
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="images">الصور</MenuItem>
                  <MenuItem value="videos">الفيديو</MenuItem>
                  <MenuItem value="documents">المستندات</MenuItem>
                </Select>
              </FormControl>

              {/* Sort Dropdown */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="sort-label">ترتيب</InputLabel>
                <Select
                  labelId="sort-label"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'size')}
                  disabled={uploading || loadingExplorer}
                  label="ترتيب"
                >
                  <MenuItem value="date">
                    {sortBy === 'date' && sortOrder === 'asc' ? 'الأحدث' : 'التاريخ'}
                  </MenuItem>
                  <MenuItem value="name">الاسم</MenuItem>
                  <MenuItem value="size">الحجم</MenuItem>
                </Select>
              </FormControl>


              <Button
                variant="outlined"
                onClick={() => setShowCreateFolderModal(true)}
                disabled={uploading || loadingExplorer}
                endIcon={<CreateNewFolderIcon />}
                sx={{ borderRadius: 999, gap: 1, }}
              >
                <span className='hidden md:inline'>
                  إنشاء مجلد
                </span>
              </Button>
            </Box>
          </Box>

          {/* Bulk Action Toolbar */}
          {selectedForBulk.size > 0 && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              borderRadius: 2, 
              bgcolor: 'primary.50',
              border: '1px solid',
              borderColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {selectedForBulk.size} عنصر محدد
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="outlined"
                size="small"
                onClick={clearSelection}
                sx={{ borderRadius: 999 }}
              >
                إلغاء التحديد
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SelectAllIcon />}
                onClick={selectAllFiles}
                sx={{ borderRadius: 999 }}
              >
                تحديد الكل
              </Button>
              {!showTrash && (
                <>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleBulkDownload}
                    disabled={bulkLoading}
                    sx={{ borderRadius: 999 }}
                  >
                    تنزيل ({selectedForBulk.size})
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={handleBulkDelete}
                    disabled={bulkLoading}
                    sx={{ borderRadius: 999 }}
                  >
                    حذف ({selectedForBulk.size})
                  </Button>
                </>
              )}
              {showTrash && (
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<RestoreIcon />}
                  onClick={handleBulkRestore}
                  disabled={bulkLoading}
                  sx={{ borderRadius: 999 }}
                >
                  استعادة ({selectedForBulk.size})
                </Button>
              )}
            </Box>
          )}

        </Box>

        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', gap: 0, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
            <FolderIcon sx={{ fontSize: 20, color: 'primary.main' }} />
            {breadcrumbs.map((c, idx) => (
              <Box key={`${c.path}_${idx}`} sx={{ display: 'flex', alignItems: 'center' }}>
                {idx > 0 && (
                  <Typography variant="body2" sx={{ opacity: 0.5, }}>
                    {">"}
                  </Typography>
                )}
                <Button
                  size="small"
                  onClick={() => setCurrentPath(c.path)}
                  sx={{
                    borderRadius: 999,
                    minWidth: 'auto',
                    px: 1,
                    py: 0.5,
                    textTransform: 'none',
                    fontWeight: c.path === currentPath ? 600 : 400,
                    color: c.path === currentPath ? 'primary.main' : 'text.primary',
                    bgcolor: c.path === currentPath ? 'primary.50' : 'transparent',
                  }}
                >
                  {c.label}
                </Button>
              </Box>
            ))}
            <Box sx={{ flex: '1 1 auto' }} />

          </Box>

          {showTrash ? (
            loadingTrash && trashFiles.length === 0 ? (
              <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                <FileItemSkeleton />
                <FileItemSkeleton />
                <FileItemSkeleton />
                <FileItemSkeleton />
                <FileItemSkeleton />
              </Box>
            ) : trashFiles.length === 0 ? (
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                سلة المهملات فارغة.
              </Typography>
            ) : (
              <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                {trashFiles.map((file) => (
                  <TrashFileItem
                    key={file.id}
                    file={file}
                    onRestore={handleRestore}
                    selected={selectedForBulk.has(file.originalKey)}
                    onToggleSelect={toggleFileSelection}
                  />
                ))}
              </Box>
            )
          ) : (
            <>
              {loadingExplorer && filesHere.length === 0 ? (
                <>
                  {/* Skeleton for folders */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ opacity: 0.75, mb: 1, fontWeight: 600 }}>
                      المجلدات
                    </Typography>
                    {viewMode === 'list' ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        <FolderItemSkeleton />
                        <FolderItemSkeleton />
                      </Box>
                    ) : (
                      <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'repeat(2, 1fr)',
                          sm: 'repeat(3, 1fr)',
                          md: 'repeat(4, 1fr)',
                          lg: 'repeat(5, 1fr)'
                        },
                        gap: 2
                      }}>
                        <FolderItemGridSkeleton />
                        <FolderItemGridSkeleton />
                        <FolderItemGridSkeleton />
                      </Box>
                    )}
                  </Box>
                  {/* Skeleton for files */}
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.75, mb: 1, fontWeight: 600 }}>
                      الملفات
                    </Typography>
                    {viewMode === 'list' ? (
                      <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                        <FileItemSkeleton />
                        <FileItemSkeleton />
                        <FileItemSkeleton />
                        <FileItemSkeleton />
                        <FileItemSkeleton />
                        <FileItemSkeleton />
                      </Box>
                    ) : (
                      <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                        <Box sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',
                            sm: 'repeat(3, 1fr)',
                            md: 'repeat(4, 1fr)',
                            lg: 'repeat(5, 1fr)'
                          },
                          gap: 2
                        }}>
                          <FileItemGridSkeleton />
                          <FileItemGridSkeleton />
                          <FileItemGridSkeleton />
                          <FileItemGridSkeleton />
                          <FileItemGridSkeleton />
                          <FileItemGridSkeleton />
                        </Box>
                      </Box>
                    )}
                  </Box>
                </>
              ) : (
                <>
                  {foldersHere.length === 0 && filteredAndSortedFiles.length === 0 ? (
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                      لا يوجد شيء هنا (0).
                    </Typography>
                  ) : (
                    <>
                      {foldersHere.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ opacity: 0.75, mb: 1, fontWeight: 600 }}>
                            المجلدات ({foldersHere.length})
                          </Typography>
                          {viewMode === 'list' ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                              {foldersHere.map((p) => {
                                const cleaned = p.endsWith('/') ? p.slice(0, -1) : p
                                // The server returns relative folder names (e.g., "subfolder/"), so we need to construct the full path
                                const fullPath = currentPath ? `${currentPath}/${cleaned}` : cleaned
                                return (
                                  <FolderItem
                                    key={p}
                                    folderPath={fullPath}
                                    onClick={() => setCurrentPath(fullPath)}
                                    onDelete={handleDeleteFolder}
                                    onDownload={handleDownloadFolder}
                                    isDeleting={deletingFolders.has(fullPath)}
                                  />
                                )
                              })}
                            </Box>
                          ) : (
                            <Box sx={{
                              display: 'grid',
                              gridTemplateColumns: {
                                xs: 'repeat(2, 1fr)',
                                sm: 'repeat(3, 1fr)',
                                md: 'repeat(4, 1fr)',
                                lg: 'repeat(5, 1fr)'
                              },
                              gap: 2
                            }}>
                              {foldersHere.map((p) => {
                                const cleaned = p.endsWith('/') ? p.slice(0, -1) : p
                                // The server returns relative folder names (e.g., "subfolder/"), so we need to construct the full path
                                const fullPath = currentPath ? `${currentPath}/${cleaned}` : cleaned
                                return (
                                  <FolderItemGrid
                                    key={p}
                                    folderPath={fullPath}
                                    onClick={() => setCurrentPath(fullPath)}
                                    onDelete={handleDeleteFolder}
                                    onDownload={handleDownloadFolder}
                                    isDeleting={deletingFolders.has(fullPath)}
                                  />
                                )
                              })}
                            </Box>
                          )}
                        </Box>
                      )}

                      {filteredAndSortedFiles.length > 0 && (
                        <Box>
                          <Typography variant="body2" sx={{ opacity: 0.75, mb: 1, fontWeight: 600 }}>
                            الملفات ({totalFileCount !== null ? totalFileCount : filteredAndSortedFiles.length})
                          </Typography>
                          {viewMode === 'list' ? (
                            <Box
                              ref={scrollContainerRef}
                              sx={{ maxHeight: 500, overflow: 'auto' }}
                              onScroll={handleScroll}
                            >
                              {filteredAndSortedFiles.map((obj) => {
                                const url = keyToPublicUrl(obj.key)
                                const thumbnailUrl = obj.thumbnailKey ? keyToPublicUrl(obj.thumbnailKey) : ''
                                return (
                                  <FileItem
                                    key={obj.key}
                                    obj={obj}
                                    url={url}
                                    thumbnailUrl={thumbnailUrl}
                                    onDelete={handleDelete}
                                    onPreview={handlePreview}
                                    onDownload={handleDownloadFile}
                                    onPrivacyToggle={openPrivacyModal}
                                    filePrivacySettings={filePrivacySettings}
                                    canAccessFile={canAccessFile}
                                    isDeleting={deletingFiles.has(obj.key)}
                                    selected={selectedForBulk.has(obj.key)}
                                    onToggleSelect={toggleFileSelection}
                                  />
                                )
                              })}
                              {/* Infinite Scroll Loading Indicator */}
                              {isLoadingMoreFiles && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                  <CircularProgress size={24} />
                                  <Typography variant="body2" sx={{ ml: 2, opacity: 0.7 }}>
                                    جاري تحميل المزيد من الملفات...
                                  </Typography>
                                </Box>
                              )}
                              {!hasMoreFiles && filteredAndSortedFiles.length > 0 && (
                                <Typography variant="body2" sx={{ textAlign: 'center', opacity: 0.5, p: 2 }}>
                                  تم تحميل جميع الملفات
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Box
                              ref={scrollContainerRef}
                              sx={{ maxHeight: 500, overflow: 'auto' }}
                              onScroll={handleScroll}
                            >
                              <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                  xs: 'repeat(2, 1fr)',
                                  sm: 'repeat(3, 1fr)',
                                  md: 'repeat(4, 1fr)',
                                  lg: 'repeat(5, 1fr)'
                                },
                                gap: 2
                              }}>
                                {filteredAndSortedFiles.map((obj) => {
                                  const url = keyToPublicUrl(obj.key)
                                  const thumbnailUrl = obj.thumbnailKey ? keyToPublicUrl(obj.thumbnailKey) : ''
                                  return (
                                    <FileItemGrid
                                      key={obj.key}
                                      obj={obj}
                                      url={url}
                                      thumbnailUrl={thumbnailUrl}
                                      onDelete={handleDelete}
                                      onPreview={handlePreview}
                                      onDownload={handleDownloadFile}
                                      onPrivacyToggle={openPrivacyModal}
                                      filePrivacySettings={filePrivacySettings}
                                      canAccessFile={canAccessFile}
                                      isDeleting={deletingFiles.has(obj.key)}
                                      selected={selectedForBulk.has(obj.key)}
                                      onToggleSelect={toggleFileSelection}
                                    />
                                  )
                                })}
                              </Box>
                              {/* Infinite Scroll Loading Indicator for Grid View */}
                              {isLoadingMoreFiles && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, gridColumn: '1 / -1' }}>
                                  <CircularProgress size={24} />
                                  <Typography variant="body2" sx={{ ml: 2, opacity: 0.7 }}>
                                    جاري تحميل المزيد من الملفات...
                                  </Typography>
                                </Box>
                              )}
                              {!hasMoreFiles && filteredAndSortedFiles.length > 0 && (
                                <Typography variant="body2" sx={{ textAlign: 'center', opacity: 0.5, p: 2, gridColumn: '1 / -1' }}>
                                  تم تحميل جميع الملفات
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </Box>

        {!API_ENV.r2PublicBaseUrl && (
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
            لتفعيل زر (فتح)، اضف قيمة `VITE_R2_PUBLIC_BASE_URL` في `frontend/.env.local`.
          </Typography>
        )}
      </Container>

      <FilePreviewModal
        open={previewModalOpen}
        file={previewFile}
        onClose={handleClosePreview}
      />

      {encryptedViewerFile && (
        <EncryptedFileViewer
          open={encryptedViewerOpen}
          onClose={handleCloseEncryptedViewer}
          fileId={encryptedViewerFile.fileId}
          filename={encryptedViewerFile.filename}
          mimeType={encryptedViewerFile.mimeType}
          size={encryptedViewerFile.size}
          encryptionEnabled={encryptedViewerFile.encryptionEnabled}
          encryptionIv={encryptedViewerFile.encryptionIv}
          encryptionSalt={encryptedViewerFile.encryptionSalt}
        />
      )}


      {/* Create Folder Modal */}
      <Dialog
        open={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'background.default',
            backgroundImage: 'none',
          }
        }}
      >
        <DialogTitle>إنشاء مجلد جديد</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="اسم المجلد"
            fullWidth
            variant="outlined"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            disabled={creatingFolder}
            error={!!folderNameError}
            helperText={folderNameError || 'أدخل اسمًا فريدًا للمجلد (الأحرف المسموحة: أ-ب، 0-9، _، -)'}
            inputProps={{
              maxLength: 255,
              style: { direction: 'ltr' }
            }}
            sx={{
              '& .MuiInputBase-input': {
                direction: 'ltr !important',
                textAlign: 'left !important'
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateFolderModal(false)} disabled={creatingFolder}>
            إلغاء
          </Button>
          <Button
            onClick={handleCreateFolder}
            disabled={creatingFolder || !newFolderName.trim()}
            variant="contained"
          >
            {creatingFolder ? 'جارٍ الإنشاء...' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Privacy Settings Modal */}
      <Dialog
        open={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'background.default',
            backgroundImage: 'none',
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon />
            <Typography>إعدادات الخصوصية: {selectedFileForPrivacy?.filename}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
            اختر أعضاء الفريق المسموح لهم الوصول إلى هذا الملف. إذا لم يتم تحديد أي عضو، سيكون الملف متاحًا للجميع.
          </Typography>

          {loadingTeamMembers ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                جارٍ تحميل أعضاء الفريق...
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {teamMembers.map((member) => (
                <ListItem key={member.id}>
                  <ListItemIcon>
                    <Checkbox
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => toggleMemberSelection(member.id)}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={member.user?.name || member.name || member.email}
                    secondary={member.email}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPrivacyModal(false)}>
            إلغاء
          </Button>
          <Button
            onClick={savePrivacySettings}
            variant="contained"
          >
            حفظ الإعدادات
          </Button>
        </DialogActions>
      </Dialog>

      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={closeToast}
        />
      )}
    </Box>
  )
}


