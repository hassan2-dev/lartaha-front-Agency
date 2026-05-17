import { api } from './http'
import { API_ENV } from '../config/api'
import { resolveWorkspaceLogoUrl } from './workspaceApi'

const PROFILE_MEDIA_CACHE_KEY = 'larthaa_profile_media_v1'

type StoredProfileMedia = {
  userId: string
  avatar?: string
  workspaceLogo?: string
}

function readProfileMediaCache(userId: string): StoredProfileMedia | null {
  if (typeof window === 'undefined' || !userId) return null
  try {
    const raw = localStorage.getItem(PROFILE_MEDIA_CACHE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as StoredProfileMedia
    if (!o || o.userId !== userId) return null
    return o
  } catch {
    return null
  }
}

type ProfileMediaSnapshot = { avatar?: string; workspaceLogo?: string }

/** Merge into localStorage so avatar / workspace logo survive refresh when /me omits them. */
export function saveProfileMediaCache(userId: string, snapshot: Partial<ProfileMediaSnapshot>) {
  if (typeof window === 'undefined' || !userId) return
  try {
    const prev = readProfileMediaCache(userId)
    const next: StoredProfileMedia = { userId }
    next.avatar =
      'avatar' in snapshot ? snapshot.avatar?.trim() || undefined : prev?.avatar?.trim() || undefined
    next.workspaceLogo =
      'workspaceLogo' in snapshot
        ? snapshot.workspaceLogo?.trim() || undefined
        : prev?.workspaceLogo?.trim() || undefined
    if (!next.avatar && !next.workspaceLogo) {
      localStorage.removeItem(PROFILE_MEDIA_CACHE_KEY)
      return
    }
    localStorage.setItem(PROFILE_MEDIA_CACHE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

export function clearProfileMediaCache() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(PROFILE_MEDIA_CACHE_KEY)
  } catch {
    // ignore
  }
}

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

function applyProfileMediaCacheFromStorage<T extends { id: string; avatar?: string; workspaceLogo?: string }>(
  user: T
): T {
  const hit = readProfileMediaCache(user.id)
  if (!hit) return user
  const next = { ...user }
  if (!next.avatar?.trim() && hit.avatar?.trim()) {
    next.avatar = normalizeMediaUrlForDisplay(hit.avatar) ?? hit.avatar
  }
  if (!next.workspaceLogo?.trim() && hit.workspaceLogo?.trim()) {
    next.workspaceLogo = normalizeMediaUrlForDisplay(hit.workspaceLogo) ?? hit.workspaceLogo
  }
  return next
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

export type AccountIdentity = {
  email?: string
  username?: string
}

/**
 * Confirms the logged-in admin's account password (not file encryption password).
 * Backend: POST /api/auth/verify-password with Bearer token.
 */
export async function verifyCurrentUserPassword(
  password: string,
  _identity?: AccountIdentity
): Promise<void> {
  const trimmed = password.trim()
  if (!trimmed) throw new Error('أدخل كلمة مرور المدير')

  try {
    await api.post('/api/auth/verify-password', { password: trimmed })
    return
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
    const status = axiosErr.response?.status
    const message = axiosErr.response?.data?.message

    if (status === 404) {
      throw new Error('التحقق من كلمة المرور غير متوفر على الخادم — حدّث الباك إند')
    }
    if (status === 401 || status === 403) {
      throw new Error(message || 'كلمة مرور المدير غير صحيحة')
    }
    throw new Error(message || 'تعذر التحقق من كلمة المرور')
  }
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
  const workspaceRow =
    row.workspace && typeof row.workspace === 'object'
      ? (row.workspace as Record<string, unknown>)
      : null
  const logoFromNestedWorkspace = workspaceRow
    ? pickStringField(workspaceRow, ['logo', 'workspaceLogo', 'logoUrl', 'imageUrl'])
    : undefined
  const logoRaw =
    logoFromNestedWorkspace ??
    pickStringField(row, [
      'workspaceLogo',
      'workspace_logo',
      'logoUrl',
      'workspaceImage',
      'companyLogo',
      'logo',
    ])
  const avatarAbs = avatarRaw ? resolveAbsoluteMediaUrl(avatarRaw) : undefined
  const logoAbs = logoRaw ? resolveAbsoluteMediaUrl(logoRaw) : undefined
  const avatarNorm = normalizeMediaUrlForDisplay(avatarAbs) ?? avatarAbs
  const logoNorm = normalizeMediaUrlForDisplay(logoAbs) ?? logoAbs
  let user = {
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

  if (user.workspaceId && (!user.workspaceLogo || String(user.workspaceLogo).trim() === '')) {
    try {
      const raw = await resolveWorkspaceLogoUrl(user.workspaceId)
      if (raw) {
        const abs = resolveAbsoluteMediaUrl(raw)
        user.workspaceLogo = normalizeMediaUrlForDisplay(abs) ?? abs
      }
    } catch (e) {
      console.warn('[fetchMe] could not load workspace for logo:', e)
    }
  }

  user = applyProfileMediaCacheFromStorage(user)

  saveProfileMediaCache(user.id, {
    ...(user.avatar?.trim() ? { avatar: user.avatar } : {}),
    ...(user.workspaceLogo?.trim() ? { workspaceLogo: user.workspaceLogo } : {}),
  })

  console.log('📋 Extracted user data:', user)
  return user
}
