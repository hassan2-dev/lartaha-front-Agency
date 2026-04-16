import { Alert, Box } from '@mui/material'

interface LoginAlertsProps {
  error: string | null
  forgotMessage: string | null
  forgotError: string | null
}

export function LoginAlerts({ error, forgotMessage, forgotError }: LoginAlertsProps) {
  return (
    <Box>
      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderRadius: 2,
            animation: 'shake 0.5s ease-in-out',
            '& .MuiAlert-icon': {
              color: 'error.main',
            },
          }}
        >
          {error}
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
    </Box>
  )
}
