function normalizeApiBaseUrl(input: string | undefined) {
  const safeInput = (input ?? '').trim()
  // Users sometimes set VITE_API_BASE_URL to include `/api` (e.g. `https://host/api`).
  // Our endpoints already start with `/api/...`, so we strip a trailing `/api`.
  if (!safeInput) return ''

  const withoutTrailingSlash = safeInput.endsWith('/') ? safeInput.slice(0, -1) : safeInput
  return withoutTrailingSlash.replace(/\/api\/?$/i, '')
}

// const rawApiBaseUrl = "https://majlis.larthaa.com"
const rawApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || "https://majlis.larthaa.com")
// const isProd = import.meta.env.PROD

export const API_ENV = {
  // If Vercel env var is empty string, we keep `apiBaseUrl=''` so axios calls same-origin `/api/...`
  // and Vercel rewrites can forward to the backend.
  // In production, always call same-origin (`/api/...`) to guarantee rewrites apply.
  apiBaseUrl: rawApiBaseUrl,
  authLoginPath: import.meta.env.VITE_AUTH_LOGIN_PATH ?? '/api/auth/login',
  authMePath: import.meta.env.VITE_AUTH_ME_PATH ?? '/api/auth/me',
  authForgotPasswordPath: import.meta.env.VITE_AUTH_FORGOT_PASSWORD_PATH ?? '/api/auth/forgot-password',
  authResetPasswordPath: import.meta.env.VITE_AUTH_RESET_PASSWORD_PATH ?? '/api/auth/reset-password',
  uploadPath: import.meta.env.VITE_UPLOAD_PATH ?? '/api/upload',
  apiWithCredentials: (import.meta.env.VITE_API_WITH_CREDENTIALS ?? 'false') === 'true',
  r2PublicBaseUrl: import.meta.env.VITE_R2_PUBLIC_BASE_URL ?? '',
};

export const TOKEN_STORAGE_KEY = 'larthaa_auth_token';

