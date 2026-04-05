import { useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Alert,
  Avatar,
  IconButton,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Person as PersonIcon, ArrowForward as ArrowForwardIcon } from '@mui/icons-material'
import { usePushNotifications } from '../hooks/usePushNotifications'
import PushNotificationDebug from '../components/PushNotificationDebug'

export default function SettingsPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { user } = useAuth()
  console.log('👤 SettingsPage user data:', user)
  console.log('👤 User name:', user?.name)
  console.log('👤 User email:', user?.email)
  console.log('👤 User avatar:', user?.avatar)

  const { isSubscribed, subscribe, unsubscribe, isSupported } = usePushNotifications()
  console.log('🔔 [SettingsPage] Push notification state:', { isSubscribed, isSupported })
  console.log('🔔 [SettingsPage] Switch will be disabled:', !isSupported)
  const [successMessage, setSuccessMessage] = useState('')
  const [darkMode, setDarkMode] = useState(theme.palette.mode === 'dark')
  const [autoUpload, setAutoUpload] = useState(true)
  const [language, setLanguage] = useState('ar')
  const [maxFileSize, setMaxFileSize] = useState('100')

  const handlePushToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe()
      if (success) {
        setSuccessMessage('تم إلغاء الاشتراك في الإشعارات بنجاح')
      }
    } else {
      const success = await subscribe()
      if (success) {
        setSuccessMessage('تم الاشتراك في الإشعارات بنجاح')
      }
    }
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleSaveSettings = () => {
    // In a real app, this would save to backend/localStorage
    setSuccessMessage('تم حفظ الإعدادات بنجاح')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 4 }}>
        الإعدادات
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {/* General Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          الإعدادات العامة
        </Typography>

        {/* Debug Info - Temporary */}
        <PushNotificationDebug />

        <List sx={{ py: 0 }}>
          <ListItem sx={{ px: 0 }}>
            <ListItemText
              primary="الوضع الليلي"
              secondary="تفعيل الوضع الداكن للتطبيق"
            />
            <ListItemSecondaryAction>
              <Switch
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                color="primary"
              />
            </ListItemSecondaryAction>
          </ListItem>

          <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.12)' }} />

          <ListItem sx={{ px: 0 }}>
            <ListItemText
              primary="إشعارات المتصفح والجوّال (Push)"
              secondary={isSupported ? "تلقي إشعارات فورية عند وصول رسائل جديدة" : "هذا المتصفح لا يدعم الإشعارات الفورية"}
            />
            <ListItemSecondaryAction>
              <Switch
                checked={isSubscribed}
                onChange={handlePushToggle}
                disabled={!isSupported}
                color="primary"
              />
            </ListItemSecondaryAction>
          </ListItem>

          <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.12)' }} />

          <ListItem sx={{ px: 0 }}>
            <ListItemText
              primary="الرفع التلقائي"
              secondary="رفع الملفات تلقائياً عند تحديدها"
            />
            <ListItemSecondaryAction>
              <Switch
                checked={autoUpload}
                onChange={(e) => setAutoUpload(e.target.checked)}
                color="primary"
              />
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </Paper>

      {/* Upload Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          إعدادات الرفع
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <FormControl fullWidth>
            <InputLabel>اللغة</InputLabel>
            <Select
              value={language}
              label="اللغة"
              onChange={(e) => setLanguage(e.target.value)}
            >
              <MenuItem value="ar">العربية</MenuItem>
              <MenuItem value="en">English</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="حجم الملف الأقصى (ميجابايت)"
            type="number"
            value={maxFileSize}
            onChange={(e) => setMaxFileSize(e.target.value)}
            fullWidth
          />
        </Box>
      </Paper>

      {/* Account Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          إعدادات الحساب
        </Typography>

        {/* Profile Section */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              src={user?.avatar}
              sx={{ width: 60, height: 60, bgcolor: 'primary.main' }}
            >
              {user?.name?.charAt(0).toUpperCase() || <PersonIcon />}
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
              onClick={() => {
                console.log('🔗 Profile navigation button clicked')
                navigate('/dashboard/profile')
              }}
              sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
            >
              <ArrowForwardIcon />
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
              secondary="تحديث كلمة المرور الخاصة بك"
            />
            <ListItemSecondaryAction>
              <Button variant="outlined" size="small">
                تغيير
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

      {/* Storage Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          معلومات التخزين
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            المساحة المستخدمة: 2.5 GB من 10 GB
          </Typography>
          <Box
            sx={{
              width: '100%',
              height: 8,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: '25%',
                height: '100%',
                backgroundColor: 'primary.main',
              }}
            />
          </Box>
        </Box>

        <Button variant="outlined" size="small">
          ترقية التخزين
        </Button>
      </Paper>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
        <Button
          variant="contained"
          onClick={handleSaveSettings}
          sx={{ borderRadius: 999, px: 4 }}
        >
          حفظ الإعدادات
        </Button>
      </Box>
    </Container>
  )
}
