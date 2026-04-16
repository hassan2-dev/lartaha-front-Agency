/**
 * Encryption Key Storage Utilities
 * Handles client-side encryption key persistence
 */

const CLIENT_KEY_STORAGE = 'file_encryption_password'

/**
 * Get the client encryption key from session storage
 */
export function getClientEncryptionKey(): string | null {
  try {
    return sessionStorage.getItem(CLIENT_KEY_STORAGE)
  } catch {
    return null
  }
}

/**
 * Set the client encryption key in session storage
 */
export function setClientEncryptionKey(key: string): void {
  try {
    sessionStorage.setItem(CLIENT_KEY_STORAGE, key)
  } catch {
    // ignore storage errors
  }
}

/**
 * Clear the client encryption key from session storage
 */
export function clearClientEncryptionKey(): void {
  try {
    sessionStorage.removeItem(CLIENT_KEY_STORAGE)
  } catch {
    // ignore storage errors
  }
}
