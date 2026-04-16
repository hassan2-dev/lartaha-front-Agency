/**
 * ImageThumbnail Component
 * Displays image thumbnails with encryption support
 */

import { useState, useEffect } from 'react'
import { Box } from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import { API_ENV, TOKEN_STORAGE_KEY } from '../../../config/api'
import { decryptThumbnailBuffer } from '../../../lib/encryption'
import { getClientEncryptionKey } from '../utils/encryptionStorage'
import type { ImageThumbnailProps } from '../types'

export function ImageThumbnail({
  url,
  filename,
  size = 60,
  encryptionEnabled,
  thumbnailKey,
}: ImageThumbnailProps) {
  const [imgError, setImgError] = useState(false)
  const [decryptedThumbnailUrl, setDecryptedThumbnailUrl] = useState<string | null>(null)
  const [protectedThumbnailUrl, setProtectedThumbnailUrl] = useState<string | null>(null)

  const apiBase = API_ENV.apiBaseUrl?.trim() || ''
  const apiBaseNormalized = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase

  const displayUrl = (() => {
    if (url && url.includes('/api/image/')) {
      return url
    }
    if (thumbnailKey && typeof thumbnailKey === 'string' && thumbnailKey.trim() !== '') {
      const safeKey = thumbnailKey.startsWith('/') ? thumbnailKey.slice(1) : thumbnailKey
      return `${apiBaseNormalized}/api/image/${encodeURIComponent(safeKey)}`
    }
    return url
  })()

  // Fetch protected thumbnail (non-encrypted)

  useEffect(() => {
    if (encryptionEnabled) {
      setProtectedThumbnailUrl(null)
      return
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token || !displayUrl || !apiBaseNormalized) {
      return
    }

    const apiPrefix = `${apiBaseNormalized}/api/image/`
    if (!displayUrl.startsWith(apiPrefix)) {
      return
    }

    let cancelled = false
    let objectUrl: string | null = null

    const run = async () => {
      try {
        const response = await fetch(displayUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) return
        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) {
          setProtectedThumbnailUrl(objectUrl)
        }
      } catch {
        if (!cancelled) {
          setProtectedThumbnailUrl(null)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      if (objectUrl && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [displayUrl, apiBaseNormalized, encryptionEnabled])

  // Fetch and decrypt encrypted thumbnail

  useEffect(() => {
    if (!encryptionEnabled || !thumbnailKey || thumbnailKey.trim() === '') {
      setDecryptedThumbnailUrl(null)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null

    const run = async () => {
      try {
        const key = getClientEncryptionKey()
        if (!key) return

        const safeKey = thumbnailKey.startsWith('/') ? thumbnailKey.slice(1) : thumbnailKey
        const fetchUrl = `${apiBaseNormalized}/api/image/${encodeURIComponent(safeKey)}`

        const headers: Record<string, string> = {}
        const token = localStorage.getItem(TOKEN_STORAGE_KEY)
        if (token) headers.Authorization = `Bearer ${token}`

        const response = await fetch(fetchUrl, { headers })
        if (!response.ok) return
        const encryptedBuffer = await response.arrayBuffer()
        const decryptedBlob = await decryptThumbnailBuffer(encryptedBuffer, key)
        objectUrl = URL.createObjectURL(decryptedBlob)
        if (!cancelled) {
          setDecryptedThumbnailUrl(objectUrl)
        }
      } catch {
        if (!cancelled) {
          setDecryptedThumbnailUrl(null)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      if (objectUrl && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [encryptionEnabled, thumbnailKey, apiBaseNormalized])

  const effectiveUrl = encryptionEnabled
    ? decryptedThumbnailUrl || ''
    : protectedThumbnailUrl || displayUrl
  const showLock = encryptionEnabled === true && !effectiveUrl
  const imgSrc = effectiveUrl

  const handleImageError = () => {
    if (!imgError) {
      setImgError(true)
    }
  }

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {showLock ? (
        <LockIcon sx={{ fontSize: size * 0.5, color: 'text.secondary' }} />
      ) : (
        <img
          src={imgSrc}
          alt={filename}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={handleImageError}
        />
      )}
    </Box>
  )
}
