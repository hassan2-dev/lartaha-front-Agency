import axios from 'axios'
import { API_ENV, TOKEN_STORAGE_KEY } from '../config/api'

export const api = axios.create({
  baseURL: API_ENV.apiBaseUrl,
  withCredentials: API_ENV.apiWithCredentials,
})

// Request interceptor to add auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers = config.headers ?? {}
    ;(config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  return config
})

/** 401 here means wrong password / forbidden action — not an expired session. */
function shouldSkipSessionLogoutOn401(error: unknown): boolean {
  const config = (error as { config?: { url?: string; method?: string } })?.config
  const url = String(config?.url || '')
  const method = String(config?.method || '').toLowerCase()
  if (url.includes('/api/auth/verify-password')) return true
  if (method === 'delete' && url.includes('/api/folders')) return true
  if (method === 'delete' && url.includes('/api/workspace/members/')) return true
  return false
}

// Response interceptor to handle 401 errors (expired/invalid session token)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && !shouldSkipSessionLogoutOn401(error)) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      window.dispatchEvent(new CustomEvent('auth:logout'))
    }
    return Promise.reject(error)
  }
)
