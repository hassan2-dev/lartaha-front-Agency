/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { TOKEN_STORAGE_KEY } from '../config/api'
import { fetchMe, loginUser, type LoginPayload, type LoginResult } from '../api/authApi'

type AuthContextValue = {
  token: string | null
  user: {
    id: string
    email: string
    username: string
    name: string
    isAdmin: boolean
    workspaceId?: string
  } | null
  loading: boolean
  error: string | null
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
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
  const [user, setUser] = useState<{
    id: string
    email: string
    username: string
    name: string
    isAdmin: boolean
    workspaceId?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refreshMe() {
    if (!token) return
    try {
      const me = await fetchMe()
      setUser(me)
    } catch {
      // If /me fails (expired token, etc) we'll just keep user as null.
      setUser(null)
    }
  }

  useEffect(() => {
    void refreshMe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      error,
      login: async (payload) => {
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

