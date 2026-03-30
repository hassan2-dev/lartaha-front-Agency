import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Container,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Avatar,
  Grid,
  useTheme,
  alpha,
  CardContent,
  IconButton,
  Fade,
} from '@mui/material'
import {
  Business,
  Person,
  Workspaces,
  CheckCircle,
  ArrowForward as ArrowBack,
  ArrowBack as ArrowForward,
  CloudUpload,
  Delete,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import { api } from '../api/http'
import { useAuth } from '../contexts/AuthContext'

interface AdminData {
  email: string
  password: string
  confirmPassword: string
  name: string
}

interface WorkspaceData {
  name: string
  industry: string
  logo: string
  logoFile: File | null
}

export default function SignUpPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const theme = useTheme()
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [adminData, setAdminData] = useState<AdminData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  })

  const [workspaceData, setWorkspaceData] = useState<WorkspaceData>({
    name: '',
    industry: '',
    logo: '',
    logoFile: null,
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const steps = ['إنشاء حساب المدير', 'إعداد مساحة العمل', 'دعوة أعضاء الفريق']

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (adminData.password !== adminData.confirmPassword) {
      setError('كلمات المرور غير متطابقة')
      return
    }

    if (adminData.password.length < 6) {
      setError('يجب أن تكون كلمة المرور 6 أحرف على الأقل')
      return
    }

    setLoading(true)
    setError('')

    try {
      // First create the admin account
      await api.post('/api/auth/signup', {
        email: adminData.email.trim(),
        password: adminData.password,
        name: adminData.name.trim(),
      })

      // Then login to update authentication state
      await login({
        username: adminData.email.trim(),
        password: adminData.password,
      })

      setActiveStep(1)
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل في إنشاء الحساب')
    } finally {
      setLoading(false)
    }
  }

  const handleWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!workspaceData.name.trim()) {
      setError('اسم مساحة العمل مطلوب')
      return
    }

    setLoading(true)
    setError('')

    try {
      let logoUrl = ''

      // Upload logo if file exists
      if (workspaceData.logoFile) {
        const formData = new FormData()
        formData.append('files', workspaceData.logoFile)
        formData.append('batchName', 'workspace-logo') // Tag for workspace logo

        try {
          const uploadResponse = await api.post('/api/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          })
          logoUrl = uploadResponse.data.uploaded?.[0]?.key || ''
          // Convert R2 key to URL if needed
          if (logoUrl) {
            logoUrl = `https://pub-526610db23bc44bd9de0268203a6a676.r2.dev/${logoUrl}`
          }
        } catch (uploadError) {
          console.error('Upload failed:', uploadError)
          // Continue without logo if upload fails
          logoUrl = ''
        }
      }

      const workspaceResponse = await api.post('/api/workspaces', {
        name: workspaceData.name.trim(),
        industry: workspaceData.industry.trim() || undefined,
        logo: logoUrl || undefined,
      })

      console.log('Workspace created successfully:', workspaceResponse.data)
      setActiveStep(2)
    } catch (err: any) {
      console.error('Workspace creation error:', err)
      setError(err.response?.data?.message || 'فشل في إنشاء مساحة العمل')
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = () => {
    navigate('/dashboard/teams')
  }

  const handleAdminChange = (field: keyof AdminData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdminData(prev => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  const handleWorkspaceChange = (field: keyof WorkspaceData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkspaceData(prev => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('يرجى اختيار ملف صورة صالح')
        return
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('حجم الملف يجب ألا يتجاوز 5 ميجابايت')
        return
      }

      setWorkspaceData(prev => ({
        ...prev,
        logoFile: file,
        logo: URL.createObjectURL(file), // Preview URL
      }))
      setError('')
    }
  }

  const handleLogoRemove = () => {
    setWorkspaceData(prev => ({
      ...prev,
      logoFile: null,
      logo: '',
    }))
  }

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box component="form" onSubmit={handleAdminSubmit} sx={{ mt: 1 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  required
                  fullWidth
                  id="name"
                  label="الاسم الكامل"
                  name="name"
                  autoComplete="name"
                  autoFocus
                  value={adminData.name}
                  onChange={handleAdminChange('name')}
                  variant="outlined"
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="البريد الإلكتروني"
                  name="email"
                  autoComplete="email"
                  type="email"
                  value={adminData.email}
                  onChange={handleAdminChange('email')}
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="كلمة المرور"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
                  value={adminData.password}
                  onChange={handleAdminChange('password')}
                  variant="outlined"
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  required
                  fullWidth
                  name="confirmPassword"
                  label="تأكيد كلمة المرور"
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={adminData.confirmPassword}
                  onChange={handleAdminChange('confirmPassword')}
                  variant="outlined"
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
                startIcon={<ArrowBack sx={{ ml: 1 }} />}
              >
                العودة
              </Button>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                endIcon={<ArrowForward sx={{ mr: 1 }} />}
                sx={{ minWidth: 150 }}
              >
                {loading ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
              </Button>
            </Box>
          </Box>
        )

      case 1:
        return (
          <Box component="form" onSubmit={handleWorkspaceSubmit} sx={{ mt: 1 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <Business sx={{ fontSize: 32 }} />
              </Avatar>
              <Typography variant="h6" gutterBottom>
                أخبرنا عن مساحة عملك
              </Typography>
              <Typography color="text.secondary" variant="body2">
                قم بإعداد مساحة العمل الخاصة بك لبدء التعاون مع فريقك
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  required
                  fullWidth
                  id="workspaceName"
                  label="اسم مساحة العمل"
                  name="workspaceName"
                  value={workspaceData.name}
                  onChange={handleWorkspaceChange('name')}
                  placeholder="مثال: شركة التقنية المتقدمة"
                  variant="outlined"
                  InputProps={{
                    startAdornment: <Workspaces sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  id="industry"
                  label="الصناعة"
                  name="industry"
                  value={workspaceData.industry}
                  onChange={handleWorkspaceChange('industry')}
                  placeholder="مثال: التكنولوجيا، الرعاية الصحية، التعليم"
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    شعار مساحة العمل
                  </Typography>
                  <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 3, textAlign: 'center' }}>
                    {workspaceData.logo ? (
                      <Box sx={{ position: 'relative', display: 'inline-block' }}>
                        <Avatar
                          src={workspaceData.logo}
                          sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
                          variant="rounded"
                        />
                        <IconButton
                          onClick={handleLogoRemove}
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' },
                          }}
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box>
                        <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          اسحب وأفلت ملف الشعار هنا
                        </Typography>
                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<CloudUpload />}
                        >
                          اختيار ملف
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={handleLogoUpload}
                          />
                        </Button>
                      </Box>
                    )}
                    {!workspaceData.logo && (
                      <Button
                        variant="text"
                        component="label"
                        size="small"
                        sx={{ mt: 1 }}
                      >
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={handleLogoUpload}
                        />
                        أو اختر ملف
                      </Button>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    الصيغات المقبولة: JPG, PNG, GIF (الحد الأقصى: 5 ميجابايت)
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                variant="outlined"
                onClick={() => setActiveStep(0)}
                startIcon={<ArrowBack sx={{ ml: 1 }} />}
              >
                السابق
              </Button>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                endIcon={<ArrowForward sx={{ mr: 1 }} />}
                sx={{ minWidth: 150 }}
              >
                {loading ? 'جارٍ الإنشاء...' : 'إنشاء مساحة العمل'}
              </Button>
            </Box>
          </Box>
        )

      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: alpha(theme.palette.success.main, 0.1),
                color: theme.palette.success.main,
                mx: 'auto',
                mb: 3,
              }}
            >
              <CheckCircle sx={{ fontSize: 40 }} />
            </Avatar>

            <Typography variant="h4" gutterBottom fontWeight="bold">
              مساحة العمل جاهزة! 🎉
            </Typography>

            <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
              تم إعداد مساحة العمل بنجاح. يمكنك الآن دعوة أعضاء الفريق والبدء في التعاون.
            </Typography>

            <Paper
              sx={{
                p: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                mb: 4,
                maxWidth: 500,
                mx: 'auto',
              }}
            >
              <Typography variant="h6" gutterBottom color="primary.main">
                الخطوات التالية:
              </Typography>
              <Box component="ol" sx={{ textAlign: 'right', pr: 2 }}>
                <Typography component="li" sx={{ mb: 1 }}>
                  إنشاء فرق العمل المختلفة
                </Typography>
                <Typography component="li" sx={{ mb: 1 }}>
                  دعوة أعضاء الفريق عبر البريد الإلكتروني
                </Typography>
                <Typography component="li" sx={{ mb: 1 }}>
                  إدارة المهام والملفات المشتركة
                </Typography>
                <Typography component="li">
                  متابعة أنشطة الفريق والتقدم
                </Typography>
              </Box>
            </Paper>

            <Button
              variant="contained"
              size="large"
              onClick={handleFinish}
              endIcon={<ArrowForward sx={{ mr: 1 }} />}
              sx={{ mb: 2, px: 4, py: 1.5 }}
            >
              الانتقال إلى لوحة التحكم
            </Button>

            <Typography variant="body2" color="text.secondary">
              يمكنك دعوة أعضاء الفريق لاحقاً من صفحة الفرق
            </Typography>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        display: 'flex',
        alignItems: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Fade in timeout={600}>
          <Paper
            elevation={8}
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              transition: 'transform 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
              }
            }}
          >
            <Box
              sx={{
                p: 6,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                textAlign: 'center',
                color: 'white',
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
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 3,
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
              >
                <Business sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography component="h1" variant="h3" gutterBottom fontWeight="bold" sx={{ position: 'relative', zIndex: 1 }}>
                إنشاء مساحة العمل الخاصة بك
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, position: 'relative', zIndex: 1 }}>
                ابدأ رحلتك معنا من خلال إنشاء حساب مدير وإعداد مساحة العمل الخاصة بك
              </Typography>
            </Box>

            <CardContent sx={{ p: 6 }}>
              <Fade in timeout={800}>
                <Box>
                  {error && (
                    <Alert severity="error" sx={{ mb: 4, borderRadius: 3, animation: 'shake 0.5s ease-in-out' }}>
                      {error}
                    </Alert>
                  )}

                  <Stepper
                    activeStep={activeStep}
                    alternativeLabel
                    sx={{
                      mb: 8,
                      direction: 'rtl',
                      '& .MuiStepLabel-root .Mui-active': {
                        color: 'primary.main',
                      },
                      '& .MuiStepLabel-root .Mui-completed': {
                        color: 'success.main',
                      },
                      '& .MuiStepConnector-root': {
                        direction: 'rtl',
                      },
                      '& .MuiStepConnector-line': {
                        direction: 'rtl',
                      },
                    }}
                  >
                    {steps.map((label) => (
                      <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>

                  {renderStepContent(activeStep)}
                </Box>
              </Fade>
            </CardContent>
          </Paper>
        </Fade>
      </Container>
    </Box>
  )
}
