import {
  Paper,
  Typography,
  Box,
  Avatar,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material'
import { User as UserIcon, ArrowRight } from '@solar-icons/react'
import type { User } from '../../../contexts/AuthContext'

interface AccountSettingsSectionProps {
  user: User | null
  onNavigateToProfile: () => void
  onPasswordReset: () => void
  passwordResetLoading: boolean
}

export const AccountSettingsSection = ({
  user,
  onNavigateToProfile,
  onPasswordReset,
  passwordResetLoading,
}: AccountSettingsSectionProps) => {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
        إعدادات الحساب
      </Typography>

      {/* Profile Section */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            src={user?.avatar}
            slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
            sx={{ width: 60, height: 60, bgcolor: 'primary.main' }}
          >
            {user?.name?.charAt(0).toUpperCase() || <UserIcon size={24} />}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {user?.name || 'غير محدد'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {user?.email || 'غير محدد'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {user?.isAdmin ? 'مدير' : 'عضو'}
            </Typography>
          </Box>
          <IconButton
            onClick={onNavigateToProfile}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            <ArrowRight size={20} />
          </IconButton>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          انقر على السهم لتحديث ملفك الشخصي وتغيير الصورة الرمزية
        </Typography>
      </Box>

      <List sx={{ py: 0 }}>
        <ListItem sx={{ px: 0 }}>
          <ListItemText
            primary="تغيير كلمة المرور"
            secondary="استلام رابط آمن مؤقت عبر البريد الإلكتروني"
          />
          <ListItemSecondaryAction>
            <Button
              variant="outlined"
              size="small"
              onClick={onPasswordReset}
              disabled={passwordResetLoading}
            >
              {passwordResetLoading ? 'جارٍ الإرسال...' : 'إرسال الرابط'}
            </Button>
          </ListItemSecondaryAction>
        </ListItem>

        <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.12)' }} />

        <ListItem sx={{ px: 0 }}>
          <ListItemText
            primary="حذف الحساب"
            secondary="حذف حسابك وجميع بياناتك"
            sx={{ color: 'error.main' }}
          />
          <ListItemSecondaryAction>
            <Button variant="outlined" color="error" size="small">
              حذف
            </Button>
          </ListItemSecondaryAction>
        </ListItem>
      </List>
    </Paper>
  )
}
