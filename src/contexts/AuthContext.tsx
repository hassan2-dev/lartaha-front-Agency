/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { TOKEN_STORAGE_KEY } from '../config/api'
import { fetchMe, loginUser, type LoginPayload, type LoginResult } from '../api/authApi'

export type User = {
  id: string
  email: string
  username: string
  name: string
  avatar?: string
  position?: string
  phone?: string
  isAdmin: boolean
  workspaceId?: string
  workspaceName?: string
  workspaceLogo?: string
}

type AuthContextValue = {
  token: string | null
  user: User | null
  loading: boolean
  error: string | null
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
  updateUser: (userData: Partial<{ name: string; avatar?: string }>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function extractToken(data: LoginResult): string | null {
  return data.token ?? data.accessToken ?? data.data?.token ?? data.data?.accessToken ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY)
    } catch {
      return null
    }
  })
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true) // Start with true for initial auth check
  const [error, setError] = useState<string | null>(null)

  // Handle auth logout events from axios interceptor
  useEffect(() => {
    const handleAuthLogout = () => {
      setToken(null)
      setUser(null)
      setError(null)
      // Let ProtectedRoute handle navigation
    }

    window.addEventListener('auth:logout', handleAuthLogout)
    return () => window.removeEventListener('auth:logout', handleAuthLogout)
  }, [])

  async function refreshMe() {
    if (!token) {
      setLoading(false)
      return
    }
    try {
      console.log('🔄 Calling fetchMe with token:', token?.substring(0, 20) + '...')
      const me = await fetchMe()
      console.log('📥 fetchMe response:', me)
      setUser(me)
      if (me?.workspaceId) {
        try {
          sessionStorage.setItem('file_encryption_password', me.workspaceId)
        } catch {
          // ignore storage errors
        }
      }
      console.log('✅ User state set:', me)
    } catch (error) {
      console.error('❌ fetchMe error:', error)
      // If /me fails (expired token, etc) we'll just keep user as null.
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshMe()
  }, [token])

  // Navigate to login when token is cleared (only if not already on login page)
  useEffect(() => {
    // Remove this - let ProtectedRoute handle navigation
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      error,
      login: async payload => {
        setLoading(true)
        setError(null)
        try {
          const data = await loginUser(payload)
          const nextToken = extractToken(data)
          if (!nextToken) {
            throw new Error('Login succeeded but token was missing.')
          }
          localStorage.setItem(TOKEN_STORAGE_KEY, nextToken)
          setToken(nextToken)
          // If your backend returns user info, you can expose it here later.
          setUser(data.user ?? data.data?.user ?? null)
        } catch (e: unknown) {
          const msg = (e as { message?: string })?.message
          setError(msg ?? 'Login failed.')
          setToken(null)
          setUser(null)
          try {
            localStorage.removeItem(TOKEN_STORAGE_KEY)
          } catch {
            // ignore
          }
        } finally {
          setLoading(false)
        }
      },
      logout: () => {
        setToken(null)
        setUser(null)
        setError(null)
        try {
          localStorage.removeItem(TOKEN_STORAGE_KEY)
        } catch {
          // ignore
        }
      },
      refreshMe,
      updateUser: userData => {
        if (user) {
          setUser({ ...user, ...userData })
        }
      },
    }),
    [error, loading, refreshMe, token, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
