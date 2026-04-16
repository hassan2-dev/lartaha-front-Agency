import { TextField, IconButton, InputAdornment } from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  showPassword: boolean
  onToggleVisibility: () => void
  label?: string
  autoComplete?: string
}

export function PasswordInput({
  value,
  onChange,
  showPassword,
  onToggleVisibility,
  label = 'كلمة المرور',
  autoComplete = 'current-password',
}: PasswordInputProps) {
  return (
    <TextField
      label={label}
      value={value}
      type={showPassword ? 'text' : 'password'}
      onChange={e => onChange(e.target.value)}
      fullWidth
      autoComplete={autoComplete}
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
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              onClick={onToggleVisibility}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  )
}
