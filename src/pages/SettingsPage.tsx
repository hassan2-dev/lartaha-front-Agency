import { useState, useEffect } from 'react'
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
  CircularProgress,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  User,
  ArrowRight,
  Home,
  Camera,
  CheckSquare,
} from '@solar-icons/react'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { fetchWorkspace, updateWorkspace } from '../api/workspaceApi'
import { requestPasswordReset } from '../api/authApi'
import { API_ENV } from '../config/api'
// import PushNotificationDebug from '../components/PushNotificationDebug' // Commented out - not used

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

  // Workspace settings state
  const [workspaceName, setWorkspaceName] = useState('')
  const [industry, setIndustry] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [loadingWorkspace, setLoadingWorkspace] = useState(false)
  const [saving, setSaving] = useState(false)
  const [passwordResetLoading, setPasswordResetLoading] = useState(false)
  const [passwordResetMessage, setPasswordResetMessage] = useState('')
  const [passwordResetError, setPasswordResetError] = useState('')

  useEffect(() => {
    if (user?.workspaceId && user?.isAdmin) {
      loadWorkspaceDetails(user.workspaceId)
    }
  }, [user])

  const loadWorkspaceDetails = async (id: string) => {
    try {
      setLoadingWorkspace(true)
      const data = await fetchWorkspace(id)
      setWorkspaceName(data.name || '')
      setIndustry(data.industry || '')
      setLogoPreview(data.logo || '')
    } catch (err) {
      console.error('Failed to load workspace:', err)
    } finally {
      setLoadingWorkspace(false)
    }
  }

  const handlePasswordResetRequest = async () => {
    if (!user?.email) {
      setPasswordResetError('لا يوجد بريد إلكتروني مرتبط بالحساب.')
      return
    }

    setPasswordResetError('')
    setPasswordResetMessage('')

    try {
      setPasswordResetLoading(true)
      const response = await requestPasswordReset(user.email)
      setPasswordResetMessage(response.message || 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.')
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setPasswordResetError(message || 'تعذر إرسال رابط إعادة تعيين كلمة المرور.')
    } finally {
      setPasswordResetLoading(false)
    }
  }

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) return
      if (file.size > 5 * 1024 * 1024) return

      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

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

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      // 1. Save personal settings (mock)
      console.log('Saving individual settings:', { darkMode, autoUpload, language, maxFileSize })

      // 2. Save workspace settings if admin and changed
      if (user?.isAdmin && user.workspaceId) {
        let finalLogoUrl = logoPreview

        // Upload logo if new one selected
        if (logoFile) {
          const formData = new FormData()
          formData.append('files', logoFile)
          formData.append('batchName', 'workspace-assets')

          const uploadRes = await fetch(API_ENV.uploadPath, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('larthaa_auth_token')}`,
            },
            body: formData,
          })

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json()
            if (uploadData.uploaded && uploadData.uploaded[0]) {
              const baseUrl = (API_ENV.r2PublicBaseUrl || '').replace(/\/+$/, '')
              const safeKey = uploadData.uploaded[0].key.replace(/^\/+/, '')
              finalLogoUrl = `${baseUrl}/${safeKey}`
            }
          }
        }

        await updateWorkspace(user.workspaceId, {
          name: workspaceName.trim(),
          industry: industry.trim(),
          logo: finalLogoUrl,
        })
      }

      setSuccessMessage('تم حفظ الإعدادات بنجاح')
      // Reload the page to reflect all changes across the app after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
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

      {passwordResetMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {passwordResetMessage}
        </Alert>
      )}

      {passwordResetError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {passwordResetError}
        </Alert>
      )}

      {/* General Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          الإعدادات العامة
        </Typography>

        {/* Debug Info - Temporary */}
        {/* <PushNotificationDebug /> */}

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
              {user?.name?.charAt(0).toUpperCase() || <User size={24} />}
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
                onClick={handlePasswordResetRequest}
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
              borderRadius: 2,
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

      {/* Workspace Settings (Admin Only) */}
      {user?.isAdmin && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Home size={24} />
            إعدادات مساحة العمل
          </Typography>

          {loadingWorkspace ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Logo Section */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={logoPreview}
                    variant="rounded"
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: 'primary.main',
                      fontSize: '2rem',
                      borderRadius: 2,
                    }}
                  >
                    {workspaceName.charAt(0).toUpperCase()}
                  </Avatar>
                  <input
                    accept="image/*"
                    id="workspace-logo-upload"
                    type="file"
                    hidden
                    onChange={handleLogoChange}
                  />
                  <label htmlFor="workspace-logo-upload">
                    <IconButton
                      component="span"
                      size="small"
                      sx={{
                        position: 'absolute',
                        bottom: -8,
                        right: -8,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.main', color: 'white' },
                      }}
                    >
                      <Camera size={16} />
                    </IconButton>
                  </label>
                </Box>
                <Box>
                  <Typography variant="subtitle2">شعار مساحة العمل</Typography>
                  <Typography variant="caption" color="text.secondary">
                    يظهر في القائمة الجانبية والتقارير
                  </Typography>
                </Box>
              </Box>

              <Divider />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  fullWidth
                  label="اسم مساحة العمل"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="مثلاً: شركة لارتـهـا"
                />

                <FormControl fullWidth>
                  <InputLabel>المجال</InputLabel>
                  <Select
                    value={industry}
                    label="المجال"
                    onChange={(e) => setIndustry(e.target.value)}
                  >
                    <MenuItem value="technology">التكنولوجيا والبرمجيات</MenuItem>
                    <MenuItem value="marketing">التسويق والإعلام</MenuItem>
                    <MenuItem value="creative">التصميم والإبداع</MenuItem>
                    <MenuItem value="business">الأعمال والخدمات</MenuItem>
                    <MenuItem value="other">أخرى</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
        <Button
          variant="contained"
          onClick={handleSaveSettings}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <CheckSquare size={20} />}
          sx={{ borderRadius: 999, px: 4 }}
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </Box>
    </Container>
  )
}
