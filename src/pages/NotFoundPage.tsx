import { Box, Button, Container, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box
        sx={{
          p: 4,
          borderRadius: 2,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          404
        </Typography>
        <Typography sx={{ mt: 1, opacity: 0.8 }}>
          الصفحة غير موجودة.
        </Typography>
        <Button sx={{ mt: 3 }} variant="contained" onClick={() => navigate('/')}>
          الذهاب إلى الرفع
        </Button>
      </Box>
    </Container>
  )
}

