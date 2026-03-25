import axios from 'axios'
import { API_ENV, TOKEN_STORAGE_KEY } from '../config/api'

export const api = axios.create({
  baseURL: API_ENV.apiBaseUrl,
  withCredentials: API_ENV.apiWithCredentials,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers = config.headers ?? {}
    ;(config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  return config
})

