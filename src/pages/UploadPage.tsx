import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  ListItem,
  CircularProgress,
  Toolbar,
  Typography,
  Card,
  CardContent,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Checkbox,
  List,
  ListItemText,
  ListItemIcon,
  TextField,
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import UploadIcon from '@mui/icons-material/Upload'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
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
import LockIcon from '@mui/icons-material/Lock'
import { useNavigate } from 'react-router-dom'
import UploadDropzone, { type SelectedUploadFile } from '../components/UploadDropzone'
import { useAuth } from '../contexts/AuthContext'
import { useThemeMode } from '../contexts/ThemeContext'
import { API_ENV } from '../config/api'
import { listUploadedObjects, uploadFilesStreamed, moveFileToTrash, restoreFileFromTrash, listTrashFiles, fetchBulkPrivacySettings } from '../api/uploadApi'
import { subscribeRealtime } from '../api/realtimeApi'
import { api } from '../api/http'
import { FileItemSkeleton, FileItemGridSkeleton, FolderItemSkeleton, FolderItemGridSkeleton } from '../components/SkeletonLoaders'

function fmtBytes(bytes: number | undefined) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
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
function ImageThumbnail({ url, filename, fileKey, size = 60 }: { url: string; filename: string; fileKey: string; size?: number }) {
  const [imgError, setImgError] = useState(false)
  const [imgUrl, setImgUrl] = useState(url)

  // If public URL fails, try the image proxy API as fallback
  const handleImageError = () => {
    if (!imgError && fileKey) {
      // Try using image proxy API as image source with the full key
      const baseUrl = API_ENV.apiBaseUrl?.trim() || ''
      const proxyUrl = `${baseUrl}/api/image/${encodeURIComponent(fileKey)}`
      setImgUrl(proxyUrl)
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
      <img
        src={imgUrl}
        alt={filename}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        onError={handleImageError}
      />
    </Box>
  )
}

// Video thumbnail component with play icon overlay
function VideoThumbnail({ url, thumbnailKey, size = 60 }: { url: string; thumbnailKey?: string | null; size?: number }) {
  const [thumbnailError, setThumbnailError] = useState(!url)
  const [imgUrl, setImgUrl] = useState(url)

  useEffect(() => {
    const baseUrl = API_ENV.apiBaseUrl?.trim() || ''
    const fallbackUrl = thumbnailKey && baseUrl
      ? `${baseUrl}/api/image/${encodeURIComponent(thumbnailKey)}`
      : ''
    const nextUrl = url || fallbackUrl

    setImgUrl(nextUrl)
    setThumbnailError(!nextUrl)
  }, [url, thumbnailKey])

  const handleThumbnailError = () => {
    const baseUrl = API_ENV.apiBaseUrl?.trim() || ''
    const fallbackUrl = thumbnailKey && baseUrl
      ? `${baseUrl}/api/image/${encodeURIComponent(thumbnailKey)}`
      : ''

    if (fallbackUrl && imgUrl !== fallbackUrl) {
      setImgUrl(fallbackUrl)
      setThumbnailError(false)
      return
    }

    setThumbnailError(true)
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
        position: 'relative',
      }}
    >
      {!thumbnailError && imgUrl ? (
        <img
          src={imgUrl}
          alt="Video thumbnail"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={handleThumbnailError}
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
  onPrivacyToggle,
  filePrivacySettings,
  canAccessFile,
  isDeleting
}: {
  obj: { key: string; size?: number; thumbnailKey?: string | null }
  url: string
  thumbnailUrl?: string
  onDelete: (key: string) => void
  onPreview: (key: string, url: string) => void
  onPrivacyToggle: (key: string, filename: string) => void
  filePrivacySettings: Record<string, { restricted: boolean; allowedMembers: string[]; canAccess?: boolean }>
  canAccessFile: (key: string) => boolean
  isDeleting?: boolean
}) {
  const filename = filenameFromKey(obj.key)
  const fileType = getFileType(filename)
  const isImage = fileType === 'image'
  const isVideo = fileType === 'video'
  const resolvedThumbnailKey = obj.thumbnailKey || (isVideo ? buildVideoThumbnailKeyFromFileKey(obj.key) : null)
  const hasAccess = canAccessFile(obj.key)
  const privacySettings = filePrivacySettings[obj.key]
  const isRestricted = privacySettings?.restricted

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
        border: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: isRestricted ? 'rgba(255,0,0,0.02)' : 'rgba(255,255,255,0.02)',
        cursor: hasAccess && url ? 'pointer' : 'default',
        opacity: isRestricted && !hasAccess ? 0.6 : 1,
        '&:hover': {
          backgroundColor: hasAccess ? 'rgba(255,255,255,0.05)' : 'rgba(255,0,0,0.05)',
        },
      }}
    >
      {isImage && url && hasAccess ? (
        <Box sx={{ position: 'relative' }}>
          <ImageThumbnail url={url} filename={filename} fileKey={obj.key} />
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

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ wordBreak: 'break-word', opacity: 0.92, fontWeight: 500 }}>
          {filename}
        </Typography>
        {obj.size && (
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {fmtBytes(obj.size)}
          </Typography>
        )}
        {isRestricted && (
          <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', color: 'error.main' }}>
            محدود الوصول
          </Typography>
        )}
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
                void handleDownload(obj.key, filename)
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
              sx={{ borderRadius: 999, minWidth: 'auto', p: 1, color: 'error.main' }}
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
  onPrivacyToggle,
  filePrivacySettings,
  canAccessFile,
  isDeleting
}: {
  obj: { key: string; size?: number; thumbnailKey?: string | null }
  url: string
  thumbnailUrl?: string
  onDelete: (key: string) => void
  onPreview: (key: string, url: string) => void
  onPrivacyToggle: (key: string, filename: string) => void
  filePrivacySettings: Record<string, { restricted: boolean; allowedMembers: string[]; canAccess?: boolean }>
  canAccessFile: (key: string) => boolean
  isDeleting?: boolean
}) {
  const filename = filenameFromKey(obj.key)
  const fileType = getFileType(filename)
  const isImage = fileType === 'image'
  const isVideo = fileType === 'video'
  const resolvedThumbnailKey = obj.thumbnailKey || (isVideo ? buildVideoThumbnailKeyFromFileKey(obj.key) : null)
  const hasAccess = canAccessFile(obj.key)
  const privacySettings = filePrivacySettings[obj.key]
  const isRestricted = privacySettings?.restricted

  return (
    <Card
      onClick={() => hasAccess && url && onPreview(obj.key, url)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        border: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: isRestricted ? 'rgba(255,0,0,0.02)' : 'rgba(255,255,255,0.02)',
        cursor: hasAccess && url ? 'pointer' : 'default',
        opacity: isRestricted && !hasAccess ? 0.6 : 1,
        '&:hover': {
          backgroundColor: hasAccess ? 'rgba(255,255,255,0.05)' : 'rgba(255,0,0,0.05)',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120, position: 'relative' }}>
        {isImage && url && hasAccess ? (
          <Box sx={{ position: 'relative' }}>
            <ImageThumbnail url={url} filename={filename} fileKey={obj.key} size={80} />
            <ThumbnailTypeBadge fileType={fileType} size={16} />
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
            <VideoThumbnail url={thumbnailUrl || ''} thumbnailKey={resolvedThumbnailKey} size={80} />
            <ThumbnailTypeBadge fileType={fileType} size={16} />
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
              width: 64,
              height: 64,
              backgroundColor: isRestricted ? 'rgba(255,0,0,0.1)' : 'rgba(255,255,255,0.1)',
              color: 'inherit',
            }}
          >
            {isRestricted ? <LockIcon /> : getFileIcon(fileType)}
          </Avatar>
        )}
      </Box>

      <CardContent sx={{ p: 2, pt: 0, flex: 1 }}>

        {obj.size && (
          <Typography
            variant="caption"
            sx={{
              opacity: 0.7,
              display: 'block',
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
              display: 'block',
              textAlign: 'center',
              color: 'error.main'
            }}
          >
            محدود الوصول
          </Typography>
        )}
      </CardContent>

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
                void handleDownload(obj.key, filename)
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
              sx={{ borderRadius: 999, minWidth: 'auto', p: 1, color: 'error.main' }}
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
  onRestore
}: {
  file: any
  onRestore: (key: string) => void
}) {
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
        border: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,0,0,0.02)',
        '&:hover': {
          backgroundColor: 'rgba(255,0,0,0.05)',
        },
      }}
    >
      {/* Thumbnail or icon */}
      {isImage && thumbnailUrl ? (
        <Box sx={{ position: 'relative' }}>
          <ImageThumbnail url={thumbnailUrl} filename={filename} fileKey={file.originalKey} />
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
            backgroundColor: 'rgba(255,0,0,0.1)',
            color: 'inherit',
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
  const name = folderPath.split('/').filter(Boolean).pop() || folderPath

  return (
    <ListItem
      sx={{
        py: 1.5,
        px: 2,
        borderRadius: 2,
        mb: 1,
        border: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.02)',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'rgba(255,255,255,0.05)',
        },
      }}
    >
      <Box
        onClick={onClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
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

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ wordBreak: 'break-word', opacity: 0.92, fontWeight: 500 }}>
            {name}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
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
            sx={{ borderRadius: 999, minWidth: 'auto', p: 1, color: 'error.main' }}
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
  const name = folderPath.split('/').filter(Boolean).pop() || folderPath

  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        border: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.02)',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'rgba(255,255,255,0.05)',
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
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'inherit',
            }}
          >
            <FolderIcon />
          </Avatar>
        </Box>

        <CardContent sx={{ p: 2, pt: 0, flex: 1 }}>
          <Typography
            variant="body2"
            sx={{
              wordBreak: 'break-word',
              opacity: 0.92,
              fontWeight: 500,
              fontSize: '0.875rem',
              textAlign: 'center',
              mb: 1
            }}
          >
            {name}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              opacity: 0.7,
              display: 'block',
              textAlign: 'center'
            }}
          >
            مجلد
          </Typography>
        </CardContent>
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
            sx={{ borderRadius: 999, minWidth: 'auto', p: 1, color: 'error.main' }}
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
      // Fallback to public URL if no API base URL
      const publicBase = API_ENV.r2PublicBaseUrl?.trim() || ''
      if (publicBase) {
        const safeKey = key.startsWith('/') ? key.slice(1) : key
        const publicUrl = `${publicBase.endsWith('/') ? publicBase.slice(0, -1) : publicBase}/${safeKey}`
        const a = document.createElement('a')
        a.href = publicUrl
        a.download = filename
        a.rel = 'noreferrer'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
      return
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
    // Fallback to public URL
    const publicBase = API_ENV.r2PublicBaseUrl?.trim() || ''
    if (publicBase) {
      const safeKey = key.startsWith('/') ? key.slice(1) : key
      const publicUrl = `${publicBase.endsWith('/') ? publicBase.slice(0, -1) : publicBase}/${safeKey}`
      window.open(publicUrl, '_blank')
    }
  }
}

export default function UploadPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const { mode, toggle } = useThemeMode()

  const [selectedFiles, setSelectedFiles] = useState<SelectedUploadFile[]>([])
  // Explorer path under "uploads/". Examples: "" (root), "team1", "team1/sub1"
  const [currentPath, setCurrentPath] = useState('')
  const [foldersHere, setFoldersHere] = useState<string[]>([])
  const [filesHere, setFilesHere] = useState<Array<{ key: string; size?: number; lastModified?: string; createdAt?: string; updatedAt?: string; thumbnailKey?: string | null }>>([])
  const [hasMoreFiles, setHasMoreFiles] = useState(true)
  const [nextContinuationToken, setNextContinuationToken] = useState<string | null>(null)
  const [isLoadingMoreFiles, setIsLoadingMoreFiles] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [bytesUploaded, setBytesUploaded] = useState(0)
  const [totalBytes, setTotalBytes] = useState(0)
  const [currentUploadFileIndex, setCurrentUploadFileIndex] = useState(0)
  const [currentUploadTotalFiles, setCurrentUploadTotalFiles] = useState(0)
  const [currentUploadFilePath, setCurrentUploadFilePath] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loadingExplorer, setLoadingExplorer] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [trashFiles, setTrashFiles] = useState<Array<any>>([])
  const [loadingTrash, setLoadingTrash] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ key: string; url: string; filename: string; type: string } | null>(null)

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

  const canUpload = useMemo(() => selectedFiles.length > 0 && !uploading, [selectedFiles, uploading])

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

  // Apply dark scrollbar styles
  useEffect(() => {
    if (mode === 'dark') {
      const style = document.createElement('style')
      style.textContent = `
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        ::-webkit-scrollbar-corner {
          background: rgba(255, 255, 255, 0.05);
        }
      `
      document.head.appendChild(style)
      return () => {
        document.head.removeChild(style)
      }
    }
  }, [mode])

  const ROOT_PREFIX = useMemo(() => {
    const workspaceId = user?.workspaceId?.trim()
    return workspaceId ? `uploads/${workspaceId}` : 'uploads'
  }, [user?.workspaceId])
  const explorerPrefix = currentPath.trim()
    ? `${ROOT_PREFIX}/${currentPath.trim()}`
    : ROOT_PREFIX

  async function handleUpload() {
    setError(null)
    setSuccess(null)
    setUploadSpeed(0)
    setBytesUploaded(0)
    setTotalBytes(0)

    if (selectedFiles.length === 0) {
      setError('يرجى اختيار ملفات أو مجلد للرفع.')
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

    // Calculate total upload size
    const totalUploadSize = selectedFiles.reduce((sum, sf) => sum + sf.file.size, 0)
    setTotalBytes(totalUploadSize)

    // Show upload modal
    setShowUploadModal(true)
    setUploading(true)
    setUploadProgress(0)
    setCurrentUploadFileIndex(0)
    setCurrentUploadTotalFiles(selectedFiles.length)
    setCurrentUploadFilePath('')

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

      const res = await uploadFilesStreamed(selectedFiles, {
        batchName: explorerPrefix,
        ...(rootFolderName ? { folderName: rootFolderName } : {}),
        onUploadProgress: ({
          progressPercent,
          bytesUploaded: uploaded,
          totalBytes: total,
          uploadSpeed: speed,
          currentFileIndex,
          totalFiles,
          currentFilePath,
        }) => {
          setUploadProgress(progressPercent)
          setBytesUploaded(uploaded)
          setTotalBytes(total)
          setUploadSpeed(speed)
          setCurrentUploadFileIndex(currentFileIndex)
          setCurrentUploadTotalFiles(totalFiles)
          setCurrentUploadFilePath(currentFilePath)
        }
      })

      const uploaded = res.uploaded ?? []

      const count = uploaded.length
      setSuccess(`تم الرفع بنجاح. عدد الملفات: ${count}`)
      setSelectedFiles([])
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
        setError('مجلد بهذا الاسم موجود بالفعل. يرجى استخدام اسم مختلف.')
      } else {
        setError(`فشل الرفع: ${backendMsg ?? err.message ?? 'خطأ غير معروف'}`)
      }
    } finally {
      setUploading(false)
      setUploadSpeed(0)
      setCurrentUploadFileIndex(0)
      setCurrentUploadTotalFiles(0)
      setCurrentUploadFilePath('')
      setHasTriggeredUpload(false) // Reset for next upload
      // Keep modal open for a moment to show success/error, then close
      setTimeout(() => {
        setShowUploadModal(false)
      }, 2000)
    }
  }

  async function handleDelete(key: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الملف؟ سيتم نقله إلى سلة المهملات وحذفه نهائياً بعد 7 أيام.')) {
      return
    }

    setDeletingFiles(prev => new Set(prev).add(key))
    try {
      await moveFileToTrash(key)
      setSuccess('تم نقل الملف إلى سلة المهملات بنجاح')
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(`فشل حذف الملف: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`)
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
      setSuccess('تم استعادة الملف بنجاح')
      await fetchTrashFiles()
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(`فشل استعادة الملف: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`)
    }
  }

  const fetchTrashFiles = useCallback(async () => {
    setLoadingTrash(true)
    try {
      const res = await listTrashFiles()
      setTrashFiles(res.files || [])
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(`فشل جلب ملفات المهملات: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`)
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
    setPreviewFile({ key, url, filename, type: fileType })
    setPreviewModalOpen(true)
  }

  function handleClosePreview() {
    setPreviewModalOpen(false)
    setPreviewFile(null)
  }

  // Folder creation functions
  async function handleCreateFolder() {
    const trimmedName = newFolderName.trim()

    // Client-side validation
    if (!trimmedName) {
      setError('يرجى إدخال اسم المجلد')
      return
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/
    if (invalidChars.test(trimmedName)) {
      setError('اسم المجلد يحتوي على أحرف غير صالحة: < > : " / \\ | ? *')
      return
    }

    // Check for names that start or end with dots or spaces
    if (trimmedName.startsWith('.') || trimmedName.startsWith(' ') ||
      trimmedName.endsWith('.') || trimmedName.endsWith(' ')) {
      setError('اسم المجلد لا يمكن أن يبدأ أو ينتهي بنقطة أو مسافة')
      return
    }

    // Check for reserved names
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
    if (reservedNames.includes(trimmedName.toUpperCase())) {
      setError('اسم المجلد محجوز. يرجى استخدام اسم مختلف.')
      return
    }

    // Check length
    if (trimmedName.length > 255) {
      setError('اسم المجلد طويل جداً. الحد الأقصى هو 255 حرفًا.')
      return
    }

    // Check for duplicate folder names in current location
    const existingFolders = foldersHere.map(folder => {
      const cleaned = folder.endsWith('/') ? folder.slice(0, -1) : folder
      return cleaned.split('/').pop() || cleaned
    })

    if (existingFolders.includes(trimmedName)) {
      setError('مجلد بهذا الاسم موجود بالفعل في هذا الموقع')
      return
    }

    setCreatingFolder(true)
    setError(null)

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
          setError('مجلد بهذا الاسم موجود بالفعل في هذا الموقع')
        } else {
          setError(data.message || 'فشل إنشاء المجلد')
        }
        return
      }

      setSuccess('تم إنشاء المجلد بنجاح')
      setNewFolderName('')
      setShowCreateFolderModal(false)
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(`فشل إنشاء المجلد: ${err.message || 'خطأ غير معروف'}`)
    } finally {
      setCreatingFolder(false)
    }
  }

  // Folder deletion function
  async function handleDeleteFolder(folderPath: string) {
    if (!confirm('هل أنت متأكد من أنك تريد حذف هذا المجلد وجميع محتوياته؟')) {
      return
    }

    setError(null)
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

      setSuccess('تم حذف المجلد بنجاح')
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(`فشل حذف المجلد: ${err.message || 'خطأ غير معروف'}`)
    } finally {
      setDeletingFolders(prev => {
        const next = new Set(prev)
        next.delete(folderPath)
        return next
      })
    }
  }

  // Folder download function
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

      // Create a temporary link and trigger download
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `${folderPath.split('/').pop() || 'folder'}.zip`
      a.rel = 'noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      setSuccess('بدأ تنزيل المجلد')
    } catch (error) {
      console.error('Folder download error:', error)
      setError(`فشل تنزيل المجلد: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
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

      setSuccess('تم حفظ إعدادات الخصوصية')
      setShowPrivacyModal(false)
      setSelectedFileForPrivacy(null)
      setSelectedMembers([])
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(`فشل حفظ الإعدادات: ${err.message || 'خطأ غير معروف'}`)
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
    } else {
      setIsLoadingMoreFiles(true)
    }

    try {
      const limit = 50
      const continuationToken = reset ? undefined : (continuationTokenOverride || undefined)
      const res = await listUploadedObjects(explorerPrefix, limit, true, continuationToken)

      if (reset) {
        setFoldersHere(res.folders ?? [])
        setFilesHere(res.objects ?? [])
      } else {
        setFilesHere(prev => [...prev, ...(res.objects ?? [])])
      }

      setHasMoreFiles(res.pagination?.hasMore ?? false)
      setNextContinuationToken(res.pagination?.nextContinuationToken ?? null)

      // Fetch privacy settings for all files (only on reset or first load)
      if (reset || (!continuationToken && res.objects)) {
        const fileKeys = (res.objects ?? []).map(obj => obj.key)
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
      setError(err.response?.data?.message ?? err.message ?? 'فشل جلب الملفات')
    } finally {
      if (reset) {
        setLoadingExplorer(false)
      } else {
        setIsLoadingMoreFiles(false)
      }
    }
  }, [explorerPrefix])

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

  const publicBase = API_ENV.r2PublicBaseUrl?.trim() ?? ''
  function keyToPublicUrl(key: string) {
    if (!publicBase) return ''
    const base = publicBase.endsWith('/') ? publicBase.slice(0, -1) : publicBase
    const safeKey = key.startsWith('/') ? key.slice(1) : key
    return `${base}/${safeKey}`
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
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: 'transparent',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          color: 'inherit',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              larthaa Agency
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="text"
              onClick={() => navigate('/dashboard/tasks')}
              sx={{ color: 'inherit', borderRadius: 999, px: 2 }}
            >
              المهام
            </Button>
            <IconButton onClick={toggle} color="inherit" aria-label="تبديل الثيم">
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
            <IconButton
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
              color="inherit"
              aria-label="تسجيل الخروج"
            >
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <UploadDropzone
          files={selectedFiles}
          onFilesChange={setSelectedFiles}
          uploading={uploading}
          error={error}
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
                إنشاء مجلد
              </Button>
            </Box>
          </Box>



        </Box>

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}

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
                            الملفات ({filteredAndSortedFiles.length})
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
                                    onPrivacyToggle={openPrivacyModal}
                                    filePrivacySettings={filePrivacySettings}
                                    canAccessFile={canAccessFile}
                                    isDeleting={deletingFiles.has(obj.key)}
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
                                      onPrivacyToggle={openPrivacyModal}
                                      filePrivacySettings={filePrivacySettings}
                                      canAccessFile={canAccessFile}
                                      isDeleting={deletingFiles.has(obj.key)}
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

        {!publicBase && (
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

      {/* Upload Progress Modal */}
      <Dialog
        open={showUploadModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'background.default',
            backgroundImage: 'none',
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <UploadIcon />
            <Typography variant="h6">جارٍ رفع الملفات</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ textAlign: 'center' }}>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{ height: 8, borderRadius: 999, mb: 2 }}
            />

            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              {uploadProgress}%
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                {fmtBytes(bytesUploaded)} / {fmtBytes(totalBytes)}
              </Typography>
              {(uploadSpeed && uploadSpeed > 0) && (
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  {fmtSpeed(uploadSpeed)}
                </Typography>
              )}
            </Box>

            {uploading && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  جاري رفع الملف {currentUploadFileIndex || 1} من {currentUploadTotalFiles || selectedFiles.length}...
                </Typography>
              </Box>
            )}

            {uploading && currentUploadFilePath && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.65, wordBreak: 'break-word' }}>
                {currentUploadFilePath}
              </Typography>
            )}

            {success && !uploading && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {success}
              </Alert>
            )}

            {error && !uploading && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
      </Dialog>

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
            error={!!error && error.includes('اسم المجلد')}
            helperText={error && error.includes('اسم المجلد') ? error : 'أدخل اسمًا فريدًا للمجلد (الأحرف المسموحة: أ-ب، 0-9، _، -)'}
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
          {error && !error.includes('اسم المجلد') && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          )}
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
    </Box>
  )
}

function fmtSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '0 B/s'
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytesPerSecond) / Math.log(1024)))
  const value = bytesPerSecond / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

