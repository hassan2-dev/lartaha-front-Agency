/**
 * FileItemGrid Component
 * Grid view item for files with actions
 */

import {
  Box,
  Typography,
  Tooltip,
  Button,
  Checkbox,
  Card,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import CircularProgress from '@mui/material/CircularProgress'
import { FileIcon } from './FileIcon'
import { ThumbnailTypeBadge } from './ThumbnailTypeBadge'
import { ImageThumbnail } from './ImageThumbnail'
import { VideoThumbnail } from './VideoThumbnail'
import { CopyLinkButton } from './CopyLinkButton'
import { getFileType, filenameFromKey, fmtBytes } from '../utils/fileUtils'
import {
  buildImageThumbnailKeyFromFileKey,
  buildVideoThumbnailKeyFromFileKey,
} from '../utils/fileUtils'
import type { FileItemProps } from '../types'

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
  onToggleSelect,
}: FileItemProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const filename = filenameFromKey(obj.key)
  const fileType = getFileType(filename)
  const isImage = fileType === 'image'
  const isVideo = fileType === 'video'
  const resolvedThumbnailKey =
    obj.thumbnailKey ||
    (isVideo
      ? buildVideoThumbnailKeyFromFileKey(obj.key)
      : buildImageThumbnailKeyFromFileKey(obj.key)) ||
    null
  const hasAccess = canAccessFile(obj.key)
  const privacySettings = filePrivacySettings[obj.key]
  const isRestricted = privacySettings?.restricted

  return (
    <Card
      onClick={() => hasAccess && onPreview(obj.key, url)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        border: '1px solid',
        borderColor: selected
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
        boxShadow: !isDark ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
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
                size={60}
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
                size={60}
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
              {isRestricted ? <LockIcon /> : <FileIcon fileType={fileType} />}
            </Avatar>
          )}
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
              {filename}
            </Typography>
          </Box>
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
          <CopyLinkButton url={url} />
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
