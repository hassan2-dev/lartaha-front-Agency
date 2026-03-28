import axios from 'axios'
import { API_ENV, TOKEN_STORAGE_KEY } from '../config/api'

export const api = axios.create({
  baseURL: API_ENV.apiBaseUrl,
  withCredentials: API_ENV.apiWithCredentials,
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers = config.headers ?? {}
      ; (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      // Redirect to login page
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

