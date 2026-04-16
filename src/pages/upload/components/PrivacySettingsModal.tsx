/**
 * PrivacySettingsModal Component
 * Modal for managing file privacy settings
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  CircularProgress,
} from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import type { TeamMember } from '../types'

interface PrivacySettingsModalProps {
  open: boolean
  onClose: () => void
  filename: string | null
  teamMembers: TeamMember[]
  selectedMembers: string[]
  onToggleMember: (memberId: string) => void
  onSave: () => void
  loading: boolean
}

export function PrivacySettingsModal({
  open,
  onClose,
  filename,
  teamMembers,
  selectedMembers,
  onToggleMember,
  onSave,
  loading,
}: PrivacySettingsModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'background.default',
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockIcon />
          <Typography>إعدادات الخصوصية: {filename}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
          اختر أعضاء الفريق المسموح لهم الوصول إلى هذا الملف. إذا لم يتم تحديد أي عضو، سيكون الملف
          متاحًا للجميع.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              جارٍ تحميل أعضاء الفريق...
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {teamMembers.map(member => (
              <ListItem key={member.id}>
                <ListItemIcon>
                  <Checkbox
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => onToggleMember(member.id)}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={member.user?.name || member.name || member.email}
                  secondary={member.email}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button onClick={onSave} variant="contained">
          حفظ الإعدادات
        </Button>
      </DialogActions>
    </Dialog>
  )
}
