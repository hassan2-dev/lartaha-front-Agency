import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function useAppNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const goToLogin = () => navigate('/login')
  const goToRegister = () => navigate('/register')
  const goToDashboard = () => navigate('/dashboard')
  const goToTasks = () => navigate('/dashboard/tasks')
  const goToUpload = () => navigate('/dashboard/upload')
  const goToChat = () => navigate('/dashboard/chat')
  const goToTeams = () => user?.isAdmin ? navigate('/dashboard/teams') : goToDashboard()
  const goToActivity = () => navigate('/dashboard/activity')
  const goToSettings = () => navigate('/dashboard/settings')
  const goToProfile = () => navigate('/dashboard/profile')
  const goHome = () => navigate('/')

  const isActiveRoute = (path: string) => {
    return location.pathname === path
  }

  const isAppRoute = () => {
    return location.pathname.startsWith('/dashboard')
  }

  return {
    // Navigation methods
    goToLogin,
    goToRegister,
    goToDashboard,
    goHome,
    goToTasks,
    goToUpload,
    goToChat,
    goToTeams,
    goToActivity,
    goToSettings,
    goToProfile,

    // Route helpers
    isActiveRoute,
    isAppRoute,
    currentPath: location.pathname,
  }
}
