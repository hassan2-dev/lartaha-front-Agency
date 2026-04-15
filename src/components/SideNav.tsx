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
  AppBar,
  Toolbar,
  Paper,
  LinearProgress,
} from '@mui/material'
import {
  Home,
  CloudUpload,
  ClipboardText,
  ChatRound,
  User,
  ClockCircle,
  Settings,
  Logout,
  Sun,
  Moon,
} from '@solar-icons/react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useThemeMode } from '../contexts/ThemeContext'
import { useUpload } from '../contexts/UploadContext'
import { useDownload } from '../contexts/DownloadContext'
import BottomNav from './BottomNav'

const drawerWidth = 280

interface NavItem {
  text: string
  icon: React.ReactNode
  path: string
}

const navItems: NavItem[] = [
  { text: 'الرئيسية', icon: <Home size={24} />, path: '/dashboard' },
  { text: 'الملفات', icon: <CloudUpload size={24} />, path: '/dashboard/upload' },
  { text: 'المهام', icon: <ClipboardText size={24} />, path: '/dashboard/tasks' },
  { text: 'الدردشة', icon: <ChatRound size={24} />, path: '/dashboard/chat' },
  { text: 'الفرق', icon: <User size={24} />, path: '/dashboard/teams' },
  { text: 'الأنشطة', icon: <ClockCircle size={24} />, path: '/dashboard/activity' },
  { text: 'الإعدادات', icon: <Settings size={24} />, path: '/dashboard/settings' },
]

function getPageTitle(pathname: string): string {
  const item = navItems.find(item =>
    item.path === pathname ||
    (item.path === '/dashboard' && pathname === '/dashboard/')
  )
  return item?.text || 'لوحة التحكم'
}

interface SideNavProps {
  children: React.ReactNode
  title?: string
}

export default function SideNav({ children, title = 'Larthaa Agency' }: SideNavProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()
  const { mode, toggle } = useThemeMode()

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
              : 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            boxShadow: user?.workspaceLogo
              ? '0 2px 8px rgba(0,0,0,0.06)'
              : '0 4px 12px rgba(79, 70, 229, 0.15)',
            color: '#fff',
            fontWeight: 900,
            fontSize: '1.5rem',
            overflow: 'hidden',
            border: user?.workspaceLogo ? '2px solid' : 'none',
            borderColor: 'primary.main',
          }}
        >
          <Box
            component="img"
            src={user?.workspaceLogo || '/logo-white.svg'}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 900,
            letterSpacing: '-0.5px',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #fff 0%, #818cf8 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #4f46e5 100%)',
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
                  }}
                  selected={isActive}
                  sx={{
                    borderRadius: 2,
                    py: 1.2,
                    px: 2,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,

                    '&.Mui-selected': {
                      background: 'linear-gradient(90deg, #818cf8 0%, #4f46e5 100%)',
                      color: '#fff',
                      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
                      '&:hover': {
                        background: 'linear-gradient(90deg, #a5b4fc 0%, #6366f1 100%)',
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
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
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
                <Logout size={20} />
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
      {/* Desktop Drawer - Hidden on mobile */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
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
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          overflow: 'auto',
          backgroundColor: 'background.default',
          paddingBottom: { xs: '80px', md: 0 }, // Add padding for larger bottom nav on mobile
        }}
      >
        {/* Top Navigation Bar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            backgroundColor: theme.palette.background.paper,
            borderBottom: '1px solid rgba(25, 118, 210, 0.12)',
            color: 'inherit',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {getPageTitle(location.pathname)}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={toggle}
                color="inherit"
                aria-label="تبديل الثيم"
              >
                {mode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </IconButton>
              <IconButton
                onClick={() => {
                  logout()
                  navigate('/login', { replace: true })
                }}
                color="inherit"
                aria-label="تسجيل الخروج"
              >
                <Logout size={20} />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {children}
      </Box>

      {/* Bottom Navigation for Mobile */}
      <BottomNav />

      {/* Global Minimized Upload Toast - persists across page navigation */}
      <MinimizedUploadToast />
      {/* Global Minimized Download Toast - persists across page navigation */}
      <MinimizedDownloadToast />
    </Box>
  )
}

// Minimized download toast that persists across page navigation
function MinimizedDownloadToast() {
  const theme = useTheme()
  const { downloads, isMinimized, setIsMinimized, setShowDialog, clearCompleted, activeCount, completedCount, totalCount } = useDownload()
  const { uploadItems, showUploadModal, isMinimized: uploadMinimized } = useUpload()

  const shouldShow = totalCount > 0 && isMinimized
  if (!shouldShow) return null

  const avgProgress = totalCount === 0 ? 0 : Math.round(
    Array.from(downloads.values()).reduce((sum, d) => sum + d.progress, 0) / totalCount
  )
  const allDone = activeCount === 0 && completedCount > 0

  // Upload toast is visible when there are items AND (minimized OR modal not open)
  const uploadToastVisible = Object.keys(uploadItems).length > 0 && (uploadMinimized || !showUploadModal)
  // Shift right by upload toast width (320px) + gap (16px) when upload toast is showing
  const leftOffset = uploadToastVisible ? { xs: 24, md: 360 } : { xs: 24, md: 24 }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: { xs: 88, md: 24 },
        left: leftOffset,
        zIndex: 9999,
        borderRadius: 3,
        overflow: 'hidden',
        width: 300,
        background: (t) => `linear-gradient(145deg, ${t.palette.background.paper} 0%, ${t.palette.background.default} 100%)`,
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
        border: (t) => `1px solid ${t.palette.divider}`,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: allDone
            ? `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`
            : `linear-gradient(135deg, ${theme.palette.info.dark} 0%, ${theme.palette.info.main} 100%)`,
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Typography sx={{ color: 'white', fontSize: 18 }}>{allDone ? '✓' : '↓'}</Typography>
        <Typography variant="body2" sx={{ color: 'white', fontWeight: 600, flex: 1 }}>
          {allDone ? 'اكتملت التنزيلات!' : `جاري التنزيل (${activeCount} نشط)`}
        </Typography>
        <IconButton
          size="small"
          onClick={() => { setShowDialog(true); setIsMinimized(false) }}
          sx={{ color: 'white', opacity: 0.8, p: 0.5 }}
          title="عرض التفاصيل"
        >
          <Box sx={{ fontSize: 16, transform: 'rotate(90deg)' }}>↗</Box>
        </IconButton>
        <IconButton
          size="small"
          onClick={() => { clearCompleted(); setIsMinimized(false); setShowDialog(false) }}
          sx={{ color: 'white', opacity: 0.8, p: 0.5 }}
          title="إغلاق"
        >
          <Box sx={{ fontSize: 18 }}>×</Box>
        </IconButton>
      </Box>

      {/* Progress */}
      <Box sx={{ p: 2 }}>
        {!allDone && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>{completedCount} / {totalCount} ملفات</Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'info.main' }}>{avgProgress}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={avgProgress}
              sx={{ height: 6, borderRadius: 3, backgroundColor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', '& .MuiLinearProgress-bar': { borderRadius: 3, background: `linear-gradient(90deg, ${theme.palette.info.main} 0%, ${theme.palette.info.light} 100%)` } }}
            />
          </>
        )}
        {allDone && (
          <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600, textAlign: 'center', py: 0.5 }}>
            ✓ تم تنزيل {completedCount} ملفات بنجاح
          </Typography>
        )}
        <Box sx={{ mt: 1.5, maxHeight: 60, overflow: 'auto' }}>
          {Array.from(downloads.values()).slice(0, 3).map((d) => (
            <Typography key={d.key} variant="caption" sx={{ display: 'block', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.filename}{d.status === 'completed' ? ' ✓' : d.status === 'failed' || d.status === 'cancelled' ? ' ✗' : ''}
            </Typography>
          ))}
          {totalCount > 3 && <Typography variant="caption" sx={{ opacity: 0.5 }}>+{totalCount - 3} ملفات أخرى</Typography>}
        </Box>
      </Box>
    </Paper>
  )
}

// Minimized upload toast that persists across page navigation
function MinimizedUploadToast() {
  const theme = useTheme()
  const navigate = useNavigate()
  const {
    uploadItems,
    showUploadModal,
    isMinimized,
    setIsMinimized,
    showSuccess,
    setShowUploadModal,
    setShowSuccess,
    clearUploadItems,
    completedUploadsCount,
    totalUploadsCount,
    activeUploadsCount,
  } = useUpload()

  // Only show if there are upload items and modal was minimized
  const shouldShow = Object.keys(uploadItems).length > 0 && (isMinimized || !showUploadModal)

  if (!shouldShow) return null

  const avgProgress = totalUploadsCount === 0 ? 0 : Math.round(
    Object.values(uploadItems).reduce((sum, item) => sum + item.progress, 0) / totalUploadsCount
  )

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: { xs: 88, md: 24 }, // Account for mobile bottom nav
        left: 24,
        zIndex: 9999,
        borderRadius: 3,
        overflow: 'hidden',
        width: 320,
        background: (t) => `linear-gradient(145deg, ${t.palette.background.paper} 0%, ${t.palette.background.default} 100%)`,
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
        border: (t) => `1px solid ${t.palette.divider}`,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: showSuccess
            ? `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`
            : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        {showSuccess ? (
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: 'success.main', fontSize: 12, fontWeight: 700 }}>✓</Typography>
          </Box>
        ) : (
          <CloudUpload size={20} color="white" />
        )}
        <Typography variant="body2" sx={{ color: 'white', fontWeight: 600, flex: 1 }}>
          {showSuccess ? 'تم الرفع بنجاح!' : `جاري الرفع (${activeUploadsCount} نشط)`}
        </Typography>
        <IconButton
          size="small"
          onClick={() => {
            // Navigate to upload page and show full modal
            navigate('/dashboard/upload')
            setShowUploadModal(true)
            setIsMinimized(false)
          }}
          sx={{ color: 'white', opacity: 0.8, p: 0.5 }}
        >
          <Box sx={{ fontSize: 18, transform: 'rotate(90deg)' }}>↗</Box>
        </IconButton>
        <IconButton
          size="small"
          onClick={() => {
            clearUploadItems()
            setShowSuccess(false)
          }}
          sx={{ color: 'white', opacity: 0.8, p: 0.5 }}
        >
          <Box sx={{ fontSize: 18 }}>×</Box>
        </IconButton>
      </Box>

      {/* Progress Content */}
      <Box sx={{ p: 2 }}>
        {!showSuccess && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {completedUploadsCount} / {totalUploadsCount} ملفات
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {avgProgress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={avgProgress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                }
              }}
            />
          </>
        )}

        {showSuccess && (
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
              ✓ تم رفع {totalUploadsCount} ملفات بنجاح
            </Typography>
          </Box>
        )}

        {/* Quick file names */}
        <Box sx={{ mt: 1.5, maxHeight: 60, overflow: 'auto' }}>
          {Object.entries(uploadItems).slice(0, 3).map(([key, item]) => (
            <Typography
              key={key}
              variant="caption"
              sx={{
                display: 'block',
                opacity: 0.7,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.relativePath || key.split('_').slice(0, -1).join('_')}
              {item.status === 'completed' && ' ✓'}
              {item.status === 'error' && ' ✗'}
            </Typography>
          ))}
          {Object.values(uploadItems).length > 3 && (
            <Typography variant="caption" sx={{ opacity: 0.5 }}>
              +{Object.values(uploadItems).length - 3} ملفات أخرى
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  )
}
