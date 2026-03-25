import { Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import UploadPage from './pages/UploadPage'
import TasksPage from './pages/TasksPage'
import NotFoundPage from './pages/NotFoundPage'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <UploadPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <TasksPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
