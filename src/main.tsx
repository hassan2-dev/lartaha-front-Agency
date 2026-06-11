import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppThemeProvider } from './contexts/ThemeContext'
import { UploadProvider } from './contexts/UploadContext'
import { DownloadProvider } from './contexts/DownloadContext'
import { ExplorerCacheProvider } from './contexts/ExplorerCacheContext'
import { CssBaseline } from '@mui/material'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <ExplorerCacheProvider>
          <UploadProvider>
            <DownloadProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </DownloadProvider>
          </UploadProvider>
        </ExplorerCacheProvider>
      </AuthProvider>
    </AppThemeProvider>
  </StrictMode>
)

// Register Service Worker for PWA Push Notifications
if ('serviceWorker' in navigator) {
  console.log('🔔 [main.tsx] Service Worker API available, registering on load...')
  window.addEventListener('load', () => {
    console.log('🔔 [main.tsx] Page loaded, attempting to register service worker...')
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('🔔 [main.tsx] SW registered successfully: ', registration)
        console.log('🔔 [main.tsx] SW scope: ', registration.scope)
        console.log('🔔 [main.tsx] SW active state: ', registration.active?.state)
      })
      .catch(registrationError => {
        console.error('🔔 [main.tsx] SW registration failed: ', registrationError)
      })
  })
} else {
  console.error('🔔 [main.tsx] Service Worker API not available in this browser')
}
