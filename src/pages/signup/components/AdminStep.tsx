import { Box, TextField, Button, Grid, IconButton } from '@mui/material'
import { Person, Visibility, VisibilityOff, ArrowForward, ArrowBack } from '@mui/icons-material'
import type { AdminStepProps } from '../types'

export const AdminStep = ({
  adminData,
  loading,
  showPassword,
  showConfirmPassword,
  onAdminChange,
  onTogglePassword,
  onToggleConfirmPassword,
  onSubmit,
  onBack,
}: AdminStepProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
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
            onChange={e => onAdminChange('name', e.target.value)}
            variant="outlined"
            slotProps={{
              input: {
                startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
              },
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
            onChange={e => onAdminChange('email', e.target.value)}
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
            onChange={e => onAdminChange('password', e.target.value)}
            variant="outlined"
            slotProps={{
              input: {
                endAdornment: (
                  <IconButton onClick={onTogglePassword} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              },
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
            onChange={e => onAdminChange('confirmPassword', e.target.value)}
            variant="outlined"
            slotProps={{
              input: {
                endAdornment: (
                  <IconButton onClick={onToggleConfirmPassword} edge="end">
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              },
            }}
          />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button variant="outlined" onClick={onBack} startIcon={<ArrowBack sx={{ ml: 1 }} />}>
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
}
