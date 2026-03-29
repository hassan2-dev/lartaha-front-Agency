import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function useAppNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const goToLogin = () => navigate('/login')
  const goToRegister = () => navigate('/register')
  const goToDashboard = () => navigate('/app/dashboard')
  const goToTasks = () => navigate('/app/tasks')
  const goToUpload = () => navigate('/app/upload')
  const goToChat = () => navigate('/app/chat')
  const goToTeams = () => user?.isAdmin ? navigate('/app/teams') : goToDashboard()
  const goToActivity = () => navigate('/app/activity')
  const goToSettings = () => navigate('/app/settings')
  const goToProfile = () => navigate('/app/profile')
  const goHome = () => navigate('/')

  const isActiveRoute = (path: string) => {
    return location.pathname === path
  }

  const isAppRoute = () => {
    return location.pathname.startsWith('/app/')
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
