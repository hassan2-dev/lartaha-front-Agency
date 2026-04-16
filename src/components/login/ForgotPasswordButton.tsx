import { Button } from '@mui/material'

interface ForgotPasswordButtonProps {
  isLoading: boolean
  onClick: () => void
}

export function ForgotPasswordButton({ isLoading, onClick }: ForgotPasswordButtonProps) {
  return (
    <Button
      type="button"
      variant="text"
      onClick={onClick}
      disabled={isLoading}
      sx={{
        mt: -1,
        mb: 2,
        textTransform: 'none',
        fontWeight: 600,
      }}
      fullWidth
    >
      {isLoading ? 'جارٍ الإرسال...' : 'نسيت كلمة المرور؟'}
    </Button>
  )
}
