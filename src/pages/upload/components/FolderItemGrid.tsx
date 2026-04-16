/**
 * FolderItemGrid Component
 * Grid view item for folders
 */

import { Box, Typography, Tooltip, Button, Card, Avatar, useTheme, alpha } from '@mui/material'
import FolderIcon from '@mui/icons-material/Folder'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import CircularProgress from '@mui/material/CircularProgress'
import type { FolderItemProps } from '../types'

export function FolderItemGrid({
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
    </Card>
  )
}
