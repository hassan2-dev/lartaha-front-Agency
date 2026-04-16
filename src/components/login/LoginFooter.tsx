import { Box, Button, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'

interface LoginFooterProps {
  signupPath?: string
  signupText?: string
  promptText?: string
}

export function LoginFooter({
  signupPath = '/signup',
  signupText = 'أنشئ مساحة العمل الخاصة بك',
  promptText = 'جديد على منصتنا؟',
}: LoginFooterProps) {
  const navigate = useNavigate()

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {promptText}{' '}
        <Button
          variant="text"
          onClick={() => navigate(signupPath)}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.main',
              color: 'white',
              boxShadow: t => `0 4px 12px ${t.palette.primary.main}30`,
            },
          }}
        >
          {signupText}
        </Button>
      </Typography>
    </Box>
  )
}
