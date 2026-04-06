import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Avatar, Box, Button, Card, CardContent, Container, TextField, Typography, IconButton, InputAdornment, Fade, CircularProgress } from '@mui/material'
import { useNavigate, } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { requestPasswordReset } from '../api/authApi'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

export default function LoginPage() {
  const navigate = useNavigate()
  const { token, login, error } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const displayedError =
    localError ?? (error ? 'فشل تسجيل الدخول. تأكد من البريد الإلكتروني وكلمة المرور.' : null)

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState<string | null>(null)
  const [forgotError, setForgotError] = useState<string | null>(null)

  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true })
  }, [navigate, token])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    setIsLoading(true)

    if (!email.trim() || !password) {
      setLocalError('يرجى إدخال البريد الإلكتروني وكلمة المرور.')
      setIsLoading(false)
      return
    }

    try {
      // Clear existing token before logging in
      localStorage.removeItem('token')

      await login({ username: email.trim(), password })
      navigate('/dashboard', { replace: true })
    } catch {
      // AuthContext already sets `error`, but we keep a local fallback message.
      setLocalError('فشل تسجيل الدخول. تأكد من البريد الإلكتروني وكلمة المرور.')
    } finally {
      setIsLoading(false)
    }
  }

  async function onForgotPassword() {
    setForgotMessage(null)
    setForgotError(null)

    if (!email.trim()) {
      setForgotError('يرجى إدخال البريد الإلكتروني أولاً.')
      return
    }

    try {
      setForgotLoading(true)
      const response = await requestPasswordReset(email.trim())
      setForgotMessage(response.message || 'إذا كان البريد مسجلاً، سيتم إرسال رابط إعادة التعيين.')
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setForgotError(message || 'تعذر إرسال رابط إعادة تعيين كلمة المرور.')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Fade in timeout={600}>
        <Card
          sx={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 2,
            boxShadow: (t) => `0 8px 24px ${t.palette.primary.main}15`,
            overflow: 'hidden',
            transition: 'transform 0.3s ease-in-out',
          }}
        >
          <Box
            sx={{
              p: 4,
              background: (t) => `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
              textAlign: 'center',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at top right, rgba(255,255,255,0.1) 0%, transparent 70%)',
              }
            }}
          >
            <Avatar
              sx={{
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 2,
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              }}
            >
              <LockOutlinedIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h4" sx={{
              fontWeight: 700,
              color: 'white',
              mb: 1,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {'تسجيل دخول'}
            </Typography>
            <Typography variant="body1" sx={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 300,
              fontSize: '0.95rem'
            }}>
              {'ارفع الي يعجبك ومعليك'}
            </Typography>
          </Box>

          <CardContent sx={{ p: 4 }}>
            <Fade in timeout={800}>
              <Box>
                {displayedError && (
                  <Alert
                    severity="error"
                    sx={{
                      mb: 3,
                      borderRadius: 2,
                      animation: 'shake 0.5s ease-in-out',
                      '& .MuiAlert-icon': {
                        color: 'error.main'
                      }
                    }}
                  >
                    {displayedError}
                  </Alert>
                )}

                {forgotMessage && (
                  <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                    {forgotMessage}
                  </Alert>
                )}

                {forgotError && (
                  <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                    {forgotError}
                  </Alert>
                )}




                <Box component="form" onSubmit={onSubmit} sx={{ '& .MuiTextField-root': { mb: 2 } }}>
                  <TextField
                    label="البريد الإلكتروني"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    autoComplete="email"
                    type="email"
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'rgba(0, 0, 0, 0.02)',
                        }
                      }
                    }}
                    InputProps={{
                      sx: {
                        fontSize: '0.95rem',
                      }
                    }}
                  />
                  <TextField
                    label="كلمة المرور"
                    value={password}
                    type={showPassword ? 'text' : 'password'}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    autoComplete="current-password"
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'rgba(0, 0, 0, 0.02)',
                        }
                      }
                    }}
                    InputProps={{
                      sx: {
                        fontSize: '0.95rem',
                      },
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            sx={{
                              color: 'text.secondary',
                              '&:hover': {
                                color: 'primary.main',
                              }
                            }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={isLoading}
                    sx={{
                      mt: 2,
                      mb: 3,
                      borderRadius: 2,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: (t) => `0 2px 8px ${t.palette.primary.main}25`,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: (t) => `0 4px 16px ${t.palette.primary.main}30`,
                        transform: 'translateY(-1px)',
                      },
                      '&:disabled': {
                        backgroundColor: 'action.disabledBackground',
                        color: 'action.disabled',
                      }
                    }}
                    fullWidth
                  >
                    {isLoading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <CircularProgress size={20} sx={{ color: 'white' }} />
                        <span>جارٍ تسجيل الدخول...</span>
                      </Box>
                    ) : (
                      'تسجيل الدخول'
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="text"
                    onClick={onForgotPassword}
                    disabled={forgotLoading}
                    sx={{
                      mt: -1,
                      mb: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                    fullWidth
                  >
                    {forgotLoading ? 'جارٍ الإرسال...' : 'نسيت كلمة المرور؟'}
                  </Button>
                </Box>

                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    جديد على منصتنا؟{' '}
                    <Button
                      variant="text"
                      onClick={() => navigate('/signup')}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        color: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.main',
                          color: 'white',
                          boxShadow: (t) => `0 4px 12px ${t.palette.primary.main}30`,
                        }
                      }}
                    >
                      أنشئ مساحة العمل الخاصة بك
                    </Button>
                  </Typography>
                </Box>
              </Box>
            </Fade>
          </CardContent>
        </Card>
      </Fade>
    </Container>
  )
}
