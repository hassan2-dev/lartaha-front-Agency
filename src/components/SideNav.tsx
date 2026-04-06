import { useState } from 'react'
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  Avatar,
  Tooltip,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  UploadFile as UploadIcon,
  Task as TaskIcon,
  Chat as ChatIcon,
  People as TeamsIcon,
  History as ActivityIcon,
  Settings as SettingsIcon,
  Business as BusinessIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const drawerWidth = 280

interface NavItem {
  text: string
  icon: React.ReactNode
  path: string
}

const navItems: NavItem[] = [
  { text: 'الرئيسية', icon: <HomeIcon />, path: '/dashboard' },
  { text: 'رفع الملفات', icon: <UploadIcon />, path: '/dashboard/upload' },
  { text: 'المهام', icon: <TaskIcon />, path: '/dashboard/tasks' },
  { text: 'الدردشة', icon: <ChatIcon />, path: '/dashboard/chat' },
  { text: 'الفرق', icon: <TeamsIcon />, path: '/dashboard/teams' },
  { text: 'الأنشطة', icon: <ActivityIcon />, path: '/dashboard/activity' },
  { text: 'الإعدادات', icon: <SettingsIcon />, path: '/dashboard/settings' },
]

interface SideNavProps {
  children: React.ReactNode
  title?: string
}

export default function SideNav({ children, title = 'larthaa Agency' }: SideNavProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Styled Logo */}
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box 
          sx={{ 
            width: 48, 
            height: 48, 
            borderRadius: 1.5, 
            background: user?.workspaceLogo 
              ? 'transparent' 
              : 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            boxShadow: user?.workspaceLogo 
              ? '0 4px 12px rgba(0,0,0,0.1)' 
              : '0 8px 16px rgba(124, 58, 237, 0.2)',
            transform: user?.workspaceLogo ? 'none' : 'rotate(-4deg)',
            color: '#fff',
            fontWeight: 900,
            fontSize: '1.5rem',
            overflow: 'hidden',
            border: user?.workspaceLogo ? '2px solid' : 'none',
            borderColor: 'primary.main',
          }}
        >
          {user?.workspaceLogo ? (
            <Box 
              component="img" 
              src={user.workspaceLogo} 
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            <BusinessIcon sx={{ fontSize: '1.8rem' }} />
          )}
        </Box>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 900, 
            letterSpacing: '-0.5px',
            background: theme.palette.mode === 'dark' 
              ? 'linear-gradient(135deg, #fff 0%, #a78bfa 100%)' 
              : 'linear-gradient(135deg, #0f172a 0%, #6d28d9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center'
          }}
        >
          {user?.workspaceName || title}
        </Typography>
      </Box>

      {/* Navigation Items - Floating Style */}
      <List sx={{ flex: 1, py: 1, px: 1.5 }}>
        {navItems
          .filter((item) => {
            if (item.path === '/dashboard/teams') {
              return user?.isAdmin
            }
            return true
          })
          .map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === '/dashboard' && location.pathname === '/dashboard/')
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path)
                    if (isMobile) setMobileOpen(false)
                  }}
                  selected={isActive}
                  sx={{
                    borderRadius: 3,
                    py: 1.2,
                    px: 2,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,

                    '&.Mui-selected': {
                      background: 'linear-gradient(90deg, #a78bfa 0%, #7c3aed 100%)',
                      color: '#fff',
                      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)',
                      '&:hover': {
                        background: 'linear-gradient(90deg, #c4b5fd 0%, #8b5cf6 100%)',
                      },
                      '& .MuiListItemIcon-root': {
                        color: '#fff',
                        transform: 'scale(1.15)',
                      },
                      '& .MuiListItemText-primary': {
                        fontWeight: 800,
                      },
                    },
                    '&:not(.Mui-selected):hover': {
                      backgroundColor: 'rgba(167, 139, 250, 0.08)',
                      transform: 'translateX(-4px)',
                      '& .MuiListItemIcon-root': {
                        color: 'primary.main',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 'auto', transition: 'all 0.3s' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    sx={{
                      m: 0,
                      flex: '0 1 auto',
                      '& .MuiListItemText-primary': {
                        fontSize: '0.925rem',
                        fontWeight: isActive ? 700 : 500,
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
      </List>

      {/* Footer - Refined Profile Card */}
      <Box sx={{ p: 2, mt: 'auto' }}>
        {user && (
          <Box 
            sx={{ 
              mb: 2, 
              p: 2, 
              borderRadius: 4, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              transition: 'all 0.3s',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderColor: 'rgba(255,255,255,0.1)',
                transform: 'translateY(-2px)'
              }
            }}
          >
            <Avatar 
              src={user.avatar} 
              alt={user.name} 
              sx={{ 
                width: 42, 
                height: 42, 
                border: '2.5px solid',
                borderColor: 'primary.main',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
              }}
            >
              {user.name?.charAt(0)}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 700, mb: 0.2 }}>
                {user.name}
              </Typography>
              <Typography variant="caption" noWrap sx={{ opacity: 0.5, fontSize: '0.75rem' }}>
                {user.position || user.email}
              </Typography>
            </Box>
            <Tooltip title="تسجيل الخروج">
              <IconButton 
                size="small" 
                onClick={logout} 
                sx={{ 
                  color: 'error.light',
                  backdropFilter: 'blur(4px)',
                  backgroundColor: 'rgba(211, 47, 47, 0.05)',
                  '&:hover': { 
                    backgroundColor: 'rgba(211, 47, 47, 0.15)',
                    transform: 'rotate(15deg)'
                  }
                }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        <Typography variant="caption" sx={{ opacity: 0.4, textAlign: 'center', display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          © 2024 larthaa Agency
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', height: '100vh', direction: 'rtl' }}>
      {/* Mobile Menu Button */}
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1300, backgroundColor: 'background.paper' }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Desktop Drawer */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          anchor="right"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderLeft: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.default',
              boxShadow: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>
      )}

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            backgroundColor: 'background.default',
            boxShadow: 'none',
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          overflow: 'auto',
          backgroundColor: 'background.default',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
