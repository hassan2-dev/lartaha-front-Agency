import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'

interface CreateTaskDialogProps {
  open: boolean
  title: string
  description: string
  isCreating: boolean
  onClose: () => void
  onTitleChange: (title: string) => void
  onDescriptionChange: (description: string) => void
  onSubmit: () => void
}

export const CreateTaskDialog = ({
  open,
  title,
  description,
  isCreating,
  onClose,
  onTitleChange,
  onDescriptionChange,
  onSubmit,
}: CreateTaskDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>إنشاء مهمة جديدة</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="عنوان المهمة"
          value={title}
          onChange={event => onTitleChange(event.target.value)}
          sx={{ mt: 1 }}
        />
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="الوصف (اختياري)"
          value={description}
          onChange={event => onDescriptionChange(event.target.value)}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={isCreating} color="inherit">
          إلغاء
        </Button>
        <Button onClick={onSubmit} variant="contained" disabled={isCreating || !title.trim()}>
          {isCreating ? <CircularProgress size={18} color="inherit" /> : 'إنشاء المهمة'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
