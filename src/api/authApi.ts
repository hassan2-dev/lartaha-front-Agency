import { api } from './http'
import { API_ENV } from '../config/api'

function resolveAbsoluteMediaUrl(raw: string): string {
  const t = raw.trim()
  if (/^https?:\/\//i.test(t)) return t
  if (t.startsWith('//')) return `https:${t}`
  if (t.startsWith('/')) {
    const base = (API_ENV.apiBaseUrl || '').replace(/\/$/, '') || ''
    if (base) return `${base}${t}`
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${t}`
    }
  }
  return t
}

/** Encode path segments so spaces/commas in R2 object keys work in <img> / MUI Avatar src. */
export function normalizeMediaUrlForDisplay(raw: string | undefined | null): string | undefined {
  if (raw == null || typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const qIdx = trimmed.indexOf('?')
  const beforeQuery = qIdx >= 0 ? trimmed.slice(0, qIdx) : trimmed
  const query = qIdx >= 0 ? trimmed.slice(qIdx) : ''
  const m = beforeQuery.match(/^(https?:\/\/[^/]+)(\/.*)?$/i)
  if (!m) {
    try {
      return encodeURI(decodeURI(trimmed))
    } catch {
      return trimmed.replace(/ /g, '%20')
    }
  }
  const [, origin, pathRest] = m
  const path = pathRest || ''
  const encodedPath = path
    .split('/')
    .map(segment => {
      if (!segment) return ''
      try {
        return encodeURIComponent(decodeURIComponent(segment))
      } catch {
        return encodeURIComponent(segment)
      }
    })
    .join('/')
  return `${origin}${encodedPath}${query}`
}

/** @deprecated use normalizeMediaUrlForDisplay */
export const normalizeAvatarUrlForDisplay = normalizeMediaUrlForDisplay

function pickStringField(
  row: Record<string, unknown>,
  keys: readonly string[]
): string | undefined {
  for (const k of keys) {
    const v = row[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

function unwrapMePayload(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (b.user && typeof b.user === 'object') return b.user as Record<string, unknown>
  const nested = b.data
  if (nested && typeof nested === 'object') {
    const d = nested as Record<string, unknown>
    if (d.user && typeof d.user === 'object') return d.user as Record<string, unknown>
    const d2 = d.data
    if (d2 && typeof d2 === 'object') {
      const inner = d2 as Record<string, unknown>
      if (inner.user && typeof inner.user === 'object') return inner.user as Record<string, unknown>
      if (typeof inner.id === 'string' && typeof inner.email === 'string') return inner
    }
    if (typeof d.id === 'string' && typeof d.email === 'string') return d
  }
  if (typeof b.id === 'string' && typeof b.email === 'string') return b
  return null
}

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

export async function confirmPasswordReset(
  token: string,
  newPassword: string
): Promise<{ message: string }> {
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
  const row = unwrapMePayload(res.data)
  if (!row) {
    console.error('fetchMe: unexpected /me payload shape', res.data)
    throw new Error('Invalid /me response')
  }
  const avatarRaw = pickStringField(row, [
    'avatar',
    'avatarUrl',
    'profileImage',
    'profilePicture',
    'imageUrl',
    'picture',
    'image',
  ])
  const logoRaw = pickStringField(row, [
    'workspaceLogo',
    'workspace_logo',
    'logoUrl',
    'workspaceImage',
    'companyLogo',
  ])
  const avatarAbs = avatarRaw ? resolveAbsoluteMediaUrl(avatarRaw) : undefined
  const logoAbs = logoRaw ? resolveAbsoluteMediaUrl(logoRaw) : undefined
  const avatarNorm = normalizeMediaUrlForDisplay(avatarAbs) ?? avatarAbs
  const logoNorm = normalizeMediaUrlForDisplay(logoAbs) ?? logoAbs
  const user = {
    ...row,
    avatar: avatarNorm,
    workspaceLogo: logoNorm,
  } as {
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
  console.log('📋 Extracted user data:', user)
  return user
}
