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
  ListItem,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import PushPinIcon from '@mui/icons-material/PushPin'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { FolderWithFiles, ArchiveDownMinimalistic } from '@solar-icons/react'

type FolderItemProps = {
  folderPath: string
  onClick: () => void
  onDelete: (folderPath: string) => void
  onDownload: (folderPath: string) => void
  isDeleting?: boolean
  isDownloading?: boolean
  canDelete?: boolean
  isPinned?: boolean
  onTogglePin?: (folderPath: string) => void
  onMovePinUp?: (folderPath: string) => void
  onMovePinDown?: (folderPath: string) => void
  canMovePinUp?: boolean
  canMovePinDown?: boolean
}

export function FolderItem({
  folderPath,
  onClick,
  onDelete,
  onDownload,
  isDeleting,
  isDownloading,
  canDelete,
  isPinned,
  onTogglePin,
  onMovePinUp,
  onMovePinDown,
  canMovePinUp,
  canMovePinDown,
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
        borderColor: isPinned
          ? alpha(theme.palette.warning.main, 0.45)
          : isDark
            ? 'rgba(255,255,255,0.08)'
            : theme.palette.divider,
        backgroundColor: isPinned
          ? alpha(theme.palette.warning.main, isDark ? 0.08 : 0.06)
          : isDark
            ? 'rgba(255,255,255,0.02)'
            : theme.palette.background.paper,
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: isPinned
            ? alpha(theme.palette.warning.main, isDark ? 0.12 : 0.1)
            : isDark
              ? 'rgba(255,255,255,0.05)'
              : alpha(theme.palette.primary.main, 0.04),
        },
      }}
    >
      <Box
        onClick={onClick}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, cursor: 'pointer' }}
      >
        <Avatar
          sx={{ width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.1)', color: 'inherit' }}
        >
          <FolderWithFiles weight='BoldDuotone' size={28} />
        </Avatar>
        <Box sx={{ minWidth: 0, maxWidth: 300, justifyContent: 'center', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="body2" sx={{ wordBreak: 'break-word', opacity: 0.92, fontWeight: 500 }}>
            {name}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7, textAlign: 'start' }}>
            {isPinned ? 'مجلد مثبت' : 'مجلد'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
        {onTogglePin && (
          <>
            {isPinned && onMovePinUp && (
              <Tooltip title="رفع الترتيب">
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    size="small"
                    variant="text"
                    onClick={e => {
                      e.stopPropagation()
                      onMovePinUp(folderPath)
                    }}
                    disabled={!canMovePinUp || isDeleting || isDownloading}
                    sx={{ borderRadius: 999, minWidth: 'auto', p: 0.75 }}
                  >
                    <KeyboardArrowUpIcon fontSize="small" />
                  </Button>
                </span>
              </Tooltip>
            )}
            {isPinned && onMovePinDown && (
              <Tooltip title="خفض الترتيب">
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    size="small"
                    variant="text"
                    onClick={e => {
                      e.stopPropagation()
                      onMovePinDown(folderPath)
                    }}
                    disabled={!canMovePinDown || isDeleting || isDownloading}
                    sx={{ borderRadius: 999, minWidth: 'auto', p: 0.75 }}
                  >
                    <KeyboardArrowDownIcon fontSize="small" />
                  </Button>
                </span>
              </Tooltip>
            )}
            <Tooltip title={isPinned ? 'إلغاء التثبيت' : 'تثبيت المجلد'}>
              <span style={{ display: 'inline-flex' }}>
                <Button
                  size="small"
                  variant="text"
                  onClick={e => {
                    e.stopPropagation()
                    onTogglePin(folderPath)
                  }}
                  disabled={isDeleting || isDownloading}
                  sx={{
                    borderRadius: 999,
                    minWidth: 'auto',
                    p: 1,
                    color: isPinned ? 'warning.main' : 'text.secondary',
                  }}
                >
                  <PushPinIcon fontSize="small" sx={{ transform: isPinned ? 'rotate(0deg)' : 'rotate(45deg)' }} />
                </Button>
              </span>
            </Tooltip>
          </>
        )}
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

export function FolderItemGrid({
  folderPath,
  onClick,
  onDelete,
  onDownload,
  isDeleting,
  isDownloading,
  canDelete,
  isPinned,
  onTogglePin,
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
        borderColor: isPinned
          ? alpha(theme.palette.warning.main, 0.45)
          : isDark
            ? 'rgba(255,255,255,0.08)'
            : theme.palette.divider,
        backgroundColor: isPinned
          ? alpha(theme.palette.warning.main, isDark ? 0.08 : 0.06)
          : isDark
            ? 'rgba(255,255,255,0.02)'
            : theme.palette.background.paper,
        boxShadow: !isDark ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: isPinned
            ? alpha(theme.palette.warning.main, isDark ? 0.12 : 0.1)
            : isDark
              ? 'rgba(255,255,255,0.05)'
              : alpha(theme.palette.primary.main, 0.04),
        },
      }}
    >
      <Box
        onClick={onClick}
        sx={{ display: 'flex', flexDirection: 'column', height: '100%', cursor: 'pointer' }}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexDirection: 'column' }}>
            <Avatar
              sx={{ width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.1)', color: 'inherit' }}
            >
              <FolderWithFiles weight='BoldDuotone' size={32} />
            </Avatar>
            <Box sx={{ minWidth: 0, maxWidth: 120, flex: 1 }}>
              <Typography
                variant="body2"
                sx={{ wordBreak: 'break-word', opacity: 0.92, fontWeight: 500, fontSize: '0.75rem', lineHeight: 1.2 }}
              >
                {name}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>
                {isPinned ? 'مجلد مثبت' : 'مجلد'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 0.5, justifyContent: 'center' }}>
        {onTogglePin && (
          <Tooltip title={isPinned ? 'إلغاء التثبيت' : 'تثبيت المجلد'}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                size="small"
                variant="text"
                onClick={e => {
                  e.stopPropagation()
                  onTogglePin(folderPath)
                }}
                disabled={isDeleting || isDownloading}
                sx={{
                  borderRadius: 999,
                  minWidth: 'auto',
                  p: 1,
                  color: isPinned ? 'warning.main' : 'text.secondary',
                }}
              >
                <PushPinIcon fontSize="small" sx={{ transform: isPinned ? 'rotate(0deg)' : 'rotate(45deg)' }} />
              </Button>
            </span>
          </Tooltip>
        )}
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
