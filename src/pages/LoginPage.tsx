import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Avatar, Box, Button, Card, CardContent, Container, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'

export default function LoginPage() {
  const navigate = useNavigate()
  const { token, login, loading, error } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const displayedError =
    localError ?? (error ? 'فشل تسجيل الدخول. تأكد من البريد الإلكتروني وكلمة المرور.' : null)

  useEffect(() => {
    if (token) navigate('/', { replace: true })
  }, [navigate, token])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)



    if (!email.trim() || !password) {
      setLocalError('يرجى إدخال البريد الإلكتروني وكلمة المرور.')
      return
    }

    try {
      await login({ username: email.trim(), password })
      navigate('/', { replace: true })
    } catch {
      // AuthContext already sets `error`, but we keep a local fallback message.
      setLocalError('فشل تسجيل الدخول. تأكد من البريد الإلكتروني وكلمة المرور.')
    }
  }

  return (
    <Container maxWidth="sm" sx={{ height: '100%', display: 'flex', alignItems: 'center', py: 6 }}>
      <Card sx={{ width: '100%', p: 0, overflow: 'hidden' }}>
        <Box
          sx={{
            p: 3,
            background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}55, transparent 65%)`,
            textAlign: 'center',
          }}
        >
          <Avatar
            sx={{
              width: 56,
              height: 56,
              mx: 'auto',
              mb: 1.5,
              background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}99, ${t.palette.primary.main}33)`,
            }}
          >
            <LockOutlinedIcon />
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            شركه لارثا
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
            ارفع الي يعجبك ومعليك
          </Typography>
        </Box>

        <CardContent sx={{ pt: 2, px: 3, pb: 3 }}>
          {displayedError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {displayedError}
            </Alert>
          )}

          <Box component="form" onSubmit={onSubmit}>
            <TextField
              label="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              autoComplete="email"
              margin="normal"
              type="email"
            />
            <TextField
              label="كلمة المرور"
              value={password}
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              autoComplete="current-password"
              margin="normal"
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 2, borderRadius: 999, px: 3, textTransform: 'none' }}
              fullWidth
            >
              {loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                جديد على منصتنا؟{' '}
                <Button
                  variant="text"
                  size="small"
                  onClick={() => navigate('/signup')}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 'bold',
                    '&:hover': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                    }
                  }}
                >
                  أنشئ مساحة العمل الخاصة بك
                </Button>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  )
}

