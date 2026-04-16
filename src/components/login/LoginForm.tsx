import { Box, Button, TextField, CircularProgress } from '@mui/material'
import type { FormEvent } from 'react'
import { PasswordInput } from './PasswordInput'

interface LoginFormProps {
  email: string
  password: string
  showPassword: boolean
  isLoading: boolean
  onEmailChange: (email: string) => void
  onPasswordChange: (password: string) => void
  onTogglePasswordVisibility: () => void
  onSubmit: (e: FormEvent) => void
}

export function LoginForm({
  email,
  password,
  showPassword,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onTogglePasswordVisibility,
  onSubmit,
}: LoginFormProps) {
  return (
    <Box component="form" onSubmit={onSubmit} sx={{ '& .MuiTextField-root': { mb: 2 } }}>
      <TextField
        label="البريد الإلكتروني"
        value={email}
        onChange={e => onEmailChange(e.target.value)}
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
            },
          },
        }}
        InputProps={{
          sx: {
            fontSize: '0.95rem',
          },
        }}
      />

      <PasswordInput
        value={password}
        onChange={onPasswordChange}
        showPassword={showPassword}
        onToggleVisibility={onTogglePasswordVisibility}
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
          boxShadow: t => `0 2px 8px ${t.palette.primary.main}25`,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: t => `0 4px 16px ${t.palette.primary.main}30`,
            transform: 'translateY(-1px)',
          },
          '&:disabled': {
            backgroundColor: 'action.disabledBackground',
            color: 'action.disabled',
          },
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
    </Box>
  )
}
