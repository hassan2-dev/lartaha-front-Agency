import { api } from './http'
import { API_ENV } from '../config/api'

export type LoginPayload = {
  username: string
  password: string
}

export type LoginResult = {
  token?: string
  accessToken?: string
  user?: unknown
  data?: {
    token?: string
    accessToken?: string
    user?: unknown
  }
}

export async function loginUser(payload: LoginPayload): Promise<LoginResult> {
  const res = await api.post(API_ENV.authLoginPath, payload)
  return res.data as LoginResult
}

export async function fetchMe(): Promise<unknown> {
  const res = await api.get(API_ENV.authMePath)
  return res.data
}

