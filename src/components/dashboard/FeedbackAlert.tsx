import { Alert } from '@mui/material'
import type { ActionFeedback } from '../../types/dashboard'

interface FeedbackAlertProps {
  feedback: ActionFeedback | null
}

export const FeedbackAlert = ({ feedback }: FeedbackAlertProps) => {
  if (!feedback) return null

  return (
    <Alert severity={feedback.type} sx={{ mb: 2 }}>
      {feedback.message}
    </Alert>
  )
}
