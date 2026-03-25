/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'
import { createTheme, ThemeProvider, type PaletteMode } from '@mui/material'

type ThemeContextValue = {
  mode: PaletteMode
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'larthaa_theme_mode'

function getInitialMode(): PaletteMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // ignore
  }
  // Default to dark theme (matches the “upload dashboard” vibe).
  return 'dark'
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(getInitialMode())

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      toggle: () => {
        setMode((prev) => {
          const next = prev === 'dark' ? 'light' : 'dark'
          try {
            localStorage.setItem(STORAGE_KEY, next)
          } catch {
            // ignore
          }
          return next
        })
      },
    }),
    [mode]
  )

  const theme = useMemo(
    () =>
      createTheme({
        direction: 'rtl',
        palette: {
          mode,
          primary: { main: mode === 'dark' ? '#a78bfa' : '#6d28d9' },
          background: {
            default: mode === 'dark' ? '#0b0b12' : '#f8fafc',
            paper: mode === 'dark' ? '#12121a' : '#ffffff',
          },
          text: {
            primary: mode === 'dark' ? '#eaeaf2' : '#0f172a',
          },
        },
        typography: {
          fontFamily: `"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`,
          fontWeightMedium: 600,
        },
        shape: { borderRadius: 16 },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                border: mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(2,6,23,0.08)',
              },
            },
          },
        },
      }),
    [mode]
  )

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  )
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeMode must be used inside AppThemeProvider')
  return ctx
}

