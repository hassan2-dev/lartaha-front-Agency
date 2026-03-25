export const API_ENV = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  authLoginPath: import.meta.env.VITE_AUTH_LOGIN_PATH ?? '/api/auth/login',
  authMePath: import.meta.env.VITE_AUTH_ME_PATH ?? '/api/auth/me',
  uploadPath: import.meta.env.VITE_UPLOAD_PATH ?? '/api/upload',
  apiWithCredentials: (import.meta.env.VITE_API_WITH_CREDENTIALS ?? 'false') === 'true',
  r2PublicBaseUrl: import.meta.env.VITE_R2_PUBLIC_BASE_URL ?? '',
};

export const TOKEN_STORAGE_KEY = 'larthaa_auth_token';

