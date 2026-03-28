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
    }
  }
}

export async function loginUser(payload: LoginPayload): Promise<LoginResult> {
  const res = await api.post(API_ENV.authLoginPath, payload)
  return res.data as LoginResult
}

export async function fetchMe(): Promise<{
  id: string
  email: string
  username: string
  name: string
  isAdmin: boolean
  workspaceId?: string
}> {
  const res = await api.get(API_ENV.authMePath)
  return res.data
}

