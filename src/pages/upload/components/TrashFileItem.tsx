/**
 * TrashFileItem Component
 * Displays trashed files with restore option
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
} from '@mui/material'
import RestoreIcon from '@mui/icons-material/Restore'
import { FileIcon } from './FileIcon'
import { ThumbnailTypeBadge } from './ThumbnailTypeBadge'
import { ImageThumbnail } from './ImageThumbnail'
import { VideoThumbnail } from './VideoThumbnail'
import { getFileType } from '../utils/fileUtils'
import {
  buildImageThumbnailKeyFromFileKey,
  buildVideoThumbnailKeyFromFileKey,
  keyToPublicUrl,
} from '../utils/fileUtils'
import type { TrashFileItemProps } from '../types'

export function TrashFileItem({ file, onRestore, selected, onToggleSelect }: TrashFileItemProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const filename = file.filename
  const fileType = getFileType(filename)
  const deletedDate = file.deletedAt ? new Date(file.deletedAt).toLocaleDateString('ar-SA') : ''
  const permanentDeleteDate = file.permanentDeleteAt
    ? new Date(file.permanentDeleteAt).toLocaleDateString('ar-SA')
    : ''
  const deletedBy = file.deletedBy
  const isImage = fileType === 'image'
  const isVideo = fileType === 'video'

  // Build thumbnail URL for trashed files
  const buildTrashThumbnailUrl = () => {
    if (!file.originalKey) return null
    if (isImage) {
      const imageThumbnailKey = buildImageThumbnailKeyFromFileKey(file.originalKey)
      return imageThumbnailKey ? keyToPublicUrl(imageThumbnailKey) : null
    }
    if (isVideo) {
      const videoThumbnailKey = buildVideoThumbnailKeyFromFileKey(file.originalKey)
      return videoThumbnailKey ? keyToPublicUrl(videoThumbnailKey) : null
    }
    return null
  }

  const thumbnailUrl = buildTrashThumbnailUrl()

  return (
    <ListItem
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
        backgroundColor: isDark ? 'rgba(211, 47, 47, 0.12)' : 'rgba(211, 47, 47, 0.08)',
        '&:hover': {
          backgroundColor: isDark ? 'rgba(211, 47, 47, 0.15)' : 'rgba(211, 47, 47, 0.12)',
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
      {/* Thumbnail or icon */}
      {isImage && thumbnailUrl ? (
        <Box sx={{ position: 'relative' }}>
          <ImageThumbnail url={thumbnailUrl} filename={filename} />
          <ThumbnailTypeBadge fileType={fileType} size={14} />
        </Box>
      ) : isVideo && thumbnailUrl ? (
        <Box sx={{ position: 'relative' }}>
          <VideoThumbnail
            url={thumbnailUrl}
            thumbnailKey={buildVideoThumbnailKeyFromFileKey(file.originalKey)}
            encryptionEnabled
          />
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
          <FileIcon fileType={fileType} />
        </Avatar>
      )}

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
            sx={{ borderRadius: 999, minWidth: 'auto', p: 1, color: 'success.main' }}
          >
            <RestoreIcon />
          </Button>
        </Tooltip>
      </Box>
    </ListItem>
  )
}
