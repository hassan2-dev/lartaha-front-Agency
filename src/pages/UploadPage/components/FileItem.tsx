import {
  Box,
  Button,
  Typography,
  Tooltip,
  CircularProgress,
  Avatar,
  useTheme,
  alpha,
  Card,
  Checkbox,
  ListItem,
} from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import { keyframes } from '@mui/system'
import { ImageThumbnail, VideoThumbnail, ThumbnailTypeBadge } from './thumbnails'
import { fmtBytes, filenameFromKey, getFileType, getFileIcon } from './utils'

const highlightPulse = keyframes`
  0%   { border-color: var(--highlight-color); box-shadow: 0 0 0 3px rgba(var(--highlight-rgb), 0.4); }
  50%  { border-color: var(--highlight-color); box-shadow: 0 0 0 5px rgba(var(--highlight-rgb), 0.15); }
  100% { border-color: transparent; box-shadow: none; }
`

type FileObj = {
  key: string
  size?: number
  createdAt?: string
  thumbnailKey?: string | null
  encryptionEnabled?: boolean
  fileId?: string
}

type FileItemProps = {
  obj: FileObj
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
  highlighted?: boolean
  onToggleSelect?: (key: string) => void
}

export function FileItem({
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
}: FileItemProps) {
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
                  top: 0, left: 0, right: 0, bottom: 0,
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
                  top: 0, left: 0, right: 0, bottom: 0,
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
          <Typography variant="body2" sx={{ wordBreak: 'break-word', opacity: 0.92, fontWeight: 500 }}>
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
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', color: 'error.main' }}>
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
              <LockIcon sx={{ fontSize: 16, color: isRestricted ? 'error.main' : 'text.secondary' }} />
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

export function FileItemGrid({
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
}: FileItemProps) {
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
                    top: 0, left: 0, right: 0, bottom: 0,
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
                    top: 0, left: 0, right: 0, bottom: 0,
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
        </Box>
        {obj.size && (
          <Typography variant="caption" sx={{ opacity: 0.7, textAlign: 'center' }}>
            {fmtBytes(obj.size)}
          </Typography>
        )}
        {obj.createdAt && (
          <Typography variant="caption" sx={{ opacity: 0.7, textAlign: 'center' }}>
            {new Date(obj.createdAt).toLocaleDateString('ar-SA', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </Typography>
        )}
        {isRestricted && (
          <Typography variant="caption" sx={{ opacity: 0.7, textAlign: 'center', color: 'error.main' }}>
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
              <LockIcon sx={{ fontSize: 16, color: isRestricted ? 'error.main' : 'text.secondary' }} />
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
