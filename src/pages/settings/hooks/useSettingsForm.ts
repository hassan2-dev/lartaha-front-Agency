import { useState, useCallback } from 'react'
import { useTheme } from '@mui/material/styles'

export interface PersonalSettings {
  darkMode: boolean
  autoUpload: boolean
  language: string
  maxFileSize: string
}

export interface UseSettingsFormReturn {
  // Personal settings
  darkMode: boolean
  setDarkMode: (value: boolean) => void
  autoUpload: boolean
  setAutoUpload: (value: boolean) => void
  language: string
  setLanguage: (value: string) => void
  maxFileSize: string
  setMaxFileSize: (value: string) => void

  // UI state
  successMessage: string
  setSuccessMessage: (message: string) => void
  showSuccess: (message: string, duration?: number) => void

  // Actions
  resetForm: () => void
  getSettings: () => PersonalSettings
}

const DEFAULT_SETTINGS: PersonalSettings = {
  darkMode: false,
  autoUpload: true,
  language: 'ar',
  maxFileSize: '100',
}

export const useSettingsForm = (): UseSettingsFormReturn => {
  const theme = useTheme()

  // Initialize from theme and defaults
  const [darkMode, setDarkMode] = useState(theme.palette.mode === 'dark')
  const [autoUpload, setAutoUpload] = useState(DEFAULT_SETTINGS.autoUpload)
  const [language, setLanguage] = useState(DEFAULT_SETTINGS.language)
  const [maxFileSize, setMaxFileSize] = useState(DEFAULT_SETTINGS.maxFileSize)
  const [successMessage, setSuccessMessage] = useState('')

  // Sync dark mode with theme changes

  const showSuccess = useCallback((message: string, duration = 3000) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(''), duration)
  }, [])

  const resetForm = useCallback(() => {
    setDarkMode(theme.palette.mode === 'dark')
    setAutoUpload(DEFAULT_SETTINGS.autoUpload)
    setLanguage(DEFAULT_SETTINGS.language)
    setMaxFileSize(DEFAULT_SETTINGS.maxFileSize)
    setSuccessMessage('')
  }, [theme.palette.mode])

  const getSettings = useCallback(
    (): PersonalSettings => ({
      darkMode,
      autoUpload,
      language,
      maxFileSize,
    }),
    [darkMode, autoUpload, language, maxFileSize]
  )

  return {
    darkMode,
    setDarkMode,
    autoUpload,
    setAutoUpload,
    language,
    setLanguage,
    maxFileSize,
    setMaxFileSize,
    successMessage,
    setSuccessMessage,
    showSuccess,
    resetForm,
    getSettings,
  }
}
