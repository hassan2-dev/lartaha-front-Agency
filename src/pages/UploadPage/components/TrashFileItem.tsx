import {
  Box,
  Button,
  Typography,
  Tooltip,
  Avatar,
  useTheme,
  Checkbox,
  ListItem,
} from '@mui/material'
import { RestartSquare } from '@solar-icons/react'
import { getFileType, getFileIcon } from './utils'

type TrashFile = {
  id: string
  filename: string
  originalKey: string
  deletedAt?: string
  permanentDeleteAt?: string
  deletedBy?: { name: string; isAdmin: boolean }
}

export function TrashFileItem({
  file,
  onRestore,
  selected,
  onToggleSelect,
}: {
  file: TrashFile
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
        <Typography variant="body2" sx={{ wordBreak: 'break-word', opacity: 0.92, fontWeight: 500 }}>
          {filename}
        </Typography>

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
            sx={{ borderRadius: 999, minWidth: 'auto', p: 1, color: '#fff' }}
          >
            <RestartSquare size={40} weight={"BoldDuotone"} />
          </Button>
        </Tooltip>
      </Box>
    </ListItem>
  )
}
