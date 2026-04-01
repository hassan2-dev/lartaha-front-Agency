import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Stack,
  Typography,
} from '@mui/material'
import type { ChatMentionType, ChatBootstrapData } from '../../api/chatApi'

interface MentionDialogProps {
  open: boolean
  onClose: () => void
  mentionType: ChatMentionType
  bootstrap: ChatBootstrapData
  onAddMention: (type: ChatMentionType, id: string, label: string) => void
}

export default function MentionDialog({
  open,
  onClose,
  mentionType,
  bootstrap,
  onAddMention,
}: MentionDialogProps) {
  const mentionOptions = mentionType === 'task'
    ? bootstrap.tasks.map((t) => ({
        id: t.id,
        label: t.title,
      }))
    : bootstrap.files.map((f) => ({
        id: f.id,
        label: f.name,
      }))

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mentionType === 'task' ? 'إضافة تاق مهمة' : 'إضافة تاق ملف'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <Stack sx={{ maxHeight: 260, overflowY: 'auto' }} spacing={0.75}>
            {mentionOptions.map((option) => (
              <Button
                key={`${mentionType}_${option.id}`}
                variant="outlined"
                onClick={() => onAddMention(mentionType, option.id, option.label)}
                sx={{ justifyContent: 'flex-start' }}
              >
                {option.label}
              </Button>
            ))}
            {mentionOptions.length === 0 && (
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                لا توجد عناصر متاحة.
              </Typography>
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  )
}
