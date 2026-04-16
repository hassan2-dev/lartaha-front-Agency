import { Alert, Box } from '@mui/material'

interface SettingsAlertsProps {
  successMessage?: string
  passwordResetMessage?: string
  passwordResetError?: string
}

export const SettingsAlerts = ({
  successMessage,
  passwordResetMessage,
  passwordResetError,
}: SettingsAlertsProps) => {
  const hasAnyMessage = successMessage || passwordResetMessage || passwordResetError

  if (!hasAnyMessage) return null

  return (
    <Box sx={{ mb: 3 }}>
      {successMessage && (
        <Alert severity="success" sx={{ mb: passwordResetMessage || passwordResetError ? 2 : 0 }}>
          {successMessage}
        </Alert>
      )}

      {passwordResetMessage && (
        <Alert severity="success" sx={{ mb: passwordResetError ? 2 : 0 }}>
          {passwordResetMessage}
        </Alert>
      )}

      {passwordResetError && <Alert severity="error">{passwordResetError}</Alert>}
    </Box>
  )
}
