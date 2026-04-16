/**
 * BulkActionToolbar Component
 * Toolbar for bulk file operations
 */

import { Box, Typography, Button } from '@mui/material'
import SelectAllIcon from '@mui/icons-material/SelectAll'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteIcon from '@mui/icons-material/Delete'
import RestoreIcon from '@mui/icons-material/Restore'

interface BulkActionToolbarProps {
  selectedCount: number
  showTrash: boolean
  loading: boolean
  onClearSelection: () => void
  onSelectAll: () => void
  onDownload: () => void
  onDelete: () => void
  onRestore: () => void
}

export function BulkActionToolbar({
  selectedCount,
  showTrash,
  loading,
  onClearSelection,
  onSelectAll,
  onDownload,
  onDelete,
  onRestore,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null

  return (
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
        {selectedCount} عنصر محدد
      </Typography>
      <Box sx={{ flex: 1 }} />
      <Button variant="outlined" size="small" onClick={onClearSelection} sx={{ borderRadius: 999 }}>
        إلغاء التحديد
      </Button>
      <Button
        variant="outlined"
        size="small"
        startIcon={<SelectAllIcon />}
        onClick={onSelectAll}
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
            onClick={onDownload}
            disabled={loading}
            sx={{ borderRadius: 999 }}
          >
            تنزيل ({selectedCount})
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={onDelete}
            disabled={loading}
            sx={{ borderRadius: 999 }}
          >
            حذف ({selectedCount})
          </Button>
        </>
      )}
      {showTrash && (
        <Button
          variant="contained"
          color="success"
          size="small"
          startIcon={<RestoreIcon />}
          onClick={onRestore}
          disabled={loading}
          sx={{ borderRadius: 999 }}
        >
          استعادة ({selectedCount})
        </Button>
      )}
    </Box>
  )
}
