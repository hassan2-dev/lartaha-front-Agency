/**
 * Hook for decrypting and previewing files
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { decryptFile, decryptFileChunked } from '../lib/encryption'
import { API_ENV, TOKEN_STORAGE_KEY } from '../config/api'

// Cache for client-only encryption key in sessionStorage
const CLIENT_KEY_CACHE = 'file_encryption_password'

function getCachedClientKey(): string | null {
  try {
    return sessionStorage.getItem(CLIENT_KEY_CACHE)
  } catch {
    return null
  }
}

export interface UseFileDecryptionOptions {
  encryptionEnabled?: boolean
  encryptionIv?: string
  encryptionSalt?: string
}

export interface UseFileDecryptionReturn {
  decryptedUrl: string | null
  isLoading: boolean
  isDecrypting: boolean
  progress: number
  error: string | null
  decrypt: () => Promise<void>
  downloadBlob: () => Promise<void>
}

export function useFileDecryption(
  fileId: string | null,
  options: UseFileDecryptionOptions
): UseFileDecryptionReturn {
  const { encryptionEnabled, encryptionIv, encryptionSalt } = options
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const abortRef = useRef(false)

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (decryptedUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(decryptedUrl)
      }
    }
  }, [decryptedUrl])

  const decrypt = useCallback(async () => {
    if (!fileId || !encryptionEnabled || !encryptionIv || !encryptionSalt) {
      setError('Missing encryption parameters')
      return
    }

    abortRef.current = false
    setIsLoading(true)
    setError(null)
    setDecryptedUrl(null)

    try {
      // Get client-only key (use cache if available)
      const key = getCachedClientKey()
      if (!key) {
        throw new Error('Missing encryption key')
      }

      if (abortRef.current) return

      // Get auth token
      const token = localStorage.getItem(TOKEN_STORAGE_KEY)
      const apiBase = API_ENV.apiBaseUrl || 'http://localhost:3030'
      
      // Fetch encrypted data
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      setIsLoading(false)
      setIsDecrypting(true)

      const response = await fetch(`${apiBase}/api/upload/download/${fileId}/data`, { headers })
      if (!response.ok) {
        throw new Error('Failed to fetch encrypted file')
      }

      if (abortRef.current) return

      const encryptedData = await response.arrayBuffer()

      if (abortRef.current) return

      // Decrypt
      const decrypted = encryptedData.byteLength > 12 * 1024 * 1024
        ? await decryptFileChunked(
            { encryptedChunks: splitIntoChunks(encryptedData), iv: encryptionIv, salt: encryptionSalt, password: key },
            (p) => { if (!abortRef.current) setProgress(p) }
          )
        : await decryptFile(encryptedData, encryptionIv, encryptionSalt, key)

      if (abortRef.current) return

      const url = URL.createObjectURL(decrypted)
      setDecryptedUrl(url)
      setIsDecrypting(false)
      setProgress(100)
    } catch (err) {
      if (!abortRef.current) {
        setError(err instanceof Error ? err.message : 'Decryption failed')
        setIsDecrypting(false)
      }
    }
  }, [fileId, encryptionEnabled, encryptionIv, encryptionSalt])

  const downloadBlob = useCallback(async () => {
    if (!decryptedUrl) return
    const a = document.createElement('a')
    a.href = decryptedUrl
    a.download = 'file'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [decryptedUrl])

  return {
    decryptedUrl,
    isLoading,
    isDecrypting,
    progress,
    error,
    decrypt,
    downloadBlob,
  }
}

function splitIntoChunks(buffer: ArrayBuffer, chunkSize: number = 5 * 1024 * 1024): ArrayBuffer[] {
  const chunks: ArrayBuffer[] = []
  const view = new Uint8Array(buffer)
  let offset = 0
  while (offset < view.length) {
    const end = Math.min(offset + chunkSize, view.length)
    chunks.push(view.slice(offset, end).buffer)
    offset = end
  }
  return chunks
}

// Utility function to decrypt a file and get blob URL (for one-time use)
export async function decryptFileToBlobUrl(
  fileId: string,
  encryptionEnabled: boolean,
  encryptionIv?: string,
  encryptionSalt?: string
): Promise<string> {
  if (!encryptionEnabled || !encryptionIv || !encryptionSalt) {
    throw new Error('File is not encrypted')
  }

  // Get client-only key
  const key = getCachedClientKey()
  if (!key) {
    throw new Error('Missing encryption key')
  }

  // Get auth token
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  const apiBase = API_ENV.apiBaseUrl || 'http://localhost:3030'
  
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Fetch encrypted data
  const response = await fetch(`${apiBase}/api/upload/download/${fileId}/data`, { headers })
  if (!response.ok) {
    throw new Error('Failed to fetch encrypted file')
  }

  const encryptedData = await response.arrayBuffer()

  // Decrypt
  const decrypted = encryptedData.byteLength > 12 * 1024 * 1024
    ? await decryptFileChunked(
        { encryptedChunks: splitIntoChunks(encryptedData), iv: encryptionIv, salt: encryptionSalt, password: key },
        () => {}
      )
    : await decryptFile(encryptedData, encryptionIv, encryptionSalt, key)

  return URL.createObjectURL(decrypted)
}
