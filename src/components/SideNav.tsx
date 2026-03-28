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
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  UploadFile as UploadIcon,
  Task as TaskIcon,
  Groups as TeamsIcon,
  Settings as SettingsIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'

const drawerWidth = 280

interface NavItem {
  text: string
  icon: React.ReactNode
  path: string
}

const navItems: NavItem[] = [
  { text: 'الرئيسية', icon: <HomeIcon />, path: '/' },
  { text: 'رفع الملفات', icon: <UploadIcon />, path: '/upload' },
  { text: 'المهام', icon: <TaskIcon />, path: '/tasks' },
  { text: 'الفرق', icon: <TeamsIcon />, path: '/teams' },
  { text: 'الإعدادات', icon: <SettingsIcon />, path: '/settings' },
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

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleNavItemClick = (path: string) => {
    navigate(path)
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: 'inherit' }}>
          {title}
        </Typography>
        {isMobile && (
          <IconButton onClick={handleDrawerToggle} sx={{ color: 'inherit' }}>
            <ChevronRightIcon />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

      {/* Navigation Items */}
      <List sx={{ flex: 1, py: 2 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              onClick={() => handleNavItemClick(item.path)}
              selected={location.pathname === item.path}
              sx={{
                mx: 1,
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.08)',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontWeight: location.pathname === item.path ? 600 : 400,
                  }
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Footer */}
      <Box sx={{ p: 2, mt: 'auto' }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', mb: 2 }} />
        <Typography variant="caption" sx={{ opacity: 0.7, textAlign: 'center', display: 'block' }}>
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
              borderLeft: '1px solid rgba(255,255,255,0.12)',
              backgroundColor: 'background.default',
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
