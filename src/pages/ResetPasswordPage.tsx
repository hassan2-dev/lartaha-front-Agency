import { useMemo, useState, type FormEvent } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Fade,
  TextField,
  Typography,
} from '@mui/material'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import LockResetIcon from '@mui/icons-material/LockReset'
import { confirmPasswordReset } from '../api/authApi'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!token) {
      setErrorMessage('رابط إعادة التعيين غير صالح أو مفقود.')
      return
    }

    if (password.length < 8) {
      setErrorMessage('يجب أن تكون كلمة المرور 8 أحرف على الأقل.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('كلمتا المرور غير متطابقتين.')
      return
    }

    try {
      setLoading(true)
      const response = await confirmPasswordReset(token, password)
      setSuccessMessage(response.message || 'تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1400)
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErrorMessage(message || 'تعذر إعادة تعيين كلمة المرور. حاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Fade in timeout={500}>
        <Card sx={{ width: '100%', maxWidth: 440, borderRadius: 2, overflow: 'hidden' }}>
          <Box
            sx={{
              p: 4,
              background: (t) => `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
              textAlign: 'center',
            }}
          >
            <Avatar sx={{ width: 62, height: 62, mx: 'auto', mb: 2, bgcolor: 'rgba(255,255,255,0.2)' }}>
              <LockResetIcon sx={{ fontSize: 30 }} />
            </Avatar>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
              إعادة تعيين كلمة المرور
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.92)' }}>
              أدخل كلمة مرور جديدة وآمنة
            </Typography>
          </Box>

          <CardContent sx={{ p: 4 }}>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {errorMessage}
              </Alert>
            )}

            {successMessage && (
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                {successMessage}
              </Alert>
            )}

            <Box component="form" onSubmit={onSubmit} sx={{ '& .MuiTextField-root': { mb: 2 } }}>
              <TextField
                label="كلمة المرور الجديدة"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                autoComplete="new-password"
              />
              <TextField
                label="تأكيد كلمة المرور"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                autoComplete="new-password"
              />

              <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ mt: 1, mb: 2, py: 1.4 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={18} sx={{ color: 'white' }} />
                    <span>جاري التحديث...</span>
                  </Box>
                ) : (
                  'تحديث كلمة المرور'
                )}
              </Button>
            </Box>

            <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                العودة إلى تسجيل الدخول
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Fade>
    </Container>
  )
}
