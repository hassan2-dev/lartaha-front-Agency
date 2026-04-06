import { api } from './http'
import { API_ENV } from '../config/api'

export type LoginPayload = {
  username: string
  password: string
}

export type LoginResult = {
  token?: string
  accessToken?: string
  user?: {
    id: string
    email: string
    username: string
    name: string
    isAdmin: boolean
    workspaceId?: string
    workspaceName?: string
    workspaceLogo?: string
  }
  data?: {
    token?: string
    accessToken?: string
    user?: {
      id: string
      email: string
      username: string
      name: string
      isAdmin: boolean
      workspaceId?: string
      workspaceName?: string
      workspaceLogo?: string
    }
  }
}

export async function loginUser(payload: LoginPayload): Promise<LoginResult> {
  const res = await api.post(API_ENV.authLoginPath, payload)
  return res.data as LoginResult
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const res = await api.post(API_ENV.authForgotPasswordPath, { email })
  return res.data as { message: string }
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<{ message: string }> {
  const res = await api.post(API_ENV.authResetPasswordPath, { token, newPassword })
  return res.data as { message: string }
}

export async function fetchMe(): Promise<{
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
}> {
  console.log('🌐 Making GET request to:', API_ENV.authMePath)
  const res = await api.get(API_ENV.authMePath)
  console.log('📡 API response status:', res.status)
  console.log('📋 API response data:', res.data)
  console.log('📋 Extracted user data:', res.data.user)
  console.log('📋 API response headers:', res.headers)
  return res.data.user // Extract the actual user object from the nested structure
}

