/**
 * CreateFolderModal Component
 * Modal for creating new folders
 */

import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material'

interface CreateFolderModalProps {
  open: boolean
  onClose: () => void
  folderName: string
  onFolderNameChange: (name: string) => void
  onCreate: () => void
  isCreating: boolean
  error: string | null
}

export function CreateFolderModal({
  open,
  onClose,
  folderName,
  onFolderNameChange,
  onCreate,
  isCreating,
  error,
}: CreateFolderModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          value={folderName}
          onChange={e => onFolderNameChange(e.target.value)}
          disabled={isCreating}
          error={!!error}
          helperText={error || 'أدخل اسمًا فريدًا للمجلد (الأحرف المسموحة: أ-ب، 0-9، _، -)'}
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
        <Button onClick={onClose} disabled={isCreating}>
          إلغاء
        </Button>
        <Button onClick={onCreate} disabled={isCreating || !folderName.trim()} variant="contained">
          {isCreating ? 'جارٍ الإنشاء...' : 'إنشاء'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
