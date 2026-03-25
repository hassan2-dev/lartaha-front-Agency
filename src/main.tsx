import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppThemeProvider } from './contexts/ThemeContext'
import { CssBaseline } from '@mui/material'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </AppThemeProvider>
  </StrictMode>,
)
