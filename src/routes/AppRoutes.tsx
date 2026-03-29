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

      {/* Redirect old signup route to maintain compatibility */}
      <Route path="/signup" element={<Navigate to="/register" replace />} />

      {/* Authenticated Routes */}
      <Route
        path="/app/*"
        element={
          <ProtectedRoute>
            <SideNav>
              <Routes>
                <Route path="dashboard" element={<HomePage />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="teams" element={<AdminRoute><TeamsPage /></AdminRoute>} />
                <Route path="activity" element={<ActivityPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />

                {/* Default redirect for /app */}
                <Route path="" element={<Navigate to="/app/dashboard" replace />} />
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
