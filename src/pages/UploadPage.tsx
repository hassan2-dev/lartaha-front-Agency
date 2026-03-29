import { useCallback, useEffect, useMemo, useState } from 'react'
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
  LinearProgress,
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import RefreshIcon from '@mui/icons-material/Refresh'
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
import { useNavigate } from 'react-router-dom'
import UploadDropzone, { type SelectedUploadFile } from '../components/UploadDropzone'
import { useAuth } from '../contexts/AuthContext'
import { useThemeMode } from '../contexts/ThemeContext'
import { API_ENV } from '../config/api'
import { listUploadedObjects, uploadFiles, moveFileToTrash, restoreFileFromTrash, listTrashFiles } from '../api/uploadApi'
import { subscribeRealtime } from '../api/realtimeApi'

function fmtBytes(bytes: number | undefined) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
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

function filenameFromKey(key: string) {
  const parts = String(key).split('/').filter(Boolean)
  return parts[parts.length - 1] || 'file'
}

// Thumbnail preview component for images
function ImageThumbnail({ url, filename, key, size = 60 }: { url: string; filename: string; key: string; size?: number }) {
  const [imgError, setImgError] = useState(false)
  const [imgUrl, setImgUrl] = useState(url)

  // If public URL fails, try the image proxy API as fallback
  const handleImageError = () => {
    if (!imgError && key) {
      // Try using image proxy API as image source with the full key
      const baseUrl = API_ENV.apiBaseUrl?.trim() || ''
      const proxyUrl = `${baseUrl}/api/image/${encodeURIComponent(key)}`
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
function VideoThumbnail({ url, size = 60 }: { url: string; size?: number }) {
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false)
  const [thumbnailError, setThumbnailError] = useState(false)

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
      {!thumbnailError && (
        <video
          src={url}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onLoadedData={(e) => {
            const video = e.target as HTMLVideoElement
            video.currentTime = 0.1 // Capture frame at 0.1 seconds
            video.onseeked = () => {
              setThumbnailLoaded(true)
            }
          }}
          onError={() => {
            setThumbnailError(true)
          }}
          muted
          preload="metadata"
        />
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
          backgroundColor: thumbnailLoaded ? 'rgba(0,0,0,0.3)' : 'transparent',
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

      {thumbnailError && (
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
    </Box>
  )
}

// File item component with thumbnail or icon
function FileItem({
  obj,
  url,
  onDelete,
  onPreview
}: {
  obj: { key: string; size?: number }
  url: string
  onDelete: (key: string) => void
  onPreview: (key: string, url: string) => void
}) {
  const filename = filenameFromKey(obj.key)
  const fileType = getFileType(filename)
  const isImage = fileType === 'image'
  const isVideo = fileType === 'video'

  return (
    <ListItem
      key={obj.key}
      onClick={() => url && onPreview(obj.key, url)}
      sx={{
        py: 1.5,
        px: 2,
        alignItems: 'center',
        gap: 2,
        borderRadius: 2,
        mb: 1,
        border: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.02)',
        cursor: url ? 'pointer' : 'default',
        '&:hover': {
          backgroundColor: 'rgba(255,255,255,0.05)',
        },
      }}
    >
      {isImage && url ? (
        <ImageThumbnail url={url} filename={filename} key={obj.key} />
      ) : isVideo && url ? (
        <VideoThumbnail url={url} />
      ) : (
        <Avatar
          sx={{
            width: 48,
            height: 48,
            backgroundColor: 'rgba(255,255,255,0.1)',
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
        {obj.size && (
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {fmtBytes(obj.size)}
          </Typography>
        )}
      </Box>

      {url && (
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title="تنزيل">
            <Button
              size="small"
              variant="text"
              onClick={(e) => {
                e.stopPropagation()
                void handleDownload(obj.key, filename)
              }}
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
              sx={{ borderRadius: 999, minWidth: 'auto', p: 1, color: 'error.main' }}
            >
              <DeleteIcon />
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
  onDelete,
  onPreview
}: {
  obj: { key: string; size?: number }
  url: string
  onDelete: (key: string) => void
  onPreview: (key: string, url: string) => void
}) {
  const filename = filenameFromKey(obj.key)
  const fileType = getFileType(filename)
  const isImage = fileType === 'image'
  const isVideo = fileType === 'video'

  return (
    <Card
      onClick={() => url && onPreview(obj.key, url)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        border: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.02)',
        cursor: url ? 'pointer' : 'default',
        '&:hover': {
          backgroundColor: 'rgba(255,255,255,0.05)',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
        {isImage && url ? (
          <ImageThumbnail url={url} filename={filename} key={obj.key} size={80} />
        ) : isVideo && url ? (
          <VideoThumbnail url={url} size={80} />
        ) : (
          <Avatar
            sx={{
              width: 64,
              height: 64,
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'inherit',
            }}
          >
            {getFileIcon(fileType)}
          </Avatar>
        )}
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
          {filename}
        </Typography>
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
      </CardContent>

      {url && (
        <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <Tooltip title="تنزيل">
            <Button
              size="small"
              variant="text"
              onClick={(e) => {
                e.stopPropagation()
                void handleDownload(obj.key, filename)
              }}
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
              sx={{ borderRadius: 999, minWidth: 'auto', p: 1, color: 'error.main' }}
            >
              <DeleteIcon />
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

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ wordBreak: 'break-word', opacity: 0.92, fontWeight: 500 }}>
          {filename}
        </Typography>
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
  onClick
}: {
  folderPath: string
  onClick: () => void
}) {
  const name = folderPath.split('/').filter(Boolean).pop() || folderPath

  return (
    <ListItem
      onClick={onClick}
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

      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ wordBreak: 'break-word', opacity: 0.92, fontWeight: 500 }}>
          {name}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          مجلد
        </Typography>
      </Box>
    </ListItem>
  )
}

// Grid view folder item component
function FolderItemGrid({
  folderPath,
  onClick
}: {
  folderPath: string
  onClick: () => void
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
      onClick={onClick}
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
    if (!base) {
      // Fallback to public URL if no API base URL
      const publicBase = API_ENV.r2PublicBaseUrl?.trim() || ''
      if (publicBase) {
        const safeKey = key.startsWith('/') ? key.slice(1) : key
        const publicUrl = `${publicBase.endsWith('/') ? publicBase.slice(0, -1) : publicBase}/${safeKey}`
        window.open(publicUrl, '_blank')
      }
      return
    }

    const normalized = base.endsWith('/') ? base.slice(0, -1) : base
    const downloadUrl = `${normalized}/api/download?key=${encodeURIComponent(key)}`

    // Create authenticated download request
    const token = localStorage.getItem('larthaa_auth_token')
    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    })

    if (!response.ok) {
      throw new Error('Download failed')
    }

    // Create blob and download
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
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
  const { logout } = useAuth()
  const { mode, toggle } = useThemeMode()

  const [selectedFiles, setSelectedFiles] = useState<SelectedUploadFile[]>([])
  // Explorer path under "uploads/". Examples: "" (root), "team1", "team1/sub1"
  const [currentPath, setCurrentPath] = useState('')
  const [foldersHere, setFoldersHere] = useState<string[]>([])
  const [filesHere, setFilesHere] = useState<Array<{ key: string; size?: number }>>([])
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [bytesUploaded, setBytesUploaded] = useState(0)
  const [totalBytes, setTotalBytes] = useState(0)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loadingExplorer, setLoadingExplorer] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [trashFiles, setTrashFiles] = useState<Array<any>>([])
  const [loadingTrash, setLoadingTrash] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ key: string; url: string; filename: string; type: string } | null>(null)

  const canUpload = useMemo(() => selectedFiles.length > 0 && !uploading, [selectedFiles, uploading])

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

  const ROOT_PREFIX = 'uploads'
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

    try {
      const formData = new FormData()

      // Destination prefix in R2. Root is always "uploads".
      // If user is inside a folder, upload goes inside that folder.
      formData.append('batchName', explorerPrefix)

      // Check if we have folder structure from the files
      const hasFolderStructure = selectedFiles.some(sf => sf.relativePath.includes('/'))

      if (hasFolderStructure) {
        // Extract the root folder name from the first file that has a path
        const firstFileWithPath = selectedFiles.find(sf => sf.relativePath.includes('/'))
        if (firstFileWithPath) {
          const rootFolder = firstFileWithPath.relativePath.split('/')[0]
          formData.append('folderName', rootFolder)
        }
      }

      for (const sf of selectedFiles) {
        // Using relativePath as filename helps your backend preserve folder structure.
        formData.append('files', sf.file, sf.relativePath)
      }

      const res = await uploadFiles(formData, (pct, uploaded, total, speed) => {
        setUploadProgress(pct)
        if (uploaded !== undefined) setBytesUploaded(uploaded)
        if (total !== undefined) setTotalBytes(total)
        if (speed !== undefined) setUploadSpeed(speed)
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
        response?: { data?: { message?: string; error?: string } }
      }
      const backendMsg = err.response?.data?.message ?? err.response?.data?.error
      setError(`فشل الرفع: ${backendMsg ?? err.message ?? 'خطأ غير معروف'}`)
    } finally {
      setUploading(false)
      setUploadSpeed(0)
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

    try {
      await moveFileToTrash(key)
      setSuccess('تم نقل الملف إلى سلة المهملات بنجاح')
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(`فشل حذف الملف: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`)
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

  const fetchExplorer = useCallback(async () => {
    setLoadingExplorer(true)
    try {
      const res = await listUploadedObjects(explorerPrefix, 1000, true)
      setFoldersHere(res.folders ?? [])
      setFilesHere(res.objects ?? [])
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? err.message ?? 'فشل جلب الملفات')
    } finally {
      setLoadingExplorer(false)
    }
  }, [explorerPrefix])

  useEffect(() => {
    void fetchExplorer()
  }, [fetchExplorer])

  useEffect(() => {
    const unsubscribe = subscribeRealtime(
      (event) => {
        if (event.scope !== 'files') return
        void fetchExplorer()
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

  function prefixToDisplayName(prefix: string) {
    const p = String(prefix || '')
    if (!p) return ROOT_PREFIX
    const cleaned = p.endsWith('/') ? p.slice(0, -1) : p
    return cleaned
  }

  const breadcrumbs = useMemo(() => {
    const parts = currentPath.split('/').filter(Boolean)
    const crumbs: Array<{ label: string; path: string }> = [{ label: ROOT_PREFIX, path: '' }]
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
              onClick={() => navigate('/tasks')}
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
          <Box sx={{ display: 'flex', gap: 0, flexWrap: 'wrap', alignItems: 'center' }}>
            <FolderIcon sx={{ fontSize: 20, color: 'primary.main' }} />
            {breadcrumbs.map((c, idx) => (
              <Box key={`${c.path}_${idx}`} sx={{ display: 'flex', alignItems: 'center', }}>
                {idx > 0 && (
                  <Typography variant="body2" sx={{ opacity: 0.5, }}>
                    {">"}
                  </Typography>
                )}
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setCurrentPath(c.path)}
                  sx={{
                    borderRadius: 999,
                    fontSize: '0.875rem',
                    fontWeight: c.path === currentPath ? 600 : 400,
                    color: c.path === currentPath ? 'primary.main' : 'inherit',
                    px: 1
                  }}
                >
                  {c.label}
                </Button>
              </Box>
            ))}
            <Box sx={{ flex: '1 1 auto' }} />
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              وجهة الرفع: {prefixToDisplayName(explorerPrefix)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ flex: '1 1 auto' }} />
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
          </Box>
          <Button
            variant="outlined"
            onClick={() => {
              void fetchExplorer()
            }}
            disabled={uploading || loadingExplorer}
            startIcon={loadingExplorer ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
            sx={{ borderRadius: 999 }}
          >
            {loadingExplorer ? 'جارٍ التحديث...' : 'تحديث المحتويات'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => setShowTrash(!showTrash)}
            disabled={uploading}
            sx={{ borderRadius: 999 }}
          >
            {showTrash ? 'الملفات' : 'سلة المهملات'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/tasks')}
            disabled={uploading}
            sx={{ borderRadius: 999 }}
          >
            لوحة المهام
          </Button>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.9 }}>
            {showTrash ? 'سلة المهملات' : `داخل: ${prefixToDisplayName(explorerPrefix)}`}
          </Typography>

          {showTrash ? (
            loadingTrash ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  جارٍ تحميل سلة المهملات...
                </Typography>
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
              {loadingExplorer ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    جارٍ التحميل...
                  </Typography>
                </Box>
              ) : (
                <>
                  {foldersHere.length === 0 && filesHere.length === 0 ? (
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
                                const rel = cleaned.startsWith(`${ROOT_PREFIX}/`)
                                  ? cleaned.slice(`${ROOT_PREFIX}/`.length)
                                  : cleaned === ROOT_PREFIX
                                    ? ''
                                    : cleaned
                                return (
                                  <FolderItem
                                    key={p}
                                    folderPath={rel}
                                    onClick={() => setCurrentPath(rel)}
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
                                const rel = cleaned.startsWith(`${ROOT_PREFIX}/`)
                                  ? cleaned.slice(`${ROOT_PREFIX}/`.length)
                                  : cleaned === ROOT_PREFIX
                                    ? ''
                                    : cleaned
                                return (
                                  <FolderItemGrid
                                    key={p}
                                    folderPath={rel}
                                    onClick={() => setCurrentPath(rel)}
                                  />
                                )
                              })}
                            </Box>
                          )}
                        </Box>
                      )}

                      {filesHere.length > 0 && (
                        <Box>
                          <Typography variant="body2" sx={{ opacity: 0.75, mb: 1, fontWeight: 600 }}>
                            الملفات ({filesHere.length})
                          </Typography>
                          {viewMode === 'list' ? (
                            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                              {filesHere.slice(0, 200).map((obj) => {
                                const url = keyToPublicUrl(obj.key)
                                return (
                                  <FileItem
                                    key={obj.key}
                                    obj={obj}
                                    url={url}
                                    onDelete={handleDelete}
                                    onPreview={handlePreview}
                                  />
                                )
                              })}
                              {filesHere.length > 200 && (
                                <Box sx={{ p: 2, textAlign: 'center' }}>
                                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                    + {filesHere.length - 200} المزيد من الملفات...
                                  </Typography>
                                </Box>
                              )}
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
                                {filesHere.slice(0, 200).map((obj) => {
                                  const url = keyToPublicUrl(obj.key)
                                  return (
                                    <FileItemGrid
                                      key={obj.key}
                                      obj={obj}
                                      url={url}
                                      onDelete={handleDelete}
                                      onPreview={handlePreview}
                                    />
                                  )
                                })}
                              </Box>
                              {filesHere.length > 200 && (
                                <Box sx={{ p: 2, textAlign: 'center' }}>
                                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                    + {filesHere.length - 200} المزيد من الملفات...
                                  </Typography>
                                </Box>
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
                  جاري رفع {selectedFiles.length} ملفات...
                </Typography>
              </Box>
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

