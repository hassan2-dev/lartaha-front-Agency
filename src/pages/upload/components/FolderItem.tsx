/**
 * FolderItem Component
 * List view item for folders
 */

import { Box, Typography, Tooltip, Button, ListItem, Avatar, useTheme, alpha } from '@mui/material'
import FolderIcon from '@mui/icons-material/Folder'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import CircularProgress from '@mui/material/CircularProgress'
import type { FolderItemProps } from '../types'

export function FolderItem({
  folderPath,
  onClick,
  onDelete,
  onDownload,
  isDeleting,
}: FolderItemProps) {
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
          <FolderIcon />
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
          <Button
            size="small"
            variant="text"
            onClick={e => {
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
            onClick={e => {
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
