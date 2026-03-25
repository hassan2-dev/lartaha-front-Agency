import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Box, CircularProgress } from '@mui/material'
import type { ReactNode } from 'react'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth()

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!token) return <Navigate to="/login" replace />
  return children
}

