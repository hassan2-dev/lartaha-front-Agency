import { Route, Routes, Navigate } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import SignUpPage from '../pages/SignUpPage'
import RegisterPage from '../pages/RegisterPage'
import HomePage from '../pages/HomePage'
import UploadPage from '../pages/UploadPage'
import TasksPage from '../pages/TasksPage'
import TeamsPage from '../pages/TeamsPage'
import ChatPage from '../pages/ChatPage'
import ActivityPage from '../pages/ActivityPage'
import SettingsPage from '../pages/SettingsPage'
import ProfilePage from '../pages/ProfilePage'
import NotFoundPage from '../pages/NotFoundPage'
import LandingPage from '../pages/LandingPage'
import SideNav from '../components/SideNav'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { AdminRoute } from '../components/AdminRoute'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/invite/:token?" element={<RegisterPage />} />

      {/* Authenticated Routes */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <SideNav>
              <Routes>
                <Route path="" element={<HomePage />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="teams" element={<AdminRoute><TeamsPage /></AdminRoute>} />
                <Route path="activity" element={<ActivityPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />

                {/* Backward-compatibility redirect for old nested path */}
                <Route path="dashboard" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </SideNav>
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
