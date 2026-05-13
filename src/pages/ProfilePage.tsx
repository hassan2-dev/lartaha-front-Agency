import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Container,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material'
import { CameraAlt as CameraIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CheckCircle } from '@solar-icons/react'
import { normalizeAvatarUrlForDisplay } from '../api/authApi'
import { api } from '../api/http'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, updateUser, refreshMe } = useAuth()
  console.log('👤 ProfilePage rendered with user:', user)
  console.log('👤 ProfilePage user name:', user?.name)
  console.log('👤 ProfilePage user email:', user?.email)
  console.log('👤 ProfilePage user avatar:', user?.avatar)

  const [name, setName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    console.log('🔄 ProfilePage useEffect triggered with user:', user)
    if (user) {
      console.log('📝 Setting form fields - name:', user.name, 'avatar:', user.avatar)
      setName(user.name || '')
      setAvatarPreview(normalizeAvatarUrlForDisplay(user.avatar) ?? user.avatar ?? '')
      console.log(
        '✅ Form fields set - name:',
        user.name || '',
        'avatarPreview:',
        user.avatar || ''
      )
    } else {
      console.log('❌ No user data available')
    }
  }, [user])

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('يرجى اختيار ملف صورة صالح')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت')
        return
      }

      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setError(null)
    }
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(null)

    if (!name.trim()) {
      setError('يرجى كتابة الاسم')
      return
    }

    // Debug token storage
    console.log('🔍 localStorage contents:')
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        console.log(`  ${key}: ${value?.substring(0, 50)}...`)
      }
    }

    const token = localStorage.getItem('larthaa_auth_token')
    console.log('🔑 Retrieved token (larthaa_auth_token):', token)
    console.log('🔑 Token length:', token?.length)
    console.log('🔑 Token type:', typeof token)

    if (!token) {
      setError('يرجى تسجيل الدخول مرة أخرى')
      return
    }

    setLoading(true)
    try {
      // Upload avatar if changed
      let avatarUrl = user?.avatar
      if (avatarFile) {
        console.log('📤 Starting avatar upload for file:', avatarFile.name)

        const formData = new FormData()
        formData.append('avatar', avatarFile)

        const uploadRes = await api.post<Record<string, unknown>>('/api/upload/avatar', formData)
        const uploadResult = uploadRes.data as Record<string, unknown>
        console.log('✅ Upload successful:', uploadResult)
        const nestedData = uploadResult.data as Record<string, unknown> | undefined
        const nestedUser = nestedData?.user as Record<string, unknown> | undefined
        const topUser = uploadResult.user as Record<string, unknown> | undefined
        const pickedUrl =
          (typeof uploadResult.url === 'string' ? uploadResult.url : undefined) ??
          (typeof nestedData?.url === 'string' ? nestedData.url : undefined) ??
          (typeof topUser?.avatar === 'string' ? topUser.avatar : undefined) ??
          (typeof nestedUser?.avatar === 'string' ? nestedUser.avatar : undefined) ??
          (typeof uploadResult.avatar === 'string' ? uploadResult.avatar : undefined)
        if (!pickedUrl?.trim()) {
          throw new Error('فشل رفع الصورة: لم يُرجَع رابط من الخادم')
        }
        avatarUrl = normalizeAvatarUrlForDisplay(pickedUrl.trim()) ?? pickedUrl.trim()
      }

      // Update user profile (same API host as axios — avoids 404 when SPA is on another domain)
      console.log('📝 Updating profile with avatar URL:', avatarUrl)
      const profileRes = await api.patch('/api/user/profile', {
        name: name.trim(),
        avatar: avatarUrl,
      })
      const updatedUser = profileRes.data
      const payload = (updatedUser?.user ?? updatedUser?.data?.user ?? updatedUser) as
        | { name?: string; avatar?: string }
        | undefined
      const payloadAvatar =
        typeof payload?.avatar === 'string'
          ? normalizeAvatarUrlForDisplay(payload.avatar) ?? payload.avatar
          : undefined
      const nextAvatar = avatarUrl
        ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}v=${Date.now()}`
        : payloadAvatar
      updateUser({
        name: payload?.name || name.trim(),
        avatar: nextAvatar,
      })
      await refreshMe()
      setSuccess('تم تحديث الملف الشخصي بنجاح')
      setAvatarFile(null)
      if (nextAvatar) setAvatarPreview(nextAvatar)
    } catch (err: unknown) {
      const ax = err as {
        response?: { data?: { message?: string; error?: string } }
        message?: string
      }
      const d = ax.response?.data
      const msg =
        (typeof d?.message === 'string' && d.message.trim()) ||
        (typeof d?.error === 'string' && d.error.trim()) ||
        (typeof ax.message === 'string' && ax.message.trim()) ||
        'حدث خطأ ما'
      setError(msg)
      console.error('❌ Profile save error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          الملف الشخصي
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3, borderRadius: 2 }}>
        {/* Avatar Section */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={avatarPreview}
              slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
              sx={{
                width: 120,
                height: 120,
                bgcolor: 'primary.main',
                fontSize: '3rem',
                mb: 2,
                border: '3px solid',
                borderColor: 'primary.main',
              }}
            >
              {name.charAt(0).toUpperCase()}
            </Avatar>
            <input
              accept="image/*"
              id="avatar-upload"
              type="file"
              hidden
              onChange={handleAvatarChange}
            />
            <label htmlFor="avatar-upload">
              <IconButton
                component="span"
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  bgcolor: 'background.paper',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                  },
                }}
              >
                <CameraIcon />
              </IconButton>
            </label>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            انقر على الكاميرا لتغيير الصورة الشخصية
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
            الصيغ المسموح بها: JPG, PNG, GIF (الحجم الأقصى: 5 ميجابايت)
          </Typography>
        </Box>

        {/* Name Field */}
        <TextField
          fullWidth
          label="الاسم"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={loading}
          sx={{ mb: 3 }}
          inputProps={{
            sx: {
              textAlign: 'right',
            },
          }}
          InputLabelProps={{
            sx: {
              right: 20,
              left: 'auto',
              transformOrigin: 'right top',
            },
          }}
        />

        {/* Email (Read-only) */}
        <TextField
          fullWidth
          label="البريد الإلكتروني"
          value={user?.email || ''}
          disabled
          sx={{ mb: 3 }}
          helperText="لا يمكن تغيير البريد الإلكتروني"
          inputProps={{
            sx: {
              textAlign: 'right',
            },
          }}
          InputLabelProps={{
            sx: {
              right: 20,
              left: 'auto',
              transformOrigin: 'right top',
            },
          }}
        />

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" onClick={() => navigate('/')} disabled={loading}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading || !name.trim()}
            endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
            sx={{ gap: 0.5 }}
          >
            {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}
