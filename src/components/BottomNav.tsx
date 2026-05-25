import { useMemo } from 'react'
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
  User,
  ClockCircle,
  Settings,
} from '@solar-icons/react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const allMobileNavItems = [
  { text: 'الرئيسية', icon: <Home size={24} />, path: '/dashboard' },
  { text: 'الملفات', icon: <CloudUpload size={24} />, path: '/dashboard/upload' },
  { text: 'المهام', icon: <ClipboardText size={24} />, path: '/dashboard/tasks' },
  { text: 'الدردشة', icon: <ChatRound size={24} />, path: '/dashboard/chat' },
  { text: 'الفرق', icon: <User size={24} />, path: '/dashboard/teams', adminOnly: true },
  { text: 'الأنشطة', icon: <ClockCircle size={24} />, path: '/dashboard/activity' },
  { text: 'الإعدادات', icon: <Settings size={24} />, path: '/dashboard/settings' },
]

export default function BottomNav() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const mobileNavItems = useMemo(
    () => allMobileNavItems.filter(item => !item.adminOnly || user?.isAdmin),
    [user?.isAdmin]
  )

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
            padding: '6px 0',
            minHeight: 64,
            transition: 'all 0.3s',
            '&.Mui-selected': {
              color: 'primary.main',
            },
          },
        }}
      >
        {mobileNavItems.map(item => (
          <BottomNavigationAction
            key={item.path}
            icon={item.icon}
            label={item.text}
            showLabel
            sx={{
              gap: 0.25,
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.6rem',
                fontWeight: 500,
                lineHeight: 1.1,
              },
            }}
          />
        ))}
      </BottomNavigation>
    </Box>
  )
}
