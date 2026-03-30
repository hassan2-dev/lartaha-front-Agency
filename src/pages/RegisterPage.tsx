import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  Container,
  Avatar,
  IconButton,
} from '@mui/material'
import { PhotoCamera } from '@mui/icons-material'
import { api } from '../api/http'

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const { token: tokenFromPath } = useParams<{ token?: string }>()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? tokenFromPath ?? null

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    name: '',
    position: '',
    phone: '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validatingToken, setValidatingToken] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [invitationInfo, setInvitationInfo] = useState<any>(null)

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('رابط الدعوة غير صالح')
        setValidatingToken(false)
        return
      }

      try {
        // Validate token with server
        const response = await api.post('/api/auth/validate-invitation', { token })

        if (response.data.valid) {
          setTokenValid(true)
          setInvitationInfo(response.data.invitation)
          setError('')
        } else {
          setError('رابط الدعوة غير صالح أو منتهي الصلاحية')
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'فشل التحقق من رابط الدعوة')
      } finally {
        setValidatingToken(false)
      }
    }

    validateToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      setError('رابط دعوة غير صالح')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة')
      return
    }

    if (formData.password.length < 6) {
      setError('يجب أن تكون كلمة المرور 6 أحرف على الأقل')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create form data for file upload
      const submitData = new FormData()
      submitData.append('token', token)
      submitData.append('password', formData.password)
      submitData.append('name', formData.name.trim())
      submitData.append('position', formData.position.trim() || '')
      submitData.append('phone', formData.phone.trim() || '')

      if (avatarFile) {
        submitData.append('avatar', avatarFile)
      }

      const response = await api.post('/api/auth/register', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // Store the token and clear any existing admin token
      localStorage.removeItem('token') // Clear any existing token first
      localStorage.setItem('token', response.data.token)

      // Redirect to dashboard
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل التسجيل')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        setError('يرجى اختيار ملف صورة صالح')
        return
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('حجم الصورة يجب ألا يتجاوز 5 ميجابايت')
        return
      }

      setAvatarFile(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  if (validatingToken) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            جاري التحقق من رابط الدعوة...
          </Typography>
        </Box>
      </Container>
    )
  }

  if (!tokenValid || error) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || 'رابط الدعوة غير صالح. يرجى التحقق من بريدك الإلكتروني والمحاولة مرة أخرى.'}
          </Alert>
          <Button variant="contained" onClick={() => navigate('/login')}>
            الذهاب إلى تسجيل الدخول
          </Button>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography component="h1" variant="h4" align="center" gutterBottom>
              انضمام للفريق
            </Typography>
            {invitationInfo && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
                  لقد تمت دعوتك للانضمام إلى:
                </Typography>
                <Typography variant="h6" align="center" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {invitationInfo.workspaceName}
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  بواسطة: {invitationInfo.invitedByName}
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  البريد الإلكتروني: {invitationInfo.email}
                </Typography>
              </Box>
            )}
            {!invitationInfo && (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                لقد تمت دعوتك لانضمام إلى فريق! قم بإنشاء حسابك للبدء.
              </Typography>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              {/* Avatar Upload */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                <Avatar
                  src={avatarPreview}
                  sx={{ width: 80, height: 80, mb: 1 }}
                />
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
                    color="primary"
                    sx={{
                      position: 'absolute',
                      mt: -6,
                      ml: 6,
                      bgcolor: 'background.paper',
                      border: '2px solid',
                      borderColor: 'primary.main'
                    }}
                  >
                    <PhotoCamera />
                  </IconButton>
                </label>
                <Typography variant="caption" color="text.secondary">
                  انقر لتحميل صورة الملف الشخصي
                </Typography>
              </Box>

              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="الاسم الكامل"
                name="name"
                autoComplete="name"
                autoFocus
                value={formData.name}
                onChange={handleChange('name')}
              />
              <TextField
                margin="normal"
                fullWidth
                id="position"
                label="المنصب (اختياري)"
                name="position"
                autoComplete="organization-title"
                value={formData.position}
                onChange={handleChange('position')}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="phone"
                label="رقم الهاتف"
                name="phone"
                autoComplete="tel"
                value={formData.phone}
                onChange={handleChange('phone')}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="كلمة المرور"
                type="password"
                id="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange('password')}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="تأكيد كلمة المرور"
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}
