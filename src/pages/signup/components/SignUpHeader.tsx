import { Box, Typography, Avatar, useTheme } from '@mui/material'
import { Business } from '@mui/icons-material'

export const SignUpHeader = () => {
  const theme = useTheme()

  return (
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
          background:
            'radial-gradient(circle at top right, rgba(255,255,255,0.1) 0%, transparent 70%)',
        },
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
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Business sx={{ fontSize: 40 }} />
      </Avatar>
      <Typography
        component="h1"
        variant="h3"
        gutterBottom
        fontWeight="bold"
        sx={{ position: 'relative', zIndex: 1 }}
      >
        إنشاء مساحة العمل الخاصة بك
      </Typography>
      <Typography variant="body1" sx={{ opacity: 0.9, position: 'relative', zIndex: 1 }}>
        ابدأ رحلتك معنا من خلال إنشاء حساب مدير وإعداد مساحة العمل الخاصة بك
      </Typography>
    </Box>
  )
}
