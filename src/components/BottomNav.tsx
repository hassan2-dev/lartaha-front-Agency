import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Home,
  CloudUpload,
  ClipboardText,
  ChatRound,
  ClockCircle,
  Settings,
} from '@solar-icons/react'
import { useNavigate, useLocation } from 'react-router-dom'

const mobileNavItems = [
  { text: 'الرئيسية', icon: <Home size={26} />, path: '/dashboard' },
  { text: 'الملفات', icon: <CloudUpload size={26} />, path: '/dashboard/upload' },
  { text: 'المهام', icon: <ClipboardText size={26} />, path: '/dashboard/tasks' },
  { text: 'الدردشة', icon: <ChatRound size={26} />, path: '/dashboard/chat' },
  { text: 'الأنشطة', icon: <ClockCircle size={26} />, path: '/dashboard/activity' },
  { text: 'الإعدادات', icon: <Settings size={26} />, path: '/dashboard/settings' },
]

export default function BottomNav() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()
  const location = useLocation()

  if (!isMobile) return null

  const getCurrentIndex = () => {
    const index = mobileNavItems.findIndex(
      item =>
        location.pathname === item.path ||
        (item.path === '/dashboard' && location.pathname === '/dashboard/')
    )
    return index >= 0 ? index : 0
  }

  return (
    <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
      <BottomNavigation
        value={getCurrentIndex()}
        onChange={(_, newValue) => {
          navigate(mobileNavItems[newValue].path)
        }}
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderTop: '1px solid rgba(25, 118, 210, 0.12)',
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
          height: 64,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            maxWidth: 'none',
            flex: 1,
            padding: '8px 0',
            minHeight: 64,
            transition: 'all 0.3s',
            fontSize: '0.8rem',
            '&.Mui-selected': {
              color: 'primary.main',
              '& .MuiSvgIcon-root': {
                transform: 'scale(1.1)',
              },
            },
          },
        }}
      >
        {mobileNavItems.map(item => (
          <BottomNavigationAction
            key={item.path}
            icon={item.icon}
            label={item.text}
            showLabel={true}
            sx={{
              gap: 0.5,
              fontSize: '0.7rem',
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.7rem',
                fontWeight: 500,
              },
            }}
          />
        ))}
      </BottomNavigation>
    </Box>
  )
}
