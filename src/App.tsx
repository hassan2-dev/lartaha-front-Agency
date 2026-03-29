import { Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import UploadPage from './pages/UploadPage'
import TasksPage from './pages/TasksPage'
import TeamsPage from './pages/TeamsPage'
import ChatPage from './pages/ChatPage'
import ActivityPage from './pages/ActivityPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'
import SideNav from './components/SideNav'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/invite" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <SideNav>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </SideNav>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
