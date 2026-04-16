import { Avatar, Box, Typography } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'

interface LoginHeaderProps {
  title: string
  subtitle: string
}

export function LoginHeader({ title, subtitle }: LoginHeaderProps) {
  return (
    <Box
      sx={{
        p: 4,
        background: t =>
          `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
        textAlign: 'center',
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
          width: 64,
          height: 64,
          mx: 'auto',
          mb: 2,
          background: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        <LockOutlinedIcon sx={{ fontSize: 32 }} />
      </Avatar>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: 'white',
          mb: 1,
          textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontWeight: 300,
          fontSize: '0.95rem',
        }}
      >
        {subtitle}
      </Typography>
    </Box>
  )
}
