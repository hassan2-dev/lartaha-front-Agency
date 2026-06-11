import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  LinearProgress,
  Alert,
} from '@mui/material'
import FolderIcon from '@mui/icons-material/Folder'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import ImageIcon from '@mui/icons-material/Image'
import VideoFileIcon from '@mui/icons-material/VideoFile'
import AudioFileIcon from '@mui/icons-material/AudioFile'
import DescriptionIcon from '@mui/icons-material/Description'
import DeleteIcon from '@mui/icons-material/Delete'
import RestoreIcon from '@mui/icons-material/Restore'
import CloseIcon from '@mui/icons-material/Close'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import MinimizeIcon from '@mui/icons-material/Minimize'
import DownloadIcon from '@mui/icons-material/Download'
import CheckIcon from '@mui/icons-material/Check'
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder'
import SelectAllIcon from '@mui/icons-material/SelectAll'
import LockIcon from '@mui/icons-material/Lock'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ReplayIcon from '@mui/icons-material/Replay'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import SpeedIcon from '@mui/icons-material/Speed'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import EncryptedUploadDropzone, {
  type SelectedUploadFile,
} from '../../components/EncryptedUploadDropzone'
import { PasswordInput } from '../../components/login/PasswordInput'
import EncryptedFileViewer from '../../components/EncryptedFileViewer'
import { useAuth } from '../../contexts/AuthContext'
import { API_ENV, TOKEN_STORAGE_KEY } from '../../config/api'
import { decryptThumbnailBuffer, encryptThumbnailBlob } from '../../lib/encryption'
import {
  listUploadedObjects,
  uploadFilesStreamed,
  moveFileToTrash,
  restoreFileFromTrash,
  listTrashFiles,
  fetchBulkPrivacySettings,
  bulkMoveToTrash,
  bulkRestoreFromTrash,
  createImageThumbnailBlob,
  createVideoThumbnailBlob,
  downloadWorkspaceFolderZip,
  deleteWorkspaceFolder,
  escapePathAfterFolderDelete,
  relativeFolderPathUnderDeleted,
  storageKeyUnderDeletedFolder,
  filterFoldersForExplorer,
  filterExplorerObjects,
  fetchTrashedOriginalKeys,
  loadPersistedTrashedKeys,
  persistTrashedKeys,
  addPersistedTrashedKeys,
} from '../../api/uploadApi'
import { subscribeRealtime } from '../../api/realtimeApi'
import { api } from '../../api/http'
import {
  FileItemSkeleton,
  FileItemGridSkeleton,
  FolderItemSkeleton,
  FolderItemGridSkeleton,
} from '../../components/SkeletonLoaders'
import Toast from '../../components/Toast'
import { ArchiveDownMinimalistic, FolderWithFiles, RestartSquare, ServerMinimalistic, Widget } from '@solar-icons/react'
import { useDownload } from '../../contexts/DownloadContext'
import type { DownloadItem } from '../../contexts/DownloadContext'
import { keyframes } from '@mui/system'

const highlightPulse = keyframes`
  0%   { border-color: var(--highlight-color); box-shadow: 0 0 0 3px rgba(var(--highlight-rgb), 0.4); }
  50%  { border-color: var(--highlight-color); box-shadow: 0 0 0 5px rgba(var(--highlight-rgb), 0.15); }
  100% { border-color: transparent; box-shadow: none; }
`

const uploadDevLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args)
}
const uploadDevWarn = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.warn(...args)
}

function fmtBytes(bytes: number | undefined) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

function fmtDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:00'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  const mm = m.toString().padStart(2, '0')
  const ss = s.toString().padStart(2, '0')
  if (h > 0) return `${h}:${mm}:${ss}`
  return `${mm}:${ss}`
}




function getFileType(filename: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
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

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'image':
      return <ImageIcon />
    case 'video':
      return <VideoFileIcon />
    case 'audio':
      return <AudioFileIcon />
    case 'document':
      return <DescriptionIcon />
    default:
      return <InsertDriveFileIcon />
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

/** مطابقة مفتاح الملف من الـ API مع المفتاح في القائمة (قد يُرفق لاحقة بعد ":"). */
function objectKeyMatchesDeepLink(fileKey: string, requested: string): boolean {
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

  // Fallback: same file name and same directory tail.
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

function deriveRelativeFolderFromFileKey(fileKey: string, workspaceId: string): string {
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

const CLIENT_KEY_STORAGE = 'file_encryption_password'

function getClientEncryptionKey(): string | null {
  try {
    return sessionStorage.getItem(CLIENT_KEY_STORAGE)
  } catch {
    return null
  }
}

function setClientEncryptionKey(key: string) {
  try {
    sessionStorage.setItem(CLIENT_KEY_STORAGE, key)
  } catch {
    // ignore storage errors
  }
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
  url: string
  filename: string
  size?: number
  encryptionEnabled?: boolean
  thumbnailKey?: string | null
}) {
  const [imgError, setImgError] = useState(false)
  const [decryptedThumbnailUrl, setDecryptedThumbnailUrl] = useState<string | null>(null)
  const [protectedThumbnailUrl, setProtectedThumbnailUrl] = useState<string | null>(null)
  const [protectedLoading, setProtectedLoading] = useState(false)
  const [decryptedLoading, setDecryptedLoading] = useState(false)

  // Determine which URL to use:
  // 1. If url is provided and looks like a thumbnail URL, use it directly
  // 2. If thumbnailKey is available, construct URL from it
  // 3. Otherwise use the main file URL
  // Note: encryptionEnabled doesn't affect whether we show the image - it only affects
  // whether we show a lock icon if there's no thumbnail (encrypted files can't show direct URL)
  const apiBase = API_ENV.apiBaseUrl?.trim() || ''
  const apiBaseNormalized = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase
  const displayUrl = (() => {
    // If url is provided and looks like a thumbnail URL, use it
    if (url && (url.includes('/api/image?') || url.includes('/api/image/'))) {
      return url
    }
    // Otherwise, construct URL from thumbnailKey
    if (thumbnailKey && typeof thumbnailKey === 'string' && thumbnailKey.trim() !== '') {
      const safeKey = thumbnailKey.startsWith('/') ? thumbnailKey.slice(1) : thumbnailKey
      return `${apiBaseNormalized}/api/image?key=${encodeURIComponent(safeKey)}`
    }
    return url
  })()

  useEffect(() => {
    if (encryptionEnabled) {
      setProtectedThumbnailUrl(null)
      return
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!displayUrl || !apiBaseNormalized) {
      setProtectedThumbnailUrl(null)
      return
    }

    const apiPrefix = `${apiBaseNormalized}/api/image`
    // For direct R2/public URLs (not /api/image paths), use the URL directly
    if (!displayUrl.startsWith(apiPrefix)) {
      setProtectedThumbnailUrl(displayUrl)
      return
    }

    if (!token) {
      setProtectedThumbnailUrl(null)
      return
    }

    setProtectedLoading(true)

    let cancelled = false
    let objectUrl: string | null = null

    const run = async () => {
      try {
        const response = await fetch(displayUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) return
        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) {
          setProtectedThumbnailUrl(objectUrl)
        }
      } catch {
        if (!cancelled) {
          setProtectedThumbnailUrl(null)
        }
      } finally {
        if (!cancelled) {
          setProtectedLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      setProtectedLoading(false)
      if (objectUrl && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [displayUrl, apiBaseNormalized, encryptionEnabled])
  useEffect(() => {
    if (!encryptionEnabled || !thumbnailKey || thumbnailKey.trim() === '') {
      setDecryptedThumbnailUrl(null)
      return
    }

    setDecryptedLoading(true)

    let cancelled = false
    let objectUrl: string | null = null

    const run = async () => {
      try {
        const key = getClientEncryptionKey()
        if (!key) return

        const safeKey = thumbnailKey.startsWith('/') ? thumbnailKey.slice(1) : thumbnailKey
        const fetchUrl = `${apiBaseNormalized}/api/image?key=${encodeURIComponent(safeKey)}`

        const headers: Record<string, string> = {}
        const token = localStorage.getItem(TOKEN_STORAGE_KEY)
        if (token) headers.Authorization = `Bearer ${token}`

        const response = await fetch(fetchUrl, { headers })
        if (!response.ok) return
        const encryptedBuffer = await response.arrayBuffer()
        let previewBlob: Blob
        try {
          previewBlob = await decryptThumbnailBuffer(encryptedBuffer, key)
        } catch {
          // Some uploads store thumbnails in plain JPEG form; use it directly.
          previewBlob = new Blob([encryptedBuffer], { type: 'image/jpeg' })
        }
        objectUrl = URL.createObjectURL(previewBlob)
        if (!cancelled) {
          setDecryptedThumbnailUrl(objectUrl)
        }
      } catch {
        if (!cancelled) {
          setDecryptedThumbnailUrl(null)
        }
      } finally {
        if (!cancelled) {
          setDecryptedLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      setDecryptedLoading(false)
      if (objectUrl && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [encryptionEnabled, thumbnailKey, apiBaseNormalized])

  // For non-encrypted files, use displayUrl directly if it's already a valid URL
  // (avoids unnecessary protected URL fetching for old files with direct R2 URLs)
  const effectiveUrl = encryptionEnabled
    ? decryptedThumbnailUrl || ''
    : protectedThumbnailUrl || displayUrl
  const showLock = encryptionEnabled === true && !effectiveUrl
  const showSpinner =
    !showLock && (protectedLoading || decryptedLoading) && !imgError && !effectiveUrl
  const imgSrc = effectiveUrl

  const handleImageError = () => {
    if (!imgError) {
      setImgError(true)
      setProtectedLoading(false)
      setDecryptedLoading(false)
    }
  }

  const handleImageLoad = () => {
    setProtectedLoading(false)
    setDecryptedLoading(false)
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
      {showSpinner ? (
        <CircularProgress size={size * 0.4} thickness={4} />
      ) : showLock ? (
        <LockIcon sx={{ fontSize: size * 0.5, color: 'text.secondary' }} />
      ) : (
        <img
          src={imgSrc}
          alt={filename}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={handleImageError}
          onLoad={handleImageLoad}
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
  encryptionEnabled,
}: {
  url: string
  thumbnailKey?: string | null
  size?: number
  encryptionEnabled?: boolean
}) {
  const [decryptedThumbnailUrl, setDecryptedThumbnailUrl] = useState<string | null>(null)
  const [protectedThumbnailUrl, setProtectedThumbnailUrl] = useState<string | null>(null)
  const [protectedLoading, setProtectedLoading] = useState(false)
  const [decryptedLoading, setDecryptedLoading] = useState(false)
  // Determine which URL to use:
  // 1. If url is provided (thumbnail URL), use it directly
  // 2. If thumbnailKey is available, construct URL from it
  // 3. Otherwise use empty string (will show placeholder)
  const apiBase = API_ENV.apiBaseUrl?.trim() || ''
  const apiBaseNormalized = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase
  const displayUrl = (() => {
    // If url is provided and looks like a thumbnail URL, use it directly
    if (url && (url.includes('/api/image?') || url.includes('/api/image/'))) {
      return url
    }
    // If url is a direct R2/public URL (not /api/image path), use it directly
    if (url && !url.includes('/api/image?') && !url.includes('/api/image/')) {
      return url
    }
    // Otherwise, construct URL from thumbnailKey (for encrypted or newer files)
    if (thumbnailKey) {
      const safeKey = thumbnailKey.startsWith('/') ? thumbnailKey.slice(1) : thumbnailKey
      return `${apiBaseNormalized}/api/image?key=${encodeURIComponent(safeKey)}`
    }
    return ''
  })()

  useEffect(() => {
    if (encryptionEnabled) {
      setProtectedThumbnailUrl(null)
      return
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!displayUrl || !apiBaseNormalized) {
      setProtectedThumbnailUrl(null)
      return
    }

    const apiPrefix = `${apiBaseNormalized}/api/image`
    // For direct R2/public URLs (not /api/image path), use the URL directly
    if (!displayUrl.startsWith(apiPrefix)) {
      setProtectedThumbnailUrl(displayUrl)
      return
    }

    if (!token) {
      setProtectedThumbnailUrl(null)
      return
    }

    setProtectedLoading(true)

    let cancelled = false
    let objectUrl: string | null = null

    const run = async () => {
      try {
        const response = await fetch(displayUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) return
        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) {
          setProtectedThumbnailUrl(objectUrl)
        }
      } catch {
        if (!cancelled) {
          setProtectedThumbnailUrl(null)
        }
      } finally {
        if (!cancelled) {
          setProtectedLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      setProtectedLoading(false)
      if (objectUrl && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [displayUrl, apiBaseNormalized, encryptionEnabled])

  useEffect(() => {
    if (!thumbnailKey || thumbnailKey.trim() === '') {
      setDecryptedThumbnailUrl(null)
      return
    }

    setDecryptedLoading(true)

    let cancelled = false
    let objectUrl: string | null = null

    const run = async () => {
      try {
        const key = getClientEncryptionKey()
        if (!key) return

        const safeKey = thumbnailKey.startsWith('/') ? thumbnailKey.slice(1) : thumbnailKey
        const fetchUrl = `${apiBaseNormalized}/api/image?key=${encodeURIComponent(safeKey)}`

        const headers: Record<string, string> = {}
        const token = localStorage.getItem(TOKEN_STORAGE_KEY)
        if (token) headers.Authorization = `Bearer ${token}`

        const response = await fetch(fetchUrl, { headers })
        if (!response.ok) return
        const encryptedBuffer = await response.arrayBuffer()
        let previewBlob: Blob
        try {
          previewBlob = await decryptThumbnailBuffer(encryptedBuffer, key)
        } catch {
          // Some uploads store thumbnails in plain JPEG form; use it directly.
          previewBlob = new Blob([encryptedBuffer], { type: 'image/jpeg' })
        }
        objectUrl = URL.createObjectURL(previewBlob)
        if (!cancelled) {
          setDecryptedThumbnailUrl(objectUrl)
        }
      } catch {
        if (!cancelled) {
          setDecryptedThumbnailUrl(null)
        }
      } finally {
        if (!cancelled) {
          setDecryptedLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      setDecryptedLoading(false)
      if (objectUrl && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [thumbnailKey, apiBaseNormalized])

  const effectiveUrl = encryptionEnabled
    ? decryptedThumbnailUrl || ''
    : protectedThumbnailUrl || displayUrl
  const showPlayIcon = !!effectiveUrl
  const showSpinner = !showPlayIcon && (protectedLoading || decryptedLoading)

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
      {showSpinner ? (
        <CircularProgress size={size * 0.4} thickness={4} />
      ) : showPlayIcon ? (
        <img
          src={effectiveUrl}
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

      {/* Play icon overlay - only show when thumbnail is loaded */}
      {showPlayIcon && (
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
      )}
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
  highlighted,
  onToggleSelect,
}: {
  obj: {
    key: string
    size?: number
    createdAt?: string
    thumbnailKey?: string | null
    encryptionEnabled?: boolean
    fileId?: string
  }
  url: string
  thumbnailUrl?: string
  onDelete: (key: string) => void
  onPreview: (key: string, url: string) => void
  onDownload: (key: string, filename: string) => void
  onPrivacyToggle: (key: string, filename: string) => void
  filePrivacySettings: Record<
    string,
    { restricted: boolean; allowedMembers: string[]; canAccess?: boolean }
  >
  canAccessFile: (key: string) => boolean
  isDeleting?: boolean
  selected?: boolean
  highlighted?: boolean
  onToggleSelect?: (key: string) => void
}) {
  const filename = filenameFromKey(obj.key)
  const fileType = getFileType(filename)
  const isImage = fileType === 'image'
  const isVideo = fileType === 'video'
  const resolvedThumbnailKey = obj.thumbnailKey?.trim() ? obj.thumbnailKey : null
  const hasAccess = canAccessFile(obj.key)
  const privacySettings = filePrivacySettings[obj.key]
  const isRestricted = privacySettings?.restricted
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <ListItem
      key={obj.key}
      data-file-key={obj.key}
      onClick={() => hasAccess && onPreview(obj.key, url)}
      className="flex-col md:flex-row"
      sx={{
        py: 1.5,
        px: 2,
        alignItems: 'center',
        gap: 2,
        borderRadius: 2,
        mb: 1,
        border: '1px solid',
        '--highlight-color': theme.palette.primary.main,
        '--highlight-rgb': '25, 118, 210',
        animation: highlighted ? `${highlightPulse} 2.5s ease-out forwards` : 'none',
        borderColor: highlighted
          ? 'primary.main'
          : selected
            ? 'primary.main'
            : isDark
              ? 'rgba(255,255,255,0.08)'
              : theme.palette.divider,
        backgroundColor: isRestricted
          ? isDark
            ? 'rgba(255,0,0,0.02)'
            : 'rgba(211, 47, 47, 0.04)'
          : isDark
            ? 'rgba(255,255,255,0.02)'
            : theme.palette.background.paper,
        cursor: hasAccess ? 'pointer' : 'default',
        opacity: isRestricted && !hasAccess ? 0.6 : 1,
        '&:hover': {
          backgroundColor: hasAccess
            ? isDark
              ? 'rgba(255,255,255,0.05)'
              : alpha(theme.palette.primary.main, 0.04)
            : isDark
              ? 'rgba(255,0,0,0.05)'
              : 'rgba(211, 47, 47, 0.08)',
        },
      }}
    >
      <div className="hidden md:block">
        {onToggleSelect && (
          <Checkbox
            checked={!!selected}
            onClick={e => {
              e.stopPropagation()
              onToggleSelect(obj.key)
            }}
            sx={{ p: 0, mr: 1 }}
          />
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center gap-1 flex-1">
        {isImage && url && hasAccess ? (
          <Box sx={{ position: 'relative' }}>
            <ImageThumbnail
              url={url}
              filename={filename}
              encryptionEnabled={obj.encryptionEnabled}
              thumbnailKey={resolvedThumbnailKey}
            />
            <ThumbnailTypeBadge fileType={fileType} size={14} />
            {isRestricted && !hasAccess && (
              <Box
                sx={{
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
                }}
              >
                <LockIcon sx={{ fontSize: 24, color: 'white' }} />
              </Box>
            )}
          </Box>
        ) : isVideo && hasAccess ? (
          <Box sx={{ position: 'relative' }}>
            <VideoThumbnail
              url={thumbnailUrl || ''}
              thumbnailKey={resolvedThumbnailKey}
              encryptionEnabled={obj.encryptionEnabled}
            />
            <ThumbnailTypeBadge fileType={fileType} size={14} />
            {isRestricted && !hasAccess && (
              <Box
                sx={{
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
                }}
              >
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
        <Box sx={{ minWidth: 0, maxWidth: 300, display: 'flex', flexDirection: 'column' }}>
          <Typography
            variant="body2"
            sx={{ wordBreak: 'break-word', opacity: 0.92, fontWeight: 500 }}
          >
            {filename}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mt: 0.5 }}>
            {obj.size && (
              <Typography variant="caption" sx={{ opacity: 0.7, textAlign: 'start' }}>
                {fmtBytes(obj.size)}
              </Typography>
            )}
            {obj.createdAt && (
              <Typography variant="caption" sx={{ opacity: 0.7, textAlign: 'start' }}>
                {new Date(obj.createdAt).toLocaleDateString('ar-SA', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Typography>
            )}
          </Box>
          {isRestricted && (
            <Typography
              variant="caption"
              sx={{ opacity: 0.7, display: 'block', color: 'error.main' }}
            >
              محدود الوصول
            </Typography>
          )}
        </Box>
      </div>

      {url && (
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title="إعدادات الخصوصية">
            <Button
              size="small"
              variant="text"
              onClick={e => {
                e.stopPropagation()
                onPrivacyToggle(obj.key, filename)
              }}
              sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
            >
              <LockIcon
                sx={{ fontSize: 16, color: isRestricted ? 'error.main' : 'text.secondary' }}
              />
            </Button>
          </Tooltip>
          <Tooltip title="تنزيل">
            <Button
              size="small"
              variant="text"
              onClick={e => {
                e.stopPropagation()
                onDownload(obj.key, filename)
              }}
              disabled={!hasAccess}
              sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
            >
              <DownloadIcon />
            </Button>
          </Tooltip>
          {/* <CopyLinkButton url={url} /> */}
          <Tooltip title="حذف">
            <Button
              size="small"
              variant="text"
              onClick={e => {
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
  highlighted,
  onToggleSelect,
}: {
  obj: {
    key: string
    size?: number
    createdAt?: string
    thumbnailKey?: string | null
    encryptionEnabled?: boolean
  }
  url: string
  thumbnailUrl?: string
  onDelete: (key: string) => void
  onPreview: (key: string, url: string) => void
  onDownload: (key: string, filename: string) => void
  onPrivacyToggle: (key: string, filename: string) => void
  filePrivacySettings: Record<
    string,
    { restricted: boolean; allowedMembers: string[]; canAccess?: boolean }
  >
  canAccessFile: (key: string) => boolean
  isDeleting?: boolean
  selected?: boolean
  highlighted?: boolean
  onToggleSelect?: (key: string) => void
}) {
  const filename = filenameFromKey(obj.key)
  const fileType = getFileType(filename)
  const isImage = fileType === 'image'
  const isVideo = fileType === 'video'
  const resolvedThumbnailKey = obj.thumbnailKey?.trim() ? obj.thumbnailKey : null
  const hasAccess = canAccessFile(obj.key)
  const privacySettings = filePrivacySettings[obj.key]
  const isRestricted = privacySettings?.restricted
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Card
      data-file-key={obj.key}
      onClick={() => hasAccess && onPreview(obj.key, url)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        border: '1px solid',
        '--highlight-color': theme.palette.primary.main,
        '--highlight-rgb': '25, 118, 210',
        animation: highlighted ? `${highlightPulse} 2.5s ease-out forwards` : 'none',
        borderColor: highlighted
          ? 'primary.main'
          : selected
            ? 'primary.main'
            : isDark
              ? 'rgba(255,255,255,0.08)'
              : theme.palette.divider,
        backgroundColor: isRestricted
          ? isDark
            ? 'rgba(211, 47, 47, 0.12)'
            : 'rgba(211, 47, 47, 0.08)'
          : isDark
            ? 'rgba(255,255,255,0.02)'
            : theme.palette.background.paper,
        cursor: hasAccess ? 'pointer' : 'default',
        opacity: isRestricted && !hasAccess ? 0.6 : 1,
        '&:hover': {
          backgroundColor: hasAccess
            ? isDark
              ? 'rgba(255,255,255,0.05)'
              : alpha(theme.palette.primary.main, 0.04)
            : isDark
              ? 'rgba(211, 47, 47, 0.15)'
              : 'rgba(211, 47, 47, 0.12)',
        },
      }}
    >
      {onToggleSelect && (
        <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}>
          <Checkbox
            checked={!!selected}
            onClick={e => {
              e.stopPropagation()
              onToggleSelect(obj.key)
            }}
            sx={{ p: 0 }}
          />
        </Box>
      )}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: 120,
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {isImage && url && hasAccess ? (
            <Box sx={{ position: 'relative' }}>
              <ImageThumbnail
                url={url}
                filename={filename}
                size={80}
                encryptionEnabled={obj.encryptionEnabled}
                thumbnailKey={resolvedThumbnailKey}
              />
              <ThumbnailTypeBadge fileType={fileType} size={14} />
              {isRestricted && !hasAccess && (
                <Box
                  sx={{
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
                  }}
                >
                  <LockIcon sx={{ fontSize: 20, color: 'white' }} />
                </Box>
              )}
            </Box>
          ) : isVideo && hasAccess ? (
            <Box sx={{ position: 'relative' }}>
              <VideoThumbnail
                url={thumbnailUrl || ''}
                thumbnailKey={resolvedThumbnailKey}
                size={80}
                encryptionEnabled={obj.encryptionEnabled}
              />
              <ThumbnailTypeBadge fileType={fileType} size={14} />
              {isRestricted && !hasAccess && (
                <Box
                  sx={{
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
                  }}
                >
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
          {/* <Box sx={{ minWidth: 0, maxWidth: 120, flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                wordBreak: 'break-word',
                opacity: 0.92,
                fontWeight: 500,
                fontSize: '0.75rem',
                lineHeight: 1.2,
              }}
            >
              {filename}
            </Typography>
          </Box> */}
        </Box>
        {obj.size && (
          <Typography
            variant="caption"
            sx={{
              opacity: 0.7,
              textAlign: 'center',
            }}
          >
            {fmtBytes(obj.size)}
          </Typography>
        )}
        {obj.createdAt && (
          <Typography
            variant="caption"
            sx={{
              opacity: 0.7,
              textAlign: 'center',
            }}
          >
            {new Date(obj.createdAt).toLocaleDateString('ar-SA', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </Typography>
        )}
        {isRestricted && (
          <Typography
            variant="caption"
            sx={{
              opacity: 0.7,
              textAlign: 'center',
              color: 'error.main',
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
              onClick={e => {
                e.stopPropagation()
                onPrivacyToggle(obj.key, filename)
              }}
              sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
            >
              <LockIcon
                sx={{ fontSize: 16, color: isRestricted ? 'error.main' : 'text.secondary' }}
              />
            </Button>
          </Tooltip>
          <Tooltip title="تنزيل">
            <Button
              size="small"
              variant="text"
              onClick={e => {
                e.stopPropagation()
                onDownload(obj.key, filename)
              }}
              disabled={!hasAccess}
              sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
            >
              <DownloadIcon />
            </Button>
          </Tooltip>
          {/* <CopyLinkButton url={url} /> */}
          <Tooltip title="حذف">
            <Button
              size="small"
              variant="text"
              onClick={e => {
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
  onToggleSelect,
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
  const permanentDeleteDate = file.permanentDeleteAt
    ? new Date(file.permanentDeleteAt).toLocaleDateString('ar-SA')
    : ''
  const deletedBy = file.deletedBy

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
        borderColor: selected
          ? 'primary.main'
          : isDark
            ? 'rgba(255,255,255,0.08)'
            : theme.palette.divider,
        backgroundColor: isDark ? 'rgba(233, 30, 99, 0.10)' : 'rgba(233, 30, 99, 0.04)',
        '&:hover': {
          backgroundColor: isDark ? 'rgba(233, 30, 99, 0.14)' : 'rgba(233, 30, 99, 0.07)',
        },
      }}
    >
      {onToggleSelect && (
        <Checkbox
          checked={!!selected}
          onClick={e => {
            e.stopPropagation()
            onToggleSelect(file.originalKey)
          }}
          sx={{ p: 0, mr: 1 }}
        />
      )}
      {/* Icon */}
      <Avatar
        sx={{
          width: 48,
          height: 48,
          backgroundColor: isDark ? 'rgba(233, 30, 99, 0.18)' : 'rgba(233, 30, 99, 0.12)',
          color: isDark ? 'pink' : '#c2185b',
        }}
      >
        {getFileIcon(fileType)}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{ wordBreak: 'break-word', opacity: 0.92, fontWeight: 500 }}
        >
          {filename}
        </Typography>

        {/* Deleted by information */}
        {deletedBy && (
          <Typography
            variant="caption"
            sx={{ opacity: 0.8, display: 'block', color: 'primary.main' }}
          >
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
            sx={{ borderRadius: 999, minWidth: 'auto', p: 1, color: '#fff' }}
          >
            <RestartSquare size={40} weight={"BoldDuotone"} />
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
  onClose,
  onDownload,
}: {
  open: boolean
  file: { key: string; url: string; filename: string; type: string } | null
  onClose: () => void
  onDownload?: () => void
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
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body1" sx={{ fontSize: '1.25rem', fontWeight: 500 }}>
          معاينة: {file.filename}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ minHeight: 300, display: 'flex', alignItems: 'center' }}>
        {renderPreview()}
      </DialogContent>
      {onDownload && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={onDownload}
            sx={{ borderRadius: 999 }}
          >
            تحميل
          </Button>
        </DialogActions>
      )}
    </Dialog>
  )
}

// Folder item component
function FolderItem({
  folderPath,
  onClick,
  onDelete,
  onDownload,
  isDeleting,
  isDownloading,
  canDelete,
}: {
  folderPath: string
  onClick: () => void
  onDelete: (folderPath: string) => void
  onDownload: (folderPath: string) => void
  isDeleting?: boolean
  isDownloading?: boolean
  canDelete?: boolean
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
          backgroundColor: isDark
            ? 'rgba(255,255,255,0.05)'
            : alpha(theme.palette.primary.main, 0.04),
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
          cursor: 'pointer',
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
          <FolderWithFiles weight='BoldDuotone' size={28} />
        </Avatar>
        <Box
          sx={{
            minWidth: 0,
            maxWidth: 300,
            justifyContent: 'center',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography
            variant="body2"
            sx={{ wordBreak: 'break-word', opacity: 0.92, fontWeight: 500 }}
          >
            {name}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7, textAlign: 'start' }}>
            مجلد
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
        <Tooltip title="تنزيل المجلد">
          <span style={{ display: 'inline-flex' }}>
            <Button
              size="small"
              variant="text"
              onClick={e => {
                e.stopPropagation()
                onDownload(folderPath)
              }}
              disabled={isDownloading || isDeleting}
              sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
            >
              {isDownloading ? <CircularProgress size={20} /> : <ArchiveDownMinimalistic size={28} weight='BoldDuotone' />}
            </Button>
          </span>
        </Tooltip>
        {canDelete && (
          <Tooltip title="حذف المجلد (مدير)">
            <span style={{ display: 'inline-flex' }}>
              <Button
                size="small"
                variant="text"
                onClick={e => {
                  e.stopPropagation()
                  onDelete(folderPath)
                }}
                disabled={isDeleting || isDownloading}
                sx={{ borderRadius: 999, minWidth: 'auto', p: 1, color: '#666' }}
              >
                {isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
              </Button>
            </span>
          </Tooltip>
        )}
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
  isDeleting,
  isDownloading,
  canDelete,
}: {
  folderPath: string
  onClick: () => void
  onDelete: (folderPath: string) => void
  onDownload: (folderPath: string) => void
  isDeleting?: boolean
  isDownloading?: boolean
  canDelete?: boolean
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
          backgroundColor: isDark
            ? 'rgba(255,255,255,0.05)'
            : alpha(theme.palette.primary.main, 0.04),
        },
      }}
    >
      <Box
        onClick={onClick}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          cursor: 'pointer',
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minHeight: 120,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexDirection: "column" }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'inherit',
              }}
            >
              <FolderWithFiles weight='BoldDuotone' size={32} />
            </Avatar>
            <Box sx={{ minWidth: 0, maxWidth: 120, flex: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  wordBreak: 'break-word',
                  opacity: 0.92,
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  lineHeight: 1.2,
                }}
              >
                {name}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.7,
                  display: 'block',
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
          <span style={{ display: 'inline-flex' }}>
            <Button
              size="small"
              variant="text"
              onClick={e => {
                e.stopPropagation()
                onDownload(folderPath)
              }}
              disabled={isDownloading || isDeleting}
              sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
            >
              {isDownloading ? <CircularProgress size={20} /> : <ArchiveDownMinimalistic size={28} weight='BoldDuotone' />}
            </Button>
          </span>
        </Tooltip>
        {canDelete && (
          <Tooltip title="حذف المجلد (مدير)">
            <span style={{ display: 'inline-flex' }}>
              <Button
                size="small"
                variant="text"
                onClick={e => {
                  e.stopPropagation()
                  onDelete(folderPath)
                }}
                disabled={isDeleting || isDownloading}
                sx={{ borderRadius: 999, minWidth: 'auto', p: 1, color: '#666' }}
              >
                {isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
              </Button>
            </span>
          </Tooltip>
        )}
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

// Copy link button component with feedback
// function CopyLinkButton({ url }: { url: string }) {
//   const [copied, setCopied] = useState(false)

//   const handleCopy = async () => {
//     try {
//       await navigator.clipboard.writeText(url)
//       setCopied(true)
//       setTimeout(() => setCopied(false), 2000) // Reset after 2 seconds
//     } catch (error) {
//       console.error('Failed to copy link:', error)
//     }
//   }

//   return (
//     <Tooltip title={copied ? 'تم نسخ الرابط!' : 'نسخ الرابط'}>
//       <Button
//         size="small"
//         variant="text"
//         onClick={e => {
//           e.stopPropagation()
//           void handleCopy()
//         }}
//         sx={{
//           borderRadius: 999,
//           minWidth: 'auto',
//           p: 1,
//           color: copied ? 'success.main' : 'text.primary',
//         }}
//       >
//         {copied ? (
//           <CheckIcon />
//         ) : (
//           <LinkIcon
//             sx={{
//               transform: 'rotate(-45deg)',
//               color: 'text.secondary',
//             }}
//           />
//         )}
//       </Button>
//     </Tooltip>
//   )
// }

// Download progress types — kept for legacy non-encrypted downloads
// The primary state is now in DownloadContext (DownloadItem)
type DownloadProgress = DownloadItem

const MAX_DOWNLOAD_RETRIES = 3

function formatSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '0 B/s'
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytesPerSecond) / Math.log(1024)))
  const value = bytesPerSecond / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--'
  if (seconds < 60) return `${Math.round(seconds)} ثانية`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} دقيقة`
  return `${Math.floor(seconds / 3600)} ساعة ${Math.floor((seconds % 3600) / 60)} دقيقة`
}

// Download progress dialog — uses global DownloadContext
function DownloadProgressDialog() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const {
    downloads,
    updateDownload,
    removeDownload,
    clearCompleted,
    abortControllers,
    isMinimized,
    setIsMinimized,
    showDialog,
    setShowDialog,
  } = useDownload()

  const list = Array.from(downloads.values())
  const activeList = list.filter(
    d =>
      d.status === 'downloading' ||
      d.status === 'decrypting' ||
      d.status === 'pending' ||
      d.status === 'paused'
  )
  const completedList = list.filter(d => d.status === 'completed')
  const failedList = list.filter(d => d.status === 'failed' || d.status === 'cancelled')
  const allDone =
    list.length > 0 &&
    list.every(
      d =>
        d.status !== 'downloading' &&
        d.status !== 'decrypting' &&
        d.status !== 'pending' &&
        d.status !== 'paused'
    )

  const overallProgress =
    list.length > 0 ? Math.round(list.reduce((sum, d) => sum + d.progress, 0) / list.length) : 0

  const handleCancel = (key: string) => {
    const ac = abortControllers.current.get(key)
    if (ac) {
      ac.abort()
      abortControllers.current.delete(key)
    }
    updateDownload(key, { status: 'cancelled', error: 'تم الإلغاء' })
  }

  const handlePauseResume = (key: string, current: DownloadProgress) => {
    if (current.status === 'paused') {
      // Resume: re-trigger — handlers will pick up pausedChunks and continue with Range
      const [s3Key, ...filenameParts] = current.key.split(':')
      const filename = filenameParts.join(':')
      window.dispatchEvent(new CustomEvent('retry-download', { detail: { key: s3Key, filename } }))
    } else {
      // Pause: abort — the download handler's abort branch saves chunks to pausedChunks
      const ac = abortControllers.current.get(key)
      if (ac) ac.abort()
      // Status is set to 'paused' inside the handler's AbortError catch
    }
  }

  const handleRetry = (key: string) => {
    const d = downloads.get(key)
    if (!d) return
    removeDownload(key)
    // Re-trigger download by dispatching a custom event that UploadPage listens to
    window.dispatchEvent(
      new CustomEvent('retry-download', { detail: { key: d.key, filename: d.filename } })
    )
  }

  if (!showDialog || list.length === 0) return null

  return (
    <Dialog
      open={!isMinimized}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      onClose={() => setIsMinimized(true)}
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: t =>
            `linear-gradient(145deg, ${t.palette.background.paper} 0%, ${t.palette.background.default} 100%)`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        },
      }}
    >
      {/* Gradient header */}
      <Box
        sx={{
          background: t =>
            `linear-gradient(135deg, ${t.palette.info.dark} 0%, ${t.palette.info.main} 100%)`,
          p: 3,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }}
        />

        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2.5,
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <DownloadIcon sx={{ fontSize: 28, color: 'white' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mb: 0.5 }}>
              {allDone ? 'اكتملت التنزيلات!' : 'جاري التنزيل'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              {completedList.length} من {list.length} ملفات اكتملت
            </Typography>
          </Box>
          <IconButton
            onClick={() => setIsMinimized(true)}
            sx={{
              color: 'white',
              opacity: 0.8,
              '&:hover': { opacity: 1, background: 'rgba(255,255,255,0.1)' },
            }}
          >
            <MinimizeIcon />
          </IconButton>
          <IconButton
            onClick={() => {
              clearCompleted()
              if (
                list.every(
                  d => d.status === 'completed' || d.status === 'failed' || d.status === 'cancelled'
                )
              ) {
                setShowDialog(false)
              } else {
                setIsMinimized(true)
              }
            }}
            sx={{
              color: 'white',
              opacity: 0.8,
              '&:hover': { opacity: 1, background: 'rgba(255,255,255,0.1)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* Overall progress */}
        {!allDone && (
          <Box
            sx={{
              mb: 3,
              p: 2.5,
              borderRadius: 2,
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: t => `1px solid ${t.palette.divider}`,
            }}
          >
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500, opacity: 0.9 }}>
                التقدم الإجمالي
              </Typography>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: 'info.main', fontSize: '1.5rem' }}
              >
                {overallProgress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={overallProgress}
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 5,
                  background: t =>
                    `linear-gradient(90deg, ${t.palette.info.main} 0%, ${t.palette.info.light} 100%)`,
                },
              }}
            />
          </Box>
        )}

        {/* All done success banner */}
        {allDone && (
          <Box
            sx={{
              mb: 3,
              p: 3,
              borderRadius: 2,
              background: isDark ? 'rgba(76,175,80,0.15)' : 'rgba(76,175,80,0.1)',
              border: t => `1px solid ${t.palette.success.main}`,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <Typography sx={{ color: 'white', fontSize: 28, fontWeight: 700 }}>✓</Typography>
            </Box>
            <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 700 }}>
              اكتملت جميع التنزيلات!
            </Typography>
          </Box>
        )}

        {/* Active / paused downloads */}
        <Box
          sx={{
            maxHeight: 320,
            overflow: 'auto',
            borderRadius: 2,
            border: t => `1px solid ${t.palette.divider}`,
          }}
        >
          {activeList.map((download, idx) => {
            const remaining =
              download.speed > 0
                ? (download.totalBytes - download.bytesDownloaded) / download.speed
                : 0
            const eta = download.progress < 100 && download.speed > 0 ? formatTime(remaining) : ''
            const isDecrypting = download.status === 'decrypting'
            const isPaused = download.status === 'paused'

            return (
              <Box
                key={download.key}
                sx={{
                  p: 2,
                  borderBottom:
                    idx < activeList.length - 1 ? t => `1px solid ${t.palette.divider}` : 'none',
                  background: isPaused
                    ? isDark
                      ? 'rgba(255,152,0,0.06)'
                      : 'rgba(255,152,0,0.04)'
                    : 'transparent',
                  transition: 'background-color 0.2s',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
                  {/* Icon */}
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: isPaused
                        ? 'rgba(255,152,0,0.15)'
                        : t => `${t.palette.info.main}15`,
                    }}
                  >
                    {isPaused ? (
                      <PauseIcon sx={{ fontSize: 20, color: 'warning.main' }} />
                    ) : (
                      <DownloadIcon sx={{ fontSize: 20, color: 'info.main' }} />
                    )}
                  </Box>

                  {/* Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, mb: 0.5, wordBreak: 'break-word', lineHeight: 1.4 }}
                    >
                      {download.filename}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      {download.totalBytes > 0 && (
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>
                          {fmtBytes(download.bytesDownloaded)} / {fmtBytes(download.totalBytes)}
                        </Typography>
                      )}
                      {!isDecrypting && download.speed > 0 && (
                        <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 500 }}>
                          {formatSpeed(download.speed)}
                        </Typography>
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: isPaused
                            ? 'warning.main'
                            : isDecrypting
                              ? 'secondary.main'
                              : 'info.main',
                        }}
                      >
                        {isPaused
                          ? 'متوقف'
                          : isDecrypting
                            ? `فك تشفير ${download.decryptionProgress ?? download.progress}%`
                            : `${download.progress}%`}
                      </Typography>
                      {eta && !isPaused && (
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>
                          المتبقي: {eta}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Controls */}
                  {!isDecrypting && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      <Tooltip title={isPaused ? 'استئناف' : 'إيقاف مؤقت'}>
                        <IconButton
                          size="small"
                          onClick={() => handlePauseResume(download.key, download)}
                          sx={{
                            width: 32,
                            height: 32,
                            color: isPaused ? 'success.main' : 'warning.main',
                            backgroundColor: isPaused
                              ? 'rgba(76,175,80,0.12)'
                              : 'rgba(255,152,0,0.12)',
                            '&:hover': {
                              backgroundColor: isPaused
                                ? 'rgba(76,175,80,0.22)'
                                : 'rgba(255,152,0,0.22)',
                            },
                          }}
                        >
                          {isPaused ? (
                            <PlayArrowIcon sx={{ fontSize: 18 }} />
                          ) : (
                            <PauseIcon sx={{ fontSize: 18 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="إلغاء">
                        <IconButton
                          size="small"
                          onClick={() => handleCancel(download.key)}
                          sx={{
                            width: 32,
                            height: 32,
                            color: 'error.main',
                            backgroundColor: 'rgba(244,67,54,0.12)',
                            '&:hover': { backgroundColor: 'rgba(244,67,54,0.22)' },
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </Box>

                {/* Progress bar */}
                <Box sx={{ ml: 7 }}>
                  <LinearProgress
                    variant="determinate"
                    value={
                      isDecrypting
                        ? (download.decryptionProgress ?? download.progress)
                        : download.progress
                    }
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        background: isPaused
                          ? t =>
                            `linear-gradient(90deg, ${t.palette.warning.main} 0%, ${t.palette.warning.light} 100%)`
                          : isDecrypting
                            ? t =>
                              `linear-gradient(90deg, ${t.palette.secondary.main} 0%, ${t.palette.secondary.light} 100%)`
                            : t =>
                              `linear-gradient(90deg, ${t.palette.info.main} 0%, ${t.palette.info.light} 100%)`,
                      },
                    }}
                  />
                </Box>
              </Box>
            )
          })}

          {/* Completed */}
          {completedList.map(download => (
            <Box
              key={download.key}
              sx={{
                p: 2,
                background: isDark ? 'rgba(76,175,80,0.08)' : 'rgba(76,175,80,0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderBottom: t => `1px solid ${t.palette.divider}`,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: 'rgba(76,175,80,0.15)',
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
                  {download.filename}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.6 }}>
                  اكتمل • {download.totalBytes > 0 ? fmtBytes(download.totalBytes) : ''}
                  {download.speed > 0 ? ` • ${formatSpeed(download.speed)}` : ''}
                </Typography>
              </Box>
              <Tooltip title="إزالة">
                <IconButton
                  size="small"
                  onClick={() => removeDownload(download.key)}
                  sx={{ color: 'text.secondary' }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}

          {/* Failed / cancelled */}
          {failedList.map(download => (
            <Box
              key={download.key}
              sx={{
                p: 2,
                background: isDark ? 'rgba(244,67,54,0.08)' : 'rgba(244,67,54,0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderBottom: t => `1px solid ${t.palette.divider}`,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: 'rgba(244,67,54,0.15)',
                }}
              >
                <ErrorOutlineIcon sx={{ fontSize: 20, color: 'error.main' }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
                  {download.filename}
                </Typography>
                <Typography variant="caption" sx={{ color: 'error.main', opacity: 0.9 }}>
                  {download.error || 'فشل التنزيل'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {download.status !== 'cancelled' && download.retries < MAX_DOWNLOAD_RETRIES && (
                  <Tooltip title="إعادة المحاولة">
                    <IconButton
                      size="small"
                      onClick={() => handleRetry(download.key)}
                      sx={{ color: 'warning.main' }}
                    >
                      <ReplayIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="إزالة">
                  <IconButton
                    size="small"
                    onClick={() => removeDownload(download.key)}
                    sx={{ color: 'text.secondary' }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>

      {allDone && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              clearCompleted()
              setShowDialog(false)
            }}
            variant="contained"
            color="info"
            sx={{ borderRadius: 999 }}
          >
            إغلاق
          </Button>
        </DialogActions>
      )}
    </Dialog>
  )
}

// Download progress tracking functions - must be used within component context
export default function UploadPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Download progress — backed by global DownloadContext
  const { addDownload, updateDownload, downloads, abortControllers, pausedChunks } = useDownload()

  // Non-encrypted direct download with AbortController + streaming progress + pause/resume via Range
  const handleDownload = useCallback(
    async (key: string, filename: string, retryCount = 0) => {
      const downloadKey = `${key}:${filename}`
      const base = API_ENV.apiBaseUrl?.trim() || ''
      const token = localStorage.getItem(TOKEN_STORAGE_KEY)

      if (!base || !token) {
        addDownload({
          key: downloadKey,
          filename,
          status: 'failed',
          progress: 0,
          bytesDownloaded: 0,
          totalBytes: 0,
          speed: 0,
          startTime: Date.now(),
          error: !base ? 'Missing API base URL' : 'Missing auth token',
          retries: retryCount,
        })
        return
      }

      const normalized = base.endsWith('/') ? base.slice(0, -1) : base
      const downloadUrl = `${normalized}/api/download/direct?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`

      // Check if we have saved chunks from a previous pause
      const saved = pausedChunks.current.get(downloadKey)
      const resumeFrom = saved ? saved.bytesDownloaded : 0
      const chunks: ArrayBuffer[] = saved ? [...saved.chunks] : []
      let bytesDownloaded = resumeFrom

      // Remove saved state now that we're resuming
      pausedChunks.current.delete(downloadKey)

      const ac = new AbortController()
      abortControllers.current.set(downloadKey, ac)

      // If resuming, update existing entry; otherwise add fresh
      if (saved) {
        updateDownload(downloadKey, { status: 'downloading', speed: 0 })
      } else {
        addDownload({
          key: downloadKey,
          filename,
          status: 'downloading',
          progress: 0,
          bytesDownloaded: 0,
          totalBytes: 0,
          speed: 0,
          startTime: Date.now(),
          retries: retryCount,
        })
      }

      let lastBytesReported = bytesDownloaded
      let lastSpeedCheckTime = Date.now()
      let lastSpeed = 0
      let speedSampleCount = 0

      const tickProgress = (downloaded: number, totalBytes: number) => {
        const now = Date.now()
        const timeDiff = (now - lastSpeedCheckTime) / 1000
        if (timeDiff >= 0.4) {
          const diff = downloaded - lastBytesReported
          if (diff > 0) {
            lastSpeed = diff / timeDiff
            lastBytesReported = downloaded
            lastSpeedCheckTime = now
            speedSampleCount++
          }
        }
        const progress = totalBytes > 0 ? Math.round((downloaded / totalBytes) * 100) : 0
        updateDownload(downloadKey, {
          bytesDownloaded: downloaded,
          totalBytes,
          progress,
          speed: speedSampleCount > 0 ? lastSpeed : 0,
        })
      }

      try {
        const headers: Record<string, string> = {}
        if (resumeFrom > 0) headers['Range'] = `bytes=${resumeFrom}-`

        const response = await fetch(downloadUrl, { signal: ac.signal, headers })
        if (!response.ok && response.status !== 206)
          throw new Error(`Download failed: ${response.status} ${response.statusText}`)

        const contentLength = response.headers.get('content-length')
        const rangeTotal = response.headers.get('content-range')?.match(/\/([0-9]+)$/)?.[1]
        const totalBytes = rangeTotal
          ? parseInt(rangeTotal, 10)
          : contentLength
            ? resumeFrom + parseInt(contentLength, 10)
            : 0

        if (!response.body) {
          const blob = await response.blob()
          chunks.push(await blob.arrayBuffer())
          const finalBlob = new Blob(chunks)
          const url = URL.createObjectURL(finalBlob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          updateDownload(downloadKey, {
            status: 'completed',
            progress: 100,
            bytesDownloaded: finalBlob.size,
            totalBytes: finalBlob.size,
          })
          abortControllers.current.delete(downloadKey)
          return
        }

        const reader = response.body.getReader()

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (ac.signal.aborted) {
            // Paused — save what we have so far
            reader.cancel()
            chunks.push(value.buffer)
            bytesDownloaded += value.length
            pausedChunks.current.set(downloadKey, {
              chunks,
              bytesDownloaded,
              totalBytes,
              isEncrypted: false,
              s3Key: key,
            })
            updateDownload(downloadKey, { status: 'paused', bytesDownloaded, totalBytes })
            abortControllers.current.delete(downloadKey)
            return
          }
          chunks.push(value.buffer)
          bytesDownloaded += value.length
          tickProgress(bytesDownloaded, totalBytes)
        }

        const blob = new Blob(chunks)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        const elapsed = (Date.now() - (downloads.get(downloadKey)?.startTime ?? Date.now())) / 1000
        updateDownload(downloadKey, {
          status: 'completed',
          progress: 100,
          bytesDownloaded,
          totalBytes,
          speed: elapsed > 0 ? bytesDownloaded / elapsed : 0,
        })
        abortControllers.current.delete(downloadKey)
      } catch (error) {
        abortControllers.current.delete(downloadKey)
        if ((error as Error).name === 'AbortError') {
          // Aborted without reaching the read loop (e.g. paused during fetch itself)
          pausedChunks.current.set(downloadKey, {
            chunks,
            bytesDownloaded,
            totalBytes: downloads.get(downloadKey)?.totalBytes ?? 0,
            isEncrypted: false,
            s3Key: key,
          })
          updateDownload(downloadKey, { status: 'paused', bytesDownloaded })
          return
        }

        const errorMessage = error instanceof Error ? error.message : 'Download failed'
        if (retryCount < MAX_DOWNLOAD_RETRIES) {
          console.warn(
            `Download failed, retrying (${retryCount + 1}/${MAX_DOWNLOAD_RETRIES}):`,
            errorMessage
          )
          setTimeout(
            () => {
              void handleDownload(key, filename, retryCount + 1)
            },
            1000 * (retryCount + 1)
          )
          return
        }
        updateDownload(downloadKey, { status: 'failed', error: errorMessage })
      }
    },
    [addDownload, updateDownload, downloads, abortControllers, pausedChunks]
  )

  const [selectedFiles, setSelectedFiles] = useState<SelectedUploadFile[]>([])
  const [encryptionPassword, setEncryptionPassword] = useState<string>('')
  const [folderError, setFolderError] = useState<string | null>(null)
  const [foldersHere, setFoldersHere] = useState<string[]>([])
  const [filesHere, setFilesHere] = useState<
    Array<{
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
    }>
  >([])
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
  const [previewFile, setPreviewFile] = useState<{
    key: string
    url: string
    filename: string
    type: string
  } | null>(null)
  const [encryptedViewerOpen, setEncryptedViewerOpen] = useState(false)
  const [encryptedViewerFile, setEncryptedViewerFile] = useState<{
    fileId: string
    filename: string
    mimeType?: string
    size?: number
    encryptionEnabled?: boolean
    encryptionIv?: string
    encryptionSalt?: string
  } | null>(null)
  const [uploadItemStates, setUploadItemStates] = useState<
    Record<
      string,
      {
        fileKey: string
        fileId: string
        status: 'idle' | 'uploading' | 'paused' | 'completed' | 'error'
        progress: number
      }
    >
  >({})

  // Folder creation state
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

  // Admin folder delete confirmation
  const [folderPendingDelete, setFolderPendingDelete] = useState<string | null>(null)
  const [folderDeletePassword, setFolderDeletePassword] = useState('')
  const [folderDeletePasswordVisible, setFolderDeletePasswordVisible] = useState(false)
  const [folderDeleteError, setFolderDeleteError] = useState<string | null>(null)
  const [folderDeleteSubmitting, setFolderDeleteSubmitting] = useState(false)

  const isWorkspaceAdmin = Boolean(user?.isAdmin)

  // Privacy controls state
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [selectedFileForPrivacy, setSelectedFileForPrivacy] = useState<{
    key: string
    filename: string
  } | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [teamMembers, setTeamMembers] = useState<
    Array<{ id: string; email: string; name?: string; user?: { name: string; email: string } }>
  >([])
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false)
  const [filePrivacySettings, setFilePrivacySettings] = useState<
    Record<string, { restricted: boolean; allowedMembers: string[]; canAccess?: boolean }>
  >({})

  // Deletion loading states
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set())
  const [deletingFolders, setDeletingFolders] = useState<Set<string>>(new Set())
  const [downloadingFolders, setDownloadingFolders] = useState<Set<string>>(new Set())
  const [folderZipProgress, setFolderZipProgress] = useState<{
    folderPath: string
    folderName: string
    elapsedSeconds: number
    phase: 'preparing' | 'downloading' | 'zipping'
    serverMessage?: string
    filesDone?: number
    filesTotal?: number
    currentFile?: string
  } | null>(null)
  const folderZipAbortRef = useRef<AbortController | null>(null)
  const [folderZipDetailsOpen, setFolderZipDetailsOpen] = useState(false)

  // Independent timer for folder download dialog so elapsed time ticks every second
  const [folderZipDisplayElapsed, setFolderZipDisplayElapsed] = useState(0)
  useEffect(() => {
    if (!folderZipProgress) {
      setFolderZipDisplayElapsed(0)
      return
    }
    setFolderZipDisplayElapsed(folderZipProgress.elapsedSeconds)
    const id = setInterval(() => {
      setFolderZipDisplayElapsed(v => v + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [folderZipProgress ? folderZipProgress.folderPath : ''])

  // Filter and sort state
  const [fileFilter, setFileFilter] = useState<'all' | 'images' | 'videos' | 'documents'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date')
  const sortOrder = 'asc' // Fixed sort order since setSortOrder is unused

  // Bulk selection state
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set())
  // Deep-link highlight: key of the file navigated to from activity page
  const [highlightedFileKey, setHighlightedFileKey] = useState<string>('')
  const highlightClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setHighlightedFileKeyWithAutoClear = useCallback((key: string) => {
    if (highlightClearTimerRef.current) clearTimeout(highlightClearTimerRef.current)
    setHighlightedFileKey(key)
    highlightClearTimerRef.current = setTimeout(() => setHighlightedFileKey(''), 2500)
  }, [])
  const [bulkLoading, setBulkLoading] = useState(false)

  const useStreamUpload = false
  const canUpload = useMemo(
    () => selectedFiles.length > 0 && !uploading,
    [selectedFiles, uploading]
  )

  // Helper function to show toast notifications
  const showToastNotification = useCallback(
    (message: string, type: 'error' | 'success' | 'info' = 'error') => {
      setToastMessage(message)
      setToastType(type)
      setShowToast(true)
    },
    []
  )

  // Helper function to close toast
  const closeToast = useCallback(() => {
    setShowToast(false)
    setToastMessage('')
  }, [])

  // Create handleDownloadFile that wraps handleDownload for encrypted files
  const handleDownloadFile = useCallback(
    async (key: string, filename: string) => {
      const fileMeta = filesHere.find(file => file.key === key)
      if (
        fileMeta?.encryptionEnabled &&
        fileMeta.fileId &&
        fileMeta.encryptionIv &&
        fileMeta.encryptionSalt
      ) {
        const downloadKey = `${key}:${filename}`

        // Check for paused state with saved chunks
        const saved = pausedChunks.current.get(downloadKey)
        const resumeFrom = saved ? saved.bytesDownloaded : 0
        const chunks: ArrayBuffer[] = saved ? [...saved.chunks] : []
        let bytesDownloaded = resumeFrom
        pausedChunks.current.delete(downloadKey)

        const ac = new AbortController()
        abortControllers.current.set(downloadKey, ac)

        if (saved) {
          // Resuming — update existing entry
          updateDownload(downloadKey, { status: 'downloading', speed: 0 })
        } else {
          addDownload({
            key: downloadKey,
            filename,
            status: 'downloading',
            progress: 0,
            bytesDownloaded: 0,
            totalBytes: fileMeta.size || 0,
            speed: 0,
            startTime: Date.now(),
            retries: 0,
            isEncrypted: true,
          })
        }

        try {
          const CLIENT_KEY_CACHE = 'file_encryption_password'
          const encryptionKey = sessionStorage.getItem(CLIENT_KEY_CACHE)
          if (!encryptionKey)
            throw new Error('Missing encryption key — please re-enter your password')

          // Always get a fresh pre-signed URL (they expire)
          const { getDownloadUrl } = await import('../../api/uploadApi')
          const result = await getDownloadUrl(fileMeta.fileId)
          if (!result.ok || !result.url) throw new Error('Failed to get download URL')

          if (ac.signal.aborted) return

          // --- Streaming download phase with pause/resume support ---
          const reqHeaders: Record<string, string> = {}
          // S3 pre-signed URLs generally don't support Range, but we try anyway;
          // if the server returns 206 we resume, otherwise we restart from 0
          if (resumeFrom > 0) reqHeaders['Range'] = `bytes=${resumeFrom}-`

          const response = await fetch(result.url, { signal: ac.signal, headers: reqHeaders })

          // If Range was rejected (200 instead of 206), we must re-download from start
          if (response.status === 200 && resumeFrom > 0) {
            chunks.length = 0
            bytesDownloaded = 0
          } else if (!response.ok && response.status !== 206) {
            throw new Error(`HTTP ${response.status}`)
          }

          const contentLength = response.headers.get('content-length')
          const rangeTotal = response.headers.get('content-range')?.match(/\/([0-9]+)$/)?.[1]
          const totalBytes = rangeTotal
            ? parseInt(rangeTotal, 10)
            : contentLength
              ? resumeFrom + parseInt(contentLength, 10)
              : fileMeta.size || 0

          let lastBytes = bytesDownloaded
          let lastTime = Date.now()
          let lastSpeed = 0

          if (response.body) {
            const reader = response.body.getReader()
            // eslint-disable-next-line no-constant-condition
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              if (ac.signal.aborted) {
                // Paused — save collected chunks so we can resume
                reader.cancel()
                chunks.push(value.buffer)
                bytesDownloaded += value.length
                pausedChunks.current.set(downloadKey, {
                  chunks,
                  bytesDownloaded,
                  totalBytes,
                  isEncrypted: true,
                  encryptedUrl: result.url,
                })
                updateDownload(downloadKey, {
                  status: 'paused',
                  bytesDownloaded,
                  totalBytes,
                  speed: 0,
                })
                abortControllers.current.delete(downloadKey)
                return
              }
              chunks.push(value.buffer)
              bytesDownloaded += value.length
              const now = Date.now()
              const dt = (now - lastTime) / 1000
              if (dt >= 0.4) {
                lastSpeed = (bytesDownloaded - lastBytes) / dt
                lastBytes = bytesDownloaded
                lastTime = now
              }
              const progress = totalBytes > 0 ? Math.round((bytesDownloaded / totalBytes) * 100) : 0
              updateDownload(downloadKey, {
                bytesDownloaded,
                totalBytes,
                progress,
                speed: lastSpeed,
              })
            }
          } else {
            // Fallback — no streaming
            const arrayBuf = await response.arrayBuffer()
            chunks.push(arrayBuf)
            bytesDownloaded += arrayBuf.byteLength
          }

          if (ac.signal.aborted) {
            // Paused during non-streaming fallback
            pausedChunks.current.set(downloadKey, {
              chunks,
              bytesDownloaded,
              totalBytes: fileMeta.size || bytesDownloaded,
              isEncrypted: true,
              encryptedUrl: result.url,
            })
            updateDownload(downloadKey, { status: 'paused', bytesDownloaded, speed: 0 })
            abortControllers.current.delete(downloadKey)
            return
          }

          // --- Decryption phase ---
          updateDownload(downloadKey, {
            status: 'decrypting',
            progress: 0,
            speed: 0,
            decryptionProgress: 0,
          })

          const { decryptEncryptedBlobForDownload } = await import('../../lib/encryption')
          const encBlob = new Blob(chunks, { type: 'application/octet-stream' })
          const encrypted = await encBlob.arrayBuffer()

          const decryptedBlob = await decryptEncryptedBlobForDownload(
            encrypted,
            fileMeta.encryptionIv,
            fileMeta.encryptionSalt,
            encryptionKey,
            fileMeta.size || encrypted.byteLength,
            pct => updateDownload(downloadKey, { decryptionProgress: pct, progress: pct })
          )

          if (fileMeta.fileId && fileMeta.mimeType) {
            const { putFileInCache, generateCacheKey } = await import('../../lib/fileCache')
            await putFileInCache(generateCacheKey(fileMeta.fileId, encryptionKey), decryptedBlob, {
              mimeType: fileMeta.mimeType,
              filename,
              size: fileMeta.size || encrypted.byteLength,
            })
          }

          const url = URL.createObjectURL(decryptedBlob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          a.rel = 'noreferrer'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          const elapsed =
            (Date.now() - (downloads.get(downloadKey)?.startTime ?? Date.now())) / 1000
          updateDownload(downloadKey, {
            status: 'completed',
            progress: 100,
            decryptionProgress: 100,
            speed: elapsed > 0 ? bytesDownloaded / elapsed : 0,
            totalBytes: bytesDownloaded,
          })
          abortControllers.current.delete(downloadKey)
        } catch (error) {
          abortControllers.current.delete(downloadKey)
          if ((error as Error).name === 'AbortError') {
            // Aborted before the read loop — save what we have
            pausedChunks.current.set(downloadKey, {
              chunks,
              bytesDownloaded,
              totalBytes: downloads.get(downloadKey)?.totalBytes ?? (fileMeta.size || 0),
              isEncrypted: true,
            })
            updateDownload(downloadKey, { status: 'paused', bytesDownloaded, speed: 0 })
            return
          }
          console.error('Download encrypted file error:', error)
          updateDownload(downloadKey, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'فشل في فك التشفير',
          })
        }
        return
      }

      // Non-encrypted file - use regular download with progress tracking
      void handleDownload(key, filename)
    },
    [
      filesHere,
      handleDownload,
      addDownload,
      updateDownload,
      downloads,
      abortControllers,
      pausedChunks,
    ]
  )

  // Filtered and sorted files
  const filteredAndSortedFiles = useMemo(() => {
    const filtered = filterFiles(filesHere)
    const sorted = sortFiles(filtered)
    return sorted
  }, [filesHere, fileFilter, sortBy, sortOrder])

  // Auto-upload when files are selected (but not during initial render)
  const [hasTriggeredUpload, setHasTriggeredUpload] = useState(false)

  // Handle folder/file navigation from URL search params — single source of truth
  const fetchExplorerRef = useRef<typeof fetchExplorer | null>(null)
  // Debounce timer for nav fetches — collapses rapid duplicate effect fires into one
  const navFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  type ExplorerCacheEntry = {
    folders: string[]
    files: typeof filesHere
    hasMore: boolean
    nextToken: string | null
  }
  // In-memory cache keyed by explorerPrefix — avoids a full loading spinner on back-navigation.
  // Entries are evicted on mutations (upload, folder create/delete) so data stays fresh.
  const explorerCacheRef = useRef<Map<string, ExplorerCacheEntry>>(new Map())

  // currentPath is derived from searchParams so it is always in sync with the URL
  const currentPath = useMemo(() => {
    const workspaceId = user?.workspaceId?.trim() || ''
    const folder = searchParams.get('folder')
    const fileFromQuery = (searchParams.get('file') || '').trim()
    const derivedPathFromFile = workspaceId
      ? deriveRelativeFolderFromFileKey(fileFromQuery, workspaceId)
      : ''
    const folderFromQuery = (folder || '').replace(/^\/+/, '')
    return (derivedPathFromFile || folderFromQuery || '').replace(/^\/+/, '')
  }, [searchParams, user?.workspaceId])

  // Single effect — fires whenever the URL changes, fetches the correct folder
  useEffect(() => {
    const workspaceId = user?.workspaceId?.trim()
    if (!workspaceId) return

    const ROOT_PREFIX = `uploads/${workspaceId}`
    const computedExplorerPrefix = currentPath ? `${ROOT_PREFIX}/${currentPath}` : ROOT_PREFIX

    const folder = searchParams.get('folder')
    const fileFromQuery = (searchParams.get('file') || '').trim()
    if (folder || fileFromQuery) {
      setShowTrash(false)
    }
    setFolderError(null)

    // Debounce: cancel any pending fetch and schedule a new one after 30ms.
    // This collapses rapid duplicate effect fires (workspaceId stabilisation) into one fetch,
    // while still allowing A→B→A navigation to re-fetch correctly.
    if (navFetchTimerRef.current) clearTimeout(navFetchTimerRef.current)
    navFetchTimerRef.current = setTimeout(() => {
      navFetchTimerRef.current = null
      uploadDevLog('[Nav] effect: fetching', { currentPath, computedExplorerPrefix })
      if (fetchExplorerRef.current) {
        void fetchExplorerRef.current(true, computedExplorerPrefix, null)
      } else {
        void fetchExplorer(true, computedExplorerPrefix, null)
      }
    }, 30)
  }, [currentPath, user?.workspaceId])

  useEffect(() => {
    if (useStreamUpload && canUpload && selectedFiles.length > 0 && !hasTriggeredUpload) {
      setHasTriggeredUpload(true)
      void handleUpload()
    } else if (selectedFiles.length === 0) {
      setHasTriggeredUpload(false)
    }
  }, [canUpload, selectedFiles.length, hasTriggeredUpload])

  const deepLinkFileKeyRef = useRef('')
  const deepLinkLoadAttemptsRef = useRef(0)
  const deepLinkGlobalSearchRef = useRef<Record<string, boolean>>({})
  /** يمنع تأثير الرابط العميق من استدعاء loadMore أثناء أول جلب (قبل أن يصبح loadingExplorer في الـ render true). */
  const explorerResetInFlightRef = useRef(false)
  const trashedOriginalKeysRef = useRef<Set<string>>(new Set())

  const refreshTrashedKeysCache = useCallback(async () => {
    const workspaceId = user?.workspaceId?.trim()
    try {
      const keys = await fetchTrashedOriginalKeys()
      trashedOriginalKeysRef.current = keys
      if (workspaceId) persistTrashedKeys(workspaceId, keys)
    } catch {
      if (workspaceId && trashedOriginalKeysRef.current.size === 0) {
        trashedOriginalKeysRef.current = loadPersistedTrashedKeys(workspaceId)
      }
    }
  }, [user?.workspaceId])

  useEffect(() => {
    const workspaceId = user?.workspaceId?.trim()
    if (!workspaceId) return
    trashedOriginalKeysRef.current = loadPersistedTrashedKeys(workspaceId)
  }, [user?.workspaceId])

  // Listen for retry-download events dispatched from DownloadProgressDialog
  useEffect(() => {
    const onRetry = (e: Event) => {
      const { key, filename } = (e as CustomEvent<{ key: string; filename: string }>).detail
      void handleDownloadFile(key.split(':')[0], filename)
    }
    window.addEventListener('retry-download', onRetry)
    return () => window.removeEventListener('retry-download', onRetry)
  }, [handleDownloadFile])

  useEffect(() => {
    const workspaceId = user?.workspaceId?.trim()
    if (workspaceId) {
      setClientEncryptionKey(workspaceId)
      setEncryptionPassword(workspaceId)
      return
    }

    const existingKey = getClientEncryptionKey()
    if (existingKey) {
      setEncryptionPassword(existingKey)
    }
  }, [user?.workspaceId])

  const ROOT_PREFIX = useMemo(() => {
    const workspaceId = user?.workspaceId?.trim()
    return workspaceId ? `uploads/${workspaceId}` : 'uploads'
  }, [user?.workspaceId])
  const explorerPrefix = currentPath.trim() ? `${ROOT_PREFIX}/${currentPath.trim()}` : ROOT_PREFIX

  const [folderNameError, setFolderNameError] = useState<string | null>(null)

  async function handleUpload() {
    if (!useStreamUpload) return
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

    // Initialize upload item states for all files
    const initialStates: Record<
      string,
      {
        fileKey: string
        fileId: string
        status: 'idle' | 'uploading' | 'paused' | 'completed' | 'error'
        progress: number
        speed?: number
        bytesUploaded?: number
        totalBytes?: number
      }
    > = {}
    selectedFiles.forEach(sf => {
      const fileKey = `${sf.relativePath}_${sf.file.size}`
      initialStates[fileKey] = {
        fileKey,
        fileId: '',
        status: 'uploading',
        progress: 0,
        speed: 0,
        bytesUploaded: 0,
        totalBytes: sf.file.size,
      }
    })
    setUploadItemStates(initialStates)
    setUploading(false)

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
        .map(async sf => {
          const encryptionResult = sf.encryptionResult
          // For simple encryption (small files), encryptionResult has encryptedData, iv, salt
          // For chunked encryption (large files), encryptionResult has encryptedChunks, iv, salt
          const hasEncryption = !!encryptionResult
          const iv = encryptionResult?.iv
          const salt = encryptionResult?.salt
          const thumbnailUploadFile = sf.thumbnailUploadFile || null

          if (!thumbnailUploadFile) {
            try {
              const filename = filenameFromKey(sf.relativePath)
              const fileType = getFileType(filename)
              if (fileType === 'image') {
                const thumb = await createImageThumbnailBlob(sf.file)
                if (thumb) {
                  const thumbBlob = hasEncryption
                    ? await encryptThumbnailBlob(thumb, encryptionPassword)
                    : thumb
                  return {
                    file: sf.uploadFile ?? sf.file,
                    relativePath: sf.relativePath,
                    encryptionEnabled: hasEncryption,
                    encryptionIv: iv,
                    encryptionSalt: salt,
                    thumbnailUploadFile: new File(
                      [thumbBlob],
                      `thumb_${sf.relativePath}.${hasEncryption ? 'bin' : 'jpg'}`,
                      { type: hasEncryption ? 'application/octet-stream' : 'image/jpeg' }
                    ),
                  }
                }
              } else if (fileType === 'video') {
                const thumb = await createVideoThumbnailBlob(sf.file)
                if (thumb) {
                  const thumbBlob = hasEncryption
                    ? await encryptThumbnailBlob(thumb, encryptionPassword)
                    : thumb
                  return {
                    file: sf.uploadFile ?? sf.file,
                    relativePath: sf.relativePath,
                    encryptionEnabled: hasEncryption,
                    encryptionIv: iv,
                    encryptionSalt: salt,
                    thumbnailUploadFile: new File(
                      [thumbBlob],
                      `thumb_${sf.relativePath}.${hasEncryption ? 'bin' : 'jpg'}`,
                      { type: hasEncryption ? 'application/octet-stream' : 'image/jpeg' }
                    ),
                  }
                }
              }
            } catch {
              // ignore thumbnail errors
            }
          }

          return {
            file: sf.uploadFile ?? sf.file,
            relativePath: sf.relativePath,
            encryptionEnabled: hasEncryption,
            encryptionIv: iv,
            encryptionSalt: salt,
            thumbnailUploadFile,
          }
        })

      const resolvedFilesToUpload = await Promise.all(filesToUpload)

      const res = await uploadFilesStreamed(resolvedFilesToUpload, {
        batchName: explorerPrefix,
        ...(rootFolderName ? { folderName: rootFolderName } : {}),
        skipFiles: completedUploadedFiles,
        onUploadProgress: progress => {
          // Update upload item states for UI feedback
          const { currentFileIndex, progressPercent, bytesUploaded, totalBytes, uploadSpeed } =
            progress
          // Update each file's progress in the state
          // currentFileIndex is 1-indexed, array is 0-indexed
          resolvedFilesToUpload.forEach((file, idx) => {
            const fileKey = `${file.relativePath}_${file.file.size}`
            if (idx < currentFileIndex - 1) {
              setUploadItemStates(prev => ({
                ...prev,
                [fileKey]: {
                  fileKey,
                  status: 'completed',
                  progress: 100,
                  fileId: prev[fileKey]?.fileId || '',
                  speed: 0,
                  bytesUploaded: file.file.size,
                  totalBytes: file.file.size,
                },
              }))
            } else if (idx === currentFileIndex - 1) {
              setUploadItemStates(prev => ({
                ...prev,
                [fileKey]: {
                  fileKey,
                  status: 'uploading',
                  progress: progressPercent,
                  fileId: prev[fileKey]?.fileId || '',
                  speed: uploadSpeed,
                  bytesUploaded: bytesUploaded,
                  totalBytes: totalBytes,
                },
              }))
            }
          })
        },
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
    if (
      !confirm(
        'هل أنت متأكد من حذف هذا الملف؟ سيتم نقله إلى سلة المهملات وحذفه نهائياً بعد 7 أيام.'
      )
    ) {
      return
    }

    setDeletingFiles(prev => new Set(prev).add(key))
    try {
      await moveFileToTrash(key)
      const ws = user?.workspaceId?.trim()
      if (ws) addPersistedTrashedKeys(ws, [key])
      trashedOriginalKeysRef.current.add(key.replace(/^\/+/, ''))
      setFilesHere(prev => prev.filter(file => file.key !== key))
      showToastNotification('تم نقل الملف إلى سلة المهملات بنجاح', 'success')
      await refreshTrashedKeysCache()
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      showToastNotification(
        `فشل حذف الملف: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`,
        'error'
      )
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
      trashedOriginalKeysRef.current.delete(key.replace(/^\/+/, ''))
      showToastNotification('تم استعادة الملف بنجاح', 'success')
      await refreshTrashedKeysCache()
      await fetchTrashFiles()
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      showToastNotification(
        `فشل استعادة الملف: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`,
        'error'
      )
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
    if (
      !confirm(`هل أنت متأكد من حذف ${selectedForBulk.size} ملفات؟ سيتم نقلها إلى سلة المهملات.`)
    ) {
      return
    }

    setBulkLoading(true)
    try {
      const keys = Array.from(selectedForBulk)
      await bulkMoveToTrash(keys)
      const ws = user?.workspaceId?.trim()
      if (ws) addPersistedTrashedKeys(ws, keys)
      for (const key of keys) {
        trashedOriginalKeysRef.current.add(key.replace(/^\/+/, ''))
      }
      setFilesHere(prev => prev.filter(file => !keys.includes(file.key)))
      showToastNotification(`تم نقل ${keys.length} ملفات إلى سلة المهملات`, 'success')
      setSelectedForBulk(new Set())
      await refreshTrashedKeysCache()
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      showToastNotification(
        `فشل حذف الملفات: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`,
        'error'
      )
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
      for (const key of keys) {
        trashedOriginalKeysRef.current.delete(key.replace(/^\/+/, ''))
      }
      showToastNotification(`تم استعادة ${keys.length} ملفات بنجاح`, 'success')
      setSelectedForBulk(new Set())
      await refreshTrashedKeysCache()
      await fetchTrashFiles()
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      showToastNotification(
        `فشل استعادة الملفات: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`,
        'error'
      )
    } finally {
      setBulkLoading(false)
    }
  }

  const fetchTrashFiles = useCallback(async () => {
    setLoadingTrash(true)
    try {
      const res = await listTrashFiles()
      setTrashFiles(res.files || [])
      const workspaceId = user?.workspaceId?.trim()
      const keys = new Set<string>(
        (res.files ?? []).map((f: any) => String(f.originalKey || '').replace(/^\/+/, ''))
      )
      trashedOriginalKeysRef.current = keys
      if (workspaceId) persistTrashedKeys(workspaceId, keys)
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      showToastNotification(
        `فشل جلب ملفات المهملات: ${err.response?.data?.message || err.message || 'خطأ غير معروف'}`,
        'error'
      )
    } finally {
      setLoadingTrash(false)
    }
  }, [])

  const fetchTrashFilesRef = useRef(fetchTrashFiles)
  fetchTrashFilesRef.current = fetchTrashFiles
  const showTrashRef = useRef(showTrash)
  showTrashRef.current = showTrash
  useEffect(() => {
    if (showTrash) {
      void fetchTrashFilesRef.current()
    }
  }, [showTrash])

  function handlePreview(key: string, url: string) {
    const filename = filenameFromKey(key)
    const fileType = getFileType(filename)

    const fileMeta = filesHere.find(file => file.key === key)
    if (
      fileMeta?.encryptionEnabled &&
      fileMeta.fileId &&
      fileMeta.encryptionIv &&
      fileMeta.encryptionSalt
    ) {
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

  function handlePreviewDownload() {
    if (previewFile) {
      void handleDownload(previewFile.key, previewFile.filename)
    }
  }

  function handleClosePreview() {
    setPreviewModalOpen(false)
    setPreviewFile(null)
  }

  function handleCloseEncryptedViewer() {
    setEncryptedViewerOpen(false)
    setEncryptedViewerFile(null)
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
    if (
      trimmedName.startsWith('.') ||
      trimmedName.startsWith(' ') ||
      trimmedName.endsWith('.') ||
      trimmedName.endsWith(' ')
    ) {
      showToastNotification('اسم المجلد لا يمكن أن يبدأ أو ينتهي بنقطة أو مسافة', 'error')
      return
    }

    // Check for reserved names
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
          Authorization: token ? `Bearer ${token}` : '',
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
      explorerCacheRef.current.delete(explorerPrefix)
      await fetchExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string }
      showToastNotification(`فشل إنشاء المجلد: ${err.message || 'خطأ غير معروف'}`, 'error')
    } finally {
      setCreatingFolder(false)
    }
  }

  function closeFolderDeleteDialog() {
    if (folderDeleteSubmitting) return
    setFolderPendingDelete(null)
    setFolderDeletePassword('')
    setFolderDeleteError(null)
    setFolderDeletePasswordVisible(false)
  }

  function requestDeleteFolder(folderPath: string) {
    if (!isWorkspaceAdmin) {
      showToastNotification('حذف المجلدات متاح للمدير فقط', 'error')
      return
    }
    setFolderDeleteError(null)
    setFolderDeletePassword('')
    setFolderPendingDelete(folderPath)
  }

  async function confirmDeleteFolder() {
    const folderPath = folderPendingDelete
    if (!folderPath) return

    if (!isWorkspaceAdmin) {
      showToastNotification('حذف المجلدات متاح للمدير فقط', 'error')
      closeFolderDeleteDialog()
      return
    }

    const password = folderDeletePassword.trim()
    if (!password) {
      setFolderDeleteError('أدخل كلمة مرور حساب المدير')
      return
    }

    const workspaceId = user?.workspaceId?.trim()
    if (!workspaceId) {
      showToastNotification('تعذر تحديد مساحة العمل', 'error')
      return
    }

    setFolderDeleteError(null)
    setFolderDeleteSubmitting(true)
    setFolderNameError(null)
    setDeletingFolders(prev => new Set(prev).add(folderPath))
    showToastNotification('جاري حذف المجلد ومحتوياته...', 'info')

    try {
      const { trashedFiles } = await deleteWorkspaceFolder({
        folderPath,
        workspaceId,
        adminPassword: password,
      })

      closeFolderDeleteDialog()

      // Evict all cached entries that are at or under the deleted folder path
      for (const key of explorerCacheRef.current.keys()) {
        if (key === explorerPrefix || key.startsWith(`${explorerPrefix}/`)) {
          explorerCacheRef.current.delete(key)
        }
      }
      setFoldersHere(prev =>
        prev.filter(p => {
          const cleaned = p.endsWith('/') ? p.slice(0, -1) : p
          const fullPath = currentPath ? `${currentPath}/${cleaned}` : cleaned
          return !relativeFolderPathUnderDeleted(fullPath, folderPath)
        })
      )
      setFilesHere(prev =>
        prev.filter(obj => !storageKeyUnderDeletedFolder(obj.key, workspaceId, folderPath))
      )

      const escapePath = escapePathAfterFolderDelete(currentPath, folderPath)
      if (escapePath !== null) {
        if (escapePath) {
          setSearchParams({ folder: escapePath })
        } else {
          setSearchParams({})
        }
      }

      showToastNotification(
        trashedFiles > 0
          ? `تم حذف المجلد (نُقل ${trashedFiles} ملفاً إلى سلة المهملات)`
          : 'تم حذف المجلد ومحتوياته بنجاح',
        'success'
      )
      await refreshTrashedKeysCache()
      if (escapePath !== null) {
        const prefixOverride = escapePath.trim()
          ? `uploads/${workspaceId}/${escapePath.trim()}`
          : `uploads/${workspaceId}`
        await fetchExplorer(true, prefixOverride)
      } else {
        await fetchExplorer(true)
      }
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      const msg =
        err.response?.data?.message || err.message || 'فشل حذف المجلد'
      setFolderDeleteError(msg)
      showToastNotification(`فشل حذف المجلد: ${msg}`, 'error')
    } finally {
      setDeletingFolders(prev => {
        const next = new Set(prev)
        next.delete(folderPath)
        return next
      })
      setFolderDeleteSubmitting(false)
    }
  }

  const cancelFolderZipDownload = useCallback(() => {
    folderZipAbortRef.current?.abort()
    folderZipAbortRef.current = null
    setFolderZipProgress(null)
    setDownloadingFolders(new Set())
  }, [])

  async function handleDownloadFolder(folderPath: string) {
    if (downloadingFolders.has(folderPath)) return

    const folderName = folderPath.split('/').filter(Boolean).pop() || folderPath
    const abortController = new AbortController()
    folderZipAbortRef.current = abortController

    setDownloadingFolders(prev => new Set(prev).add(folderPath))
    setFolderZipProgress({
      folderPath,
      folderName,
      elapsedSeconds: 0,
      phase: 'preparing',
    })

    try {
      const encryptionPassword = sessionStorage.getItem('file_encryption_password')
      const result = await downloadWorkspaceFolderZip({
        folderPath,
        workspaceId: user?.workspaceId,
        signal: abortController.signal,
        encryptionPassword,
        onProgress: progress => {
          setFolderZipProgress({
            folderPath,
            folderName,
            elapsedSeconds: progress.elapsedSeconds,
            phase: progress.phase,
            serverMessage: progress.serverMessage,
            filesDone: progress.filesDone,
            filesTotal: progress.filesTotal,
            currentFile: progress.currentFile,
          })
        },
      })
      const countNote =
        result.fileCount != null ? ` (${result.fileCount} ملف)` : ''
      if (result.failedFiles?.length) {
        showToastNotification(
          `تم تنزيل ${result.fileCount} ملف. تعذر تنزيل ${result.failedFiles.length}: ${result.failedFiles[0]}`,
          'info'
        )
      } else {
        showToastNotification(`تم تنزيل المجلد بنجاح${countNote}`, 'success')
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        showToastNotification('تم إلغاء تنزيل المجلد', 'info')
      } else {
        console.error('Folder download error:', error)
        const msg = error instanceof Error ? error.message : 'خطأ غير معروف'
        showToastNotification(
          msg.length > 120 ? `${msg.slice(0, 120)}...` : `فشل تنزيل المجلد: ${msg}`,
          'error'
        )
      }
    } finally {
      folderZipAbortRef.current = null
      setFolderZipProgress(null)
      setDownloadingFolders(prev => {
        const next = new Set(prev)
        next.delete(folderPath)
        return next
      })
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
          Authorization: token ? `Bearer ${token}` : '',
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
        },
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
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    )
  }

  function canAccessFile(fileKey: string): boolean {
    const privacy = filePrivacySettings[fileKey]
    if (!privacy) {
      return true
    }
    return privacy.canAccess !== false
  }

  // Helper functions for filtering and sorting
  function getFileType(filename: string): 'image' | 'video' | 'document' | 'other' {
    const ext = filename.split('.').pop()?.toLowerCase() || ''

    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico']
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v']
    const documentExts = [
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      'txt',
      'rtf',
      'odt',
      'ods',
      'odp',
    ]

    if (imageExts.includes(ext)) return 'image'
    if (videoExts.includes(ext)) return 'video'
    if (documentExts.includes(ext)) return 'document'
    return 'other'
  }

  function filterFiles(
    files: Array<{
      key: string
      size?: number
      lastModified?: string
      createdAt?: string
      updatedAt?: string
      thumbnailKey?: string | null
    }>
  ) {
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

  function sortFiles(
    files: Array<{
      key: string
      size?: number
      lastModified?: string
      createdAt?: string
      updatedAt?: string
      thumbnailKey?: string | null
    }>
  ) {
    return [...files].sort((a, b) => {
      const filenameA = a.key.split('/').pop() || ''
      const filenameB = b.key.split('/').pop() || ''

      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = filenameA.localeCompare(filenameB)
          break
        case 'size': {
          const sizeA = a.size || 0
          const sizeB = b.size || 0
          comparison = sizeA - sizeB
          break
        }
        case 'date': {
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
        }
        default:
          comparison = 0
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  // Helper function to get the most reliable date for a file
  function getFileDate(file: {
    key: string
    size?: number
    lastModified?: string
    createdAt?: string
    updatedAt?: string
  }): Date | null {
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

  const fetchExplorer = useCallback(
    async (
      reset: boolean = true,
      explorerPrefixOverride?: string | null,
      continuationTokenOverride?: string | null
    ) => {
      const effectivePrefix = explorerPrefixOverride ?? explorerPrefix
      // Derive the currentPath that matches effectivePrefix so filterFoldersForExplorer
      // uses the correct path even when called with an override before state has updated.
      const effectiveCurrentPath = (() => {
        if (!explorerPrefixOverride) return currentPath
        const root = ROOT_PREFIX
        if (effectivePrefix === root) return ''
        if (effectivePrefix.startsWith(`${root}/`)) return effectivePrefix.slice(root.length + 1)
        return currentPath
      })()

      // --- Cache read (reset only) ---
      const cachedEntry = reset ? explorerCacheRef.current.get(effectivePrefix) : undefined
      if (cachedEntry) {
        // Populate state instantly from cache so the UI renders without a loading spinner
        setFoldersHere(cachedEntry.folders)
        setFilesHere(cachedEntry.files)
        setHasMoreFiles(cachedEntry.hasMore)
        setNextContinuationToken(cachedEntry.nextToken)
        setFolderError(null)
        // Revalidate in background — update cache + state silently
        void (async () => {
          try {
            const res = await listUploadedObjects(effectivePrefix, 50, true, undefined)
            const visibleObjects = filterExplorerObjects(res.objects ?? [], trashedOriginalKeysRef.current)
            const filteredFolders = filterFoldersForExplorer(res.folders ?? [], effectiveCurrentPath)
            explorerCacheRef.current.set(effectivePrefix, {
              folders: filteredFolders,
              files: visibleObjects,
              hasMore: res.pagination?.hasMore ?? false,
              nextToken: res.pagination?.nextContinuationToken ?? null,
            })
            setFoldersHere(filteredFolders)
            setFilesHere(visibleObjects)
            setHasMoreFiles(res.pagination?.hasMore ?? false)
            setNextContinuationToken(res.pagination?.nextContinuationToken ?? null)
          } catch {
            // Background revalidation failure is non-fatal; stale cache remains
          }
        })()
        return
      }

      if (reset) {
        explorerResetInFlightRef.current = true
        setLoadingExplorer(true)
        setFilesHere([])
        setHasMoreFiles(true)
        setNextContinuationToken(null)
        setTotalFileCount(null)
        setFolderError(null)
      } else {
        setIsLoadingMoreFiles(true)
      }

      try {
        const limit = 50
        const continuationToken = reset ? undefined : continuationTokenOverride || undefined
        const res = await listUploadedObjects(effectivePrefix, limit, true, continuationToken)
        const visibleObjects = filterExplorerObjects(
          res.objects ?? [],
          trashedOriginalKeysRef.current
        )

        if (reset) {
          // Filter out system folders like workspace-assets and workspace-logo
          const filteredFolders = filterFoldersForExplorer(res.folders ?? [], effectiveCurrentPath)
          setFoldersHere(filteredFolders)
          setFilesHere(visibleObjects)
          // Write to cache
          explorerCacheRef.current.set(effectivePrefix, {
            folders: filteredFolders,
            files: visibleObjects,
            hasMore: res.pagination?.hasMore ?? false,
            nextToken: res.pagination?.nextContinuationToken ?? null,
          })
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
        const errorMsg = err.response?.data?.message ?? err.message ?? 'فشل جلب الملفات'
        showToastNotification(errorMsg, 'error')

        // Set folder error state if resetting (initial folder load)
        if (reset) {
          setFolderError(errorMsg)
          setFoldersHere([])
          setFilesHere([])
        }
      } finally {
        if (reset) {
          explorerResetInFlightRef.current = false
          setLoadingExplorer(false)
        } else {
          setIsLoadingMoreFiles(false)
        }
      }
    },
    [currentPath, explorerPrefix]
  )

  // Keep fetchExplorerRef updated synchronously during render so effects always see the latest version
  fetchExplorerRef.current = fetchExplorer

  const explorerRefreshAfterUploadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleExplorerRefreshAfterUpload = useCallback(() => {
    if (explorerRefreshAfterUploadTimerRef.current) {
      clearTimeout(explorerRefreshAfterUploadTimerRef.current)
    }
    explorerRefreshAfterUploadTimerRef.current = setTimeout(() => {
      explorerRefreshAfterUploadTimerRef.current = null
      // Evict cache for current prefix so the forced refresh isn't served stale
      explorerCacheRef.current.delete(explorerPrefix)
      void fetchExplorer(true)
    }, 400)
  }, [fetchExplorer, explorerPrefix])

  useEffect(() => {
    return () => {
      if (explorerRefreshAfterUploadTimerRef.current) {
        clearTimeout(explorerRefreshAfterUploadTimerRef.current)
      }
    }
  }, [])

  const loadMoreFiles = useCallback(async () => {
    if (!hasMoreFiles || isLoadingMoreFiles || loadingExplorer) return

    await fetchExplorer(false, null, nextContinuationToken)
  }, [hasMoreFiles, isLoadingMoreFiles, loadingExplorer, fetchExplorer, nextContinuationToken])

  // من سجل الأنشطة: ?file=… — جلب صفحات حتى يظهر الملف ثم تمييزه وتمرير العرض إليه
  useEffect(() => {
    const requestedFileKey = (searchParams.get('file') || '').trim()
    if (requestedFileKey !== deepLinkFileKeyRef.current) {
      deepLinkFileKeyRef.current = requestedFileKey
      deepLinkLoadAttemptsRef.current = 0
    }
    if (!requestedFileKey) {
      uploadDevLog('[Upload] deep-link skipped: no file param')
      return
    }
    if (loadingExplorer || explorerResetInFlightRef.current) {
      uploadDevLog('[Upload] deep-link waiting explorer reset', {
        requestedFileKey,
        loadingExplorer,
        explorerResetInFlight: explorerResetInFlightRef.current,
      })
      return
    }
    // Also wait if filesHere is still empty with hasMoreFiles=true — the initial fetch
    // hasn't returned yet (we're in the window between reset clearing the list and the
    // response arriving). Proceeding here causes loadMoreFiles to fire as a non-reset
    // append fetch, placing files at the bottom of the list.
    if (filesHere.length === 0 && hasMoreFiles) {
      uploadDevLog('[Upload] deep-link waiting for initial fetch to land', { requestedFileKey })
      return
    }

    const matched = filesHere.find(file => objectKeyMatchesDeepLink(file.key, requestedFileKey))
    if (matched) {
      deepLinkLoadAttemptsRef.current = 0
      uploadDevLog('[Upload] deep-link matched file', {
        requestedFileKey,
        matchedKey: matched.key,
        filesLoaded: filesHere.length,
        currentPath,
      })
      setHighlightedFileKeyWithAutoClear(matched.key)
      const escaped =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(matched.key)
          : matched.key.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      const run = () => {
        document.querySelector(`[data-file-key="${escaped}"]`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }
      requestAnimationFrame(run)
      setTimeout(run, 200)
      return
    }

    // Last-resort fallback: sometimes production returns a variant key format.
    const requestedName = requestedFileKey.split('/').filter(Boolean).pop() || ''
    if (requestedName) {
      const byNameOnly = filesHere.find(file => {
        const name = file.key.split('/').filter(Boolean).pop() || ''
        return name === requestedName
      })
      if (byNameOnly) {
        uploadDevWarn('[Upload] deep-link matched by filename fallback', {
          requestedFileKey,
          matchedKey: byNameOnly.key,
          filesLoaded: filesHere.length,
          currentPath,
        })
        setHighlightedFileKeyWithAutoClear(byNameOnly.key)
        const escaped =
          typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
            ? CSS.escape(byNameOnly.key)
            : byNameOnly.key.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
        const run = () => {
          document.querySelector(`[data-file-key="${escaped}"]`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        }
        requestAnimationFrame(run)
        setTimeout(run, 200)
        return
      }
    }

    if (!hasMoreFiles || isLoadingMoreFiles) {
      const sampleLoadedKeys = filesHere.slice(0, 5).map(f => f.key)
      uploadDevLog('[Upload] deep-link stopped', {
        requestedFileKey,
        reason: !hasMoreFiles ? 'no-more-files' : 'loading-more-in-progress',
        filesLoaded: filesHere.length,
        currentPath,
        sampleLoadedKeys,
      })
      if (!hasMoreFiles && !isLoadingMoreFiles && !deepLinkGlobalSearchRef.current[requestedFileKey]) {
        deepLinkGlobalSearchRef.current[requestedFileKey] = true
        void (async () => {
          try {
            uploadDevWarn('[Upload] deep-link fallback: global workspace search started', {
              requestedFileKey,
            })
            let continuationToken: string | undefined
            let matchedKey: string | null = null
            let pages = 0
            while (pages < 20 && !matchedKey) {
              const res = await listUploadedObjects(
                ROOT_PREFIX,
                200,
                false,
                continuationToken
              )
              const objects = res.objects ?? []
              const found = objects.find(obj => objectKeyMatchesDeepLink(obj.key, requestedFileKey))
              if (found) {
                matchedKey = found.key
                break
              }
              if (!res.pagination?.hasMore || !res.pagination?.nextContinuationToken) break
              continuationToken = res.pagination.nextContinuationToken
              pages += 1
            }

            if (!matchedKey) {
              uploadDevWarn('[Upload] deep-link fallback: global search did not find file', {
                requestedFileKey,
              })
              return
            }

            const workspaceId = user?.workspaceId?.trim() || ''
            const matchedFolder = deriveRelativeFolderFromFileKey(matchedKey, workspaceId)
            uploadDevWarn('[Upload] deep-link fallback: found file globally, redirecting to folder', {
              requestedFileKey,
              matchedKey,
              matchedFolder,
            })

            // Navigate to the correct folder — the navigation effect will fetch and the
            // deep-link effect will scroll/highlight once files load
            if (matchedFolder !== currentPath) {
              setSearchParams(
                matchedFolder ? { folder: matchedFolder, file: matchedKey } : { file: matchedKey }
              )
            }
          } catch (error) {
            console.error('[Upload] deep-link fallback: global search failed', error)
          }
        })()
      }
      return
    }
    if (deepLinkLoadAttemptsRef.current >= 40) {
      uploadDevLog('[Upload] deep-link stopped', {
        requestedFileKey,
        reason: 'max-attempts',
        filesLoaded: filesHere.length,
        currentPath,
      })
      return
    }
    deepLinkLoadAttemptsRef.current += 1
    uploadDevLog('[Upload] deep-link not found yet, loading more', {
      requestedFileKey,
      attempts: deepLinkLoadAttemptsRef.current,
      filesLoaded: filesHere.length,
      hasMoreFiles,
      nextContinuationToken,
      currentPath,
    })
    void loadMoreFiles()
  }, [
    searchParams,
    filesHere,
    hasMoreFiles,
    isLoadingMoreFiles,
    loadingExplorer,
    loadMoreFiles,
  ])

  // Infinite scroll handler
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget

      // When user is within 200px of bottom, load more
      if (scrollHeight - scrollTop - clientHeight < 200) {
        void loadMoreFiles()
      }
    },
    [loadMoreFiles]
  )

  useEffect(() => {
    const unsubscribe = subscribeRealtime(
      event => {
        if (event.scope !== 'files') return
        if (event.action === 'upload_progress') return
        void fetchExplorerRef.current?.(true)
        if (showTrashRef.current) {
          void fetchTrashFilesRef.current?.()
        }
      },
      () => {
        // page stays usable even if realtime stream reconnects
      }
    )

    return unsubscribe
  }, [])

  function keyToPublicUrl(key: string) {
    const publicBase = API_ENV.r2PublicBaseUrl?.trim() || ''
    const safeKey = key.startsWith('/') ? key.slice(1) : key
    if (publicBase) {
      const base = publicBase.endsWith('/') ? publicBase.slice(0, -1) : publicBase
      return `${base}/${safeKey}`
    }
    const base = API_ENV.apiBaseUrl?.trim() || ''
    if (!base) {
      return ''
    }
    const normalized = base.endsWith('/') ? base.slice(0, -1) : base
    return `${normalized}/api/image?key=${encodeURIComponent(safeKey)}`
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
          onEncryptionPasswordRequest={() => { }}
          onUploadProgress={() => { }}
          onUploadComplete={scheduleExplorerRefreshAfterUpload}
          externalUploadItems={uploadItemStates}
          currentPath={currentPath}
        />

        <Box sx={{ mt: 2 }}>
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Tooltip title="عرض قائمة">
                <Button
                  variant={viewMode === 'list' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('list')}
                  disabled={uploading || loadingExplorer}
                  sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
                >
                  <ServerMinimalistic weight={'BoldDuotone'} size={24} />
                </Button>
              </Tooltip>
              <Tooltip title="عرض شبكة">
                <Button
                  variant={viewMode === 'grid' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('grid')}
                  disabled={uploading || loadingExplorer}
                  sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
                >
                  <Widget weight={'BoldDuotone'} size={24} />
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
                  onChange={e =>
                    setFileFilter(e.target.value as 'all' | 'images' | 'videos' | 'documents')
                  }
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
                  onChange={e => setSortBy(e.target.value as 'name' | 'date' | 'size')}
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
                sx={{ borderRadius: 999, gap: 1 }}
              >
                <span className="hidden md:inline">إنشاء مجلد</span>
              </Button>
            </Box>
          </Box>

          {/* Bulk Action Toolbar */}
          {selectedForBulk.size > 0 && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: 'primary.50',
                border: '1px solid',
                borderColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
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
                  <Typography variant="body2" sx={{ opacity: 0.5 }}>
                    {'>'}
                  </Typography>
                )}
                <Button
                  size="small"
                  onClick={() => {
                    if (c.path) {
                      setSearchParams({ folder: c.path })
                    } else {
                      setSearchParams({})
                    }
                  }}
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
                {trashFiles.map(file => (
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
              {folderError ? (
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    backgroundColor: 'error.50',
                    border: '1px solid',
                    borderColor: 'error.main',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <ErrorOutlineIcon sx={{ fontSize: 32, color: 'error.main' }} />
                  <Box>
                    <Typography variant="h6" sx={{ color: 'error.main', mb: 0.5 }}>
                      خطأ في تحميل المجلد
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {folderError}
                    </Typography>
                  </Box>
                </Box>
              ) : loadingExplorer && filesHere.length === 0 ? (
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
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',
                            sm: 'repeat(3, 1fr)',
                            md: 'repeat(4, 1fr)',
                            lg: 'repeat(5, 1fr)',
                          },
                          gap: 2,
                        }}
                      >
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
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                              xs: 'repeat(2, 1fr)',
                              sm: 'repeat(3, 1fr)',
                              md: 'repeat(4, 1fr)',
                              lg: 'repeat(5, 1fr)',
                            },
                            gap: 2,
                          }}
                        >
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
                          <Typography
                            variant="body2"
                            sx={{ opacity: 0.75, mb: 1, fontWeight: 600 }}
                          >
                            المجلدات ({foldersHere.length})
                          </Typography>
                          {viewMode === 'list' ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                              {foldersHere.map(p => {
                                const cleaned = p.endsWith('/') ? p.slice(0, -1) : p
                                // The server returns relative folder names (e.g., "subfolder/"), so we need to construct the full path
                                const fullPath = currentPath ? `${currentPath}/${cleaned}` : cleaned
                                return (
                                  <FolderItem
                                    key={p}
                                    folderPath={fullPath}
                                    onClick={() => {
                                      setSearchParams({ folder: fullPath })
                                    }}
                                    onDelete={requestDeleteFolder}
                                    onDownload={handleDownloadFolder}
                                    canDelete={isWorkspaceAdmin}
                                    isDeleting={deletingFolders.has(fullPath)}
                                    isDownloading={downloadingFolders.has(fullPath)}
                                  />
                                )
                              })}
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                  xs: 'repeat(2, 1fr)',
                                  sm: 'repeat(3, 1fr)',
                                  md: 'repeat(4, 1fr)',
                                  lg: 'repeat(5, 1fr)',
                                },
                                gap: 2,
                              }}
                            >
                              {foldersHere.map(p => {
                                const cleaned = p.endsWith('/') ? p.slice(0, -1) : p
                                // The server returns relative folder names (e.g., "subfolder/"), so we need to construct the full path
                                const fullPath = currentPath ? `${currentPath}/${cleaned}` : cleaned
                                return (
                                  <FolderItemGrid
                                    key={p}
                                    folderPath={fullPath}
                                    onClick={() => {
                                      setSearchParams({ folder: fullPath })
                                    }}
                                    onDelete={requestDeleteFolder}
                                    onDownload={handleDownloadFolder}
                                    canDelete={isWorkspaceAdmin}
                                    isDeleting={deletingFolders.has(fullPath)}
                                    isDownloading={downloadingFolders.has(fullPath)}
                                  />
                                )
                              })}
                            </Box>
                          )}
                        </Box>
                      )}

                      {filteredAndSortedFiles.length > 0 && (
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{ opacity: 0.75, mb: 1, fontWeight: 600 }}
                          >
                            الملفات (
                            {totalFileCount !== null
                              ? totalFileCount
                              : filteredAndSortedFiles.length}
                            )
                          </Typography>
                          {viewMode === 'list' ? (
                            <Box
                              ref={scrollContainerRef}
                              sx={{ maxHeight: 500, overflow: 'auto' }}
                              onScroll={handleScroll}
                            >
                              {filteredAndSortedFiles.map(obj => {
                                const url = keyToPublicUrl(obj.key)
                                const thumbnailUrl = obj.thumbnailKey
                                  ? keyToPublicUrl(obj.thumbnailKey)
                                  : ''
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
                                    highlighted={highlightedFileKey === obj.key}
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
                                <Typography
                                  variant="body2"
                                  sx={{ textAlign: 'center', opacity: 0.5, p: 2 }}
                                >
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
                              <Box
                                sx={{
                                  display: 'grid',
                                  gridTemplateColumns: {
                                    xs: 'repeat(2, 1fr)',
                                    sm: 'repeat(3, 1fr)',
                                    md: 'repeat(4, 1fr)',
                                    lg: 'repeat(5, 1fr)',
                                  },
                                  gap: 2,
                                }}
                              >
                                {filteredAndSortedFiles.map(obj => {
                                  const url = keyToPublicUrl(obj.key)
                                  const thumbnailUrl = obj.thumbnailKey
                                    ? keyToPublicUrl(obj.thumbnailKey)
                                    : ''
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
                                      highlighted={highlightedFileKey === obj.key}
                                      onToggleSelect={toggleFileSelection}
                                    />
                                  )
                                })}
                              </Box>
                              {/* Infinite Scroll Loading Indicator for Grid View */}
                              {isLoadingMoreFiles && (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    p: 2,
                                    gridColumn: '1 / -1',
                                  }}
                                >
                                  <CircularProgress size={24} />
                                  <Typography variant="body2" sx={{ ml: 2, opacity: 0.7 }}>
                                    جاري تحميل المزيد من الملفات...
                                  </Typography>
                                </Box>
                              )}
                              {!hasMoreFiles && filteredAndSortedFiles.length > 0 && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    textAlign: 'center',
                                    opacity: 0.5,
                                    p: 2,
                                    gridColumn: '1 / -1',
                                  }}
                                >
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
        onDownload={handlePreviewDownload}
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

      {/* Admin folder delete confirmation */}
      <Dialog
        open={!!folderPendingDelete}
        onClose={closeFolderDeleteDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'background.default',
            backgroundImage: 'none',
          },
        }}
      >
        <DialogTitle>تأكيد حذف المجلد</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            أنت على وشك حذف المجلد{' '}
            <strong>
              {folderPendingDelete?.split('/').filter(Boolean).pop() || folderPendingDelete}
            </strong>
            . سيتم نقل جميع الملفات بداخله (بما فيها المجلدات الفرعية) إلى سلة المهملات.
            <br />
            أدخل <strong>كلمة مرور حساب المدير</strong> (نفس كلمة مرور تسجيل الدخول — وليست كلمة مرور
            تشفير الملفات).
          </Typography>
          {folderDeleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {folderDeleteError}
            </Alert>
          )}
          <PasswordInput
            value={folderDeletePassword}
            onChange={setFolderDeletePassword}
            showPassword={folderDeletePasswordVisible}
            onToggleVisibility={() => setFolderDeletePasswordVisible(v => !v)}
            label="كلمة مرور تسجيل الدخول"
            autoComplete="current-password"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFolderDeleteDialog} disabled={folderDeleteSubmitting}>
            إلغاء
          </Button>
          <Button
            onClick={() => void confirmDeleteFolder()}
            variant="contained"
            color="error"
            disabled={folderDeleteSubmitting || !folderDeletePassword.trim()}
          >
            {folderDeleteSubmitting ? 'جاري الحذف...' : 'تأكيد الحذف'}
          </Button>
        </DialogActions>
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
          },
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
            onChange={e => setNewFolderName(e.target.value)}
            disabled={creatingFolder}
            error={!!folderNameError}
            helperText={
              folderNameError || 'أدخل اسمًا فريدًا للمجلد (الأحرف المسموحة: أ-ب، 0-9، _، -)'
            }
            inputProps={{
              maxLength: 255,
              style: { direction: 'ltr' },
            }}
            sx={{
              '& .MuiInputBase-input': {
                direction: 'ltr !important',
                textAlign: 'left !important',
              },
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
          },
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
            اختر أعضاء الفريق المسموح لهم الوصول إلى هذا الملف. إذا لم يتم تحديد أي عضو، سيكون الملف
            متاحًا للجميع.
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
              {teamMembers.map(member => (
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
          <Button onClick={() => setShowPrivacyModal(false)}>إلغاء</Button>
          <Button onClick={savePrivacySettings} variant="contained">
            حفظ الإعدادات
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={folderZipProgress !== null}
        onClose={cancelFolderZipDownload}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            backgroundColor: theme =>
              theme.palette.mode === 'dark'
                ? '#0f1115'
                : '#ffffff',
            backgroundImage: 'none',
            boxShadow: theme =>
              theme.palette.mode === 'dark'
                ? '0 24px 64px rgba(0,0,0,0.6)'
                : '0 24px 64px rgba(0,0,0,0.12)',
          },
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          {/* Top gradient strip */}
          <Box
            sx={{
              height: 4,
              background: theme =>
                `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            }}
          />

          <Box sx={{ p: 4, pt: 3.5, textAlign: 'center' }}>
            {/* Animated icon */}
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '24px',
                mx: 'auto',
                mb: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                background: theme =>
                  `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
                border: theme =>
                  `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <Box
                sx={{
                  animation: `${keyframes`
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.15); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                  `} 2s ease-in-out infinite`,
                }}
              >
                <Box sx={{ color: 'primary.main', display: 'inline-flex' }}>
                  <ArchiveDownMinimalistic size={32} />
                </Box>
              </Box>
            </Box>

            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '1.15rem',
                mb: 0.5,
                letterSpacing: '-0.01em',
              }}
            >
              تحضير تنزيل المجلد
            </Typography>

            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                mt: 1,
                mb: 3,
                px: 2,
                py: 0.6,
                borderRadius: 2,
                backgroundColor: theme =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(0,0,0,0.03)',
                border: theme =>
                  `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                maxWidth: '100%',
              }}
            >
              <FolderIcon sx={{ fontSize: 18, color: 'primary.main', flexShrink: 0 }} />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  direction: 'ltr',
                  textAlign: 'right',
                  wordBreak: 'break-word',
                  fontSize: '0.85rem',
                }}
              >
                {folderZipProgress?.folderName}
              </Typography>
            </Box>

            {/* Phase pills */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: 1,
                mb: 3,
                flexWrap: 'wrap',
              }}
            >
              {(
                [
                  { key: 'preparing', label: 'جمع الملفات' },
                  { key: 'downloading', label: 'التنزيل' },
                  { key: 'zipping', label: 'الضغط' },
                ] as const
              ).map((step, idx) => {
                const phases = ['preparing', 'downloading', 'zipping'] as const
                const currentIdx = phases.indexOf(folderZipProgress?.phase || 'preparing')
                const isActive = idx === currentIdx
                const isDone = idx < currentIdx
                return (
                  <Box
                    key={step.key}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 2,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      transition: 'all 0.3s ease',
                      backgroundColor: isActive
                        ? theme => alpha(theme.palette.primary.main, 0.12)
                        : isDone
                          ? theme => alpha(theme.palette.success.main, 0.1)
                          : theme =>
                            theme.palette.mode === 'dark'
                              ? 'rgba(255,255,255,0.04)'
                              : 'rgba(0,0,0,0.03)',
                      color: isActive
                        ? 'primary.main'
                        : isDone
                          ? 'success.main'
                          : 'text.disabled',
                      border: theme =>
                        `1px solid ${isActive
                          ? alpha(theme.palette.primary.main, 0.3)
                          : isDone
                            ? alpha(theme.palette.success.main, 0.25)
                            : alpha(theme.palette.divider, 0.3)
                        }`,
                    }}
                  >
                    {isDone ? (
                      <CheckIcon sx={{ fontSize: 14 }} />
                    ) : isActive ? (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                          animation: `${keyframes`
                            0% { opacity: 1; transform: scale(1); }
                            50% { opacity: 0.4; transform: scale(1.4); }
                            100% { opacity: 1; transform: scale(1); }
                          `} 1.4s ease-in-out infinite`,
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: 'text.disabled',
                          opacity: 0.4,
                        }}
                      />
                    )}
                    {step.label}
                  </Box>
                )
              })}
            </Box>

            {/* Progress bar */}
            <Box
              sx={{
                height: 8,
                borderRadius: 4,
                overflow: 'hidden',
                backgroundColor: theme =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.05)',
                mb: 1.5,
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  borderRadius: 4,
                  background: theme =>
                    `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: folderZipProgress?.filesTotal
                    ? `${Math.round(
                      ((folderZipProgress.filesDone ?? 0) / folderZipProgress.filesTotal) * 100
                    )}%`
                    : folderZipProgress && folderZipProgress.elapsedSeconds > 0
                      ? '40%'
                      : '0%',
                  ...(folderZipProgress && !folderZipProgress.filesTotal && folderZipProgress.elapsedSeconds > 0
                    ? {
                      animation: `${keyframes`
                          0% { transform: translateX(-100%); }
                          100% { transform: translateX(250%); }
                        `} 1.2s ease-in-out infinite`,
                    }
                    : {}),
                }}
              />
            </Box>

            {/* File count + percent row */}
            {folderZipProgress?.filesTotal != null && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2.5,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                  }}
                >
                  {folderZipProgress.filesDone ?? 0} / {folderZipProgress.filesTotal} ملف
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {Math.round(
                    ((folderZipProgress.filesDone ?? 0) / folderZipProgress.filesTotal) * 100
                  )}%
                </Typography>
              </Box>
            )}

            {/* Stat chips */}
            {(() => {
              const elapsed = folderZipDisplayElapsed
              const done = folderZipProgress?.filesDone ?? 0
              const total = folderZipProgress?.filesTotal ?? 0
              const hasFileCounts = total > 0
              const speed = elapsed > 0 && done > 0 ? done / elapsed : 0
              const remaining =
                speed > 0 && total > 0 ? (total - done) / speed : null
              return (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 1.5,
                    mb: 2.5,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 1.5,
                      py: 0.6,
                      borderRadius: 2,
                      backgroundColor: theme =>
                        theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(0,0,0,0.03)',
                      border: theme =>
                        `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                    }}
                  >
                    <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: 'text.secondary' }}>
                      {fmtDuration(elapsed)}
                    </Typography>
                  </Box>

                  {hasFileCounts && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 1.5,
                        py: 0.6,
                        borderRadius: 2,
                        backgroundColor: theme =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.04)'
                            : 'rgba(0,0,0,0.03)',
                        border: theme =>
                          `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                      }}
                    >
                      <SpeedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: 'text.secondary' }}>
                        {speed >= 1
                          ? `${speed.toFixed(1)} ملف/ث`
                          : speed > 0
                            ? `${(speed * 60).toFixed(1)} ملف/د`
                            : 'جاري البدء...'}
                      </Typography>
                    </Box>
                  )}

                  {hasFileCounts && remaining != null && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 1.5,
                        py: 0.6,
                        borderRadius: 2,
                        backgroundColor: theme =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.04)'
                            : 'rgba(0,0,0,0.03)',
                        border: theme =>
                          `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                      }}
                    >
                      <HourglassEmptyIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: 'text.secondary' }}>
                        ~{fmtDuration(remaining)} متبقي
                      </Typography>
                    </Box>
                  )}
                </Box>
              )
            })()}

            {/* Details toggle */}
            <Button
              size="small"
              onClick={() => setFolderZipDetailsOpen(v => !v)}
              endIcon={folderZipDetailsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.8rem',
                color: 'text.secondary',
                mb: folderZipDetailsOpen ? 1.5 : 0,
                borderRadius: 2,
                px: 1.5,
              }}
            >
              {folderZipDetailsOpen ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
            </Button>

            {/* Expandable details */}
            {folderZipDetailsOpen && (
              <Box
                sx={{
                  textAlign: 'right',
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: theme =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(0,0,0,0.02)',
                  border: theme =>
                    `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  mb: 2,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mb: 0.75,
                    fontWeight: 500,
                    color: 'text.primary',
                  }}
                >
                  الحالة:
                  <Box component="span" sx={{ color: 'text.secondary', mr: 0.5 }}>
                    {folderZipProgress?.phase === 'zipping'
                      ? 'جاري ضغط الملفات...'
                      : folderZipProgress?.phase === 'downloading'
                        ? folderZipProgress.filesTotal != null
                          ? `تنزيل الملفات ${folderZipProgress.filesDone ?? 0} / ${folderZipProgress.filesTotal}`
                          : 'جاري تنزيل الملفات...'
                        : 'جاري تجميع قائمة الملفات...'}
                  </Box>
                </Typography>

                {folderZipProgress?.currentFile && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                    <InsertDriveFileIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      title={folderZipProgress.currentFile}
                      sx={{
                        direction: 'ltr',
                        textAlign: 'right',
                        flex: 1,
                      }}
                    >
                      {folderZipProgress.currentFile}
                    </Typography>
                  </Box>
                )}

                {folderZipProgress?.serverMessage && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.5 }}
                  >
                    {folderZipProgress.serverMessage}
                  </Typography>
                )}

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}
                >
                  يشمل كل الملفات داخل المجلد والمجلدات الفرعية. لا تغلق الصفحة.
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            justifyContent: 'center',
            gap: 1.5,
            px: 4,
            pb: 3,
            pt: 0,
          }}
        >
          <Button
            onClick={cancelFolderZipDownload}
            variant="outlined"
            color="error"
            startIcon={<CloseIcon />}
            sx={{
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1,
            }}
          >
            إلغاء التنزيل
          </Button>
        </DialogActions>
      </Dialog>

      {showToast && <Toast message={toastMessage} type={toastType} onClose={closeToast} />}

      {/* Download Progress Dialog — rendered from global DownloadContext */}
      <DownloadProgressDialog />
    </Box>
  )
}
