/**
 * FileItem Component
 * List view item for files with actions
 */

import {
  Box,
  Typography,
  Tooltip,
  Button,
  Checkbox,
  ListItem,
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
    <ListItem
      onClick={() => hasAccess && onPreview(obj.key, url)}
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
        backgroundColor: isRestricted
          ? isDark
            ? 'rgba(255,0,0,0.02)'
            : 'rgba(211, 47, 47, 0.04)'
          : isDark
            ? 'rgba(255,255,255,0.02)'
            : theme.palette.background.paper,
        boxShadow: !isDark ? '0 2px 4px rgba(0,0,0,0.02)' : 'none',
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
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
            {isRestricted ? <LockIcon /> : <FileIcon fileType={fileType} />}
          </Avatar>
        )}
        <Box sx={{ minWidth: 0, maxWidth: 300, display: 'flex', flexDirection: 'column' }}>
          <Typography
            variant="body2"
            sx={{ wordBreak: 'break-word', opacity: 0.92, fontWeight: 500 }}
          >
            {filename}
          </Typography>
          {obj.size && (
            <Typography variant="caption" sx={{ opacity: 0.7, textAlign: 'start' }}>
              {fmtBytes(obj.size)}
            </Typography>
          )}
          {isRestricted && (
            <Typography
              variant="caption"
              sx={{ opacity: 0.7, display: 'block', color: 'error.main' }}
            >
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
    </ListItem>
  )
}
