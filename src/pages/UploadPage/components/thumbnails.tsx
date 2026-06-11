import { useEffect, useState } from 'react'
import { Box, CircularProgress, Avatar } from '@mui/material'
import VideoFileIcon from '@mui/icons-material/VideoFile'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import LockIcon from '@mui/icons-material/Lock'
import { API_ENV, TOKEN_STORAGE_KEY } from '../../../config/api'
import { decryptThumbnailBuffer } from '../../../lib/encryption'
import { getClientEncryptionKey, getFileIcon } from './utils'

export function ThumbnailTypeBadge({ fileType, size = 16 }: { fileType: string; size?: number }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: 4,
        bottom: 4,
        width: size + 8,
        height: size + 8,
        borderRadius: 999,
        backgroundColor: 'rgba(0,0,0,0.65)',
        border: '1px solid rgba(255,255,255,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
      }}
    >
      <Box sx={{ display: 'inline-flex', color: 'white', '& svg': { fontSize: size } }}>
        {getFileIcon(fileType)}
      </Box>
    </Box>
  )
}

export function ImageThumbnail({
  url,
  filename,
  size = 60,
  encryptionEnabled,
  thumbnailKey,
}: {
  url: string
  filename: string
  size?: number
  encryptionEnabled?: boolean
  thumbnailKey?: string | null
}) {
  const [imgError, setImgError] = useState(false)
  const [decryptedThumbnailUrl, setDecryptedThumbnailUrl] = useState<string | null>(null)
  const [protectedThumbnailUrl, setProtectedThumbnailUrl] = useState<string | null>(null)
  const [protectedLoading, setProtectedLoading] = useState(false)
  const [decryptedLoading, setDecryptedLoading] = useState(false)

  const apiBase = API_ENV.apiBaseUrl?.trim() || ''
  const apiBaseNormalized = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase
  const displayUrl = (() => {
    if (url && (url.includes('/api/image?') || url.includes('/api/image/'))) {
      return url
    }
    if (thumbnailKey && typeof thumbnailKey === 'string' && thumbnailKey.trim() !== '') {
      const safeKey = thumbnailKey.startsWith('/') ? thumbnailKey.slice(1) : thumbnailKey
      return `${apiBaseNormalized}/api/image?key=${encodeURIComponent(safeKey)}`
    }
    return url
  })()

  useEffect(() => {
    if (encryptionEnabled) {
      setProtectedThumbnailUrl(null)
      return
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!displayUrl || !apiBaseNormalized) {
      setProtectedThumbnailUrl(null)
      return
    }

    const apiPrefix = `${apiBaseNormalized}/api/image`
    if (!displayUrl.startsWith(apiPrefix)) {
      setProtectedThumbnailUrl(displayUrl)
      return
    }

    if (!token) {
      setProtectedThumbnailUrl(null)
      return
    }

    setProtectedLoading(true)

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
        if (!cancelled) setProtectedThumbnailUrl(objectUrl)
      } catch {
        if (!cancelled) setProtectedThumbnailUrl(null)
      } finally {
        if (!cancelled) setProtectedLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
      setProtectedLoading(false)
      if (objectUrl && objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl)
    }
  }, [displayUrl, apiBaseNormalized, encryptionEnabled])

  useEffect(() => {
    if (!encryptionEnabled || !thumbnailKey || thumbnailKey.trim() === '') {
      setDecryptedThumbnailUrl(null)
      return
    }

    setDecryptedLoading(true)

    let cancelled = false
    let objectUrl: string | null = null

    const run = async () => {
      try {
        const key = getClientEncryptionKey()
        if (!key) return

        const safeKey = thumbnailKey.startsWith('/') ? thumbnailKey.slice(1) : thumbnailKey
        const fetchUrl = `${apiBaseNormalized}/api/image?key=${encodeURIComponent(safeKey)}`

        const headers: Record<string, string> = {}
        const token = localStorage.getItem(TOKEN_STORAGE_KEY)
        if (token) headers.Authorization = `Bearer ${token}`

        const response = await fetch(fetchUrl, { headers })
        if (!response.ok) return
        const encryptedBuffer = await response.arrayBuffer()
        let previewBlob: Blob
        try {
          previewBlob = await decryptThumbnailBuffer(encryptedBuffer, key)
        } catch {
          previewBlob = new Blob([encryptedBuffer], { type: 'image/jpeg' })
        }
        objectUrl = URL.createObjectURL(previewBlob)
        if (!cancelled) setDecryptedThumbnailUrl(objectUrl)
      } catch {
        if (!cancelled) setDecryptedThumbnailUrl(null)
      } finally {
        if (!cancelled) setDecryptedLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
      setDecryptedLoading(false)
      if (objectUrl && objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl)
    }
  }, [encryptionEnabled, thumbnailKey, apiBaseNormalized])

  const effectiveUrl = encryptionEnabled
    ? decryptedThumbnailUrl || ''
    : protectedThumbnailUrl || displayUrl
  const showLock = encryptionEnabled === true && !effectiveUrl
  const showSpinner =
    !showLock && (protectedLoading || decryptedLoading) && !imgError && !effectiveUrl
  const imgSrc = effectiveUrl

  const handleImageError = () => {
    if (!imgError) {
      setImgError(true)
      setProtectedLoading(false)
      setDecryptedLoading(false)
    }
  }

  const handleImageLoad = () => {
    setProtectedLoading(false)
    setDecryptedLoading(false)
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
      {showSpinner ? (
        <CircularProgress size={size * 0.4} thickness={4} />
      ) : showLock ? (
        <LockIcon sx={{ fontSize: size * 0.5, color: 'text.secondary' }} />
      ) : (
        <img
          src={imgSrc}
          alt={filename}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      )}
    </Box>
  )
}

export function VideoThumbnail({
  url,
  thumbnailKey,
  size = 60,
  encryptionEnabled,
}: {
  url: string
  thumbnailKey?: string | null
  size?: number
  encryptionEnabled?: boolean
}) {
  const [decryptedThumbnailUrl, setDecryptedThumbnailUrl] = useState<string | null>(null)
  const [protectedThumbnailUrl, setProtectedThumbnailUrl] = useState<string | null>(null)
  const [protectedLoading, setProtectedLoading] = useState(false)
  const [decryptedLoading, setDecryptedLoading] = useState(false)

  const apiBase = API_ENV.apiBaseUrl?.trim() || ''
  const apiBaseNormalized = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase
  const displayUrl = (() => {
    if (url && (url.includes('/api/image?') || url.includes('/api/image/'))) return url
    if (url && !url.includes('/api/image?') && !url.includes('/api/image/')) return url
    if (thumbnailKey) {
      const safeKey = thumbnailKey.startsWith('/') ? thumbnailKey.slice(1) : thumbnailKey
      return `${apiBaseNormalized}/api/image?key=${encodeURIComponent(safeKey)}`
    }
    return ''
  })()

  useEffect(() => {
    if (encryptionEnabled) {
      setProtectedThumbnailUrl(null)
      return
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!displayUrl || !apiBaseNormalized) {
      setProtectedThumbnailUrl(null)
      return
    }

    const apiPrefix = `${apiBaseNormalized}/api/image`
    if (!displayUrl.startsWith(apiPrefix)) {
      setProtectedThumbnailUrl(displayUrl)
      return
    }

    if (!token) {
      setProtectedThumbnailUrl(null)
      return
    }

    setProtectedLoading(true)

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
        if (!cancelled) setProtectedThumbnailUrl(objectUrl)
      } catch {
        if (!cancelled) setProtectedThumbnailUrl(null)
      } finally {
        if (!cancelled) setProtectedLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
      setProtectedLoading(false)
      if (objectUrl && objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl)
    }
  }, [displayUrl, apiBaseNormalized, encryptionEnabled])

  useEffect(() => {
    if (!thumbnailKey || thumbnailKey.trim() === '') {
      setDecryptedThumbnailUrl(null)
      return
    }

    setDecryptedLoading(true)

    let cancelled = false
    let objectUrl: string | null = null

    const run = async () => {
      try {
        const key = getClientEncryptionKey()
        if (!key) return

        const safeKey = thumbnailKey.startsWith('/') ? thumbnailKey.slice(1) : thumbnailKey
        const fetchUrl = `${apiBaseNormalized}/api/image?key=${encodeURIComponent(safeKey)}`

        const headers: Record<string, string> = {}
        const token = localStorage.getItem(TOKEN_STORAGE_KEY)
        if (token) headers.Authorization = `Bearer ${token}`

        const response = await fetch(fetchUrl, { headers })
        if (!response.ok) return
        const encryptedBuffer = await response.arrayBuffer()
        let previewBlob: Blob
        try {
          previewBlob = await decryptThumbnailBuffer(encryptedBuffer, key)
        } catch {
          previewBlob = new Blob([encryptedBuffer], { type: 'image/jpeg' })
        }
        objectUrl = URL.createObjectURL(previewBlob)
        if (!cancelled) setDecryptedThumbnailUrl(objectUrl)
      } catch {
        if (!cancelled) setDecryptedThumbnailUrl(null)
      } finally {
        if (!cancelled) setDecryptedLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
      setDecryptedLoading(false)
      if (objectUrl && objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl)
    }
  }, [thumbnailKey, apiBaseNormalized])

  const effectiveUrl = encryptionEnabled
    ? decryptedThumbnailUrl || ''
    : protectedThumbnailUrl || displayUrl
  const showPlayIcon = !!effectiveUrl
  const showSpinner = !showPlayIcon && (protectedLoading || decryptedLoading)

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
        position: 'relative',
      }}
    >
      {showSpinner ? (
        <CircularProgress size={size * 0.4} thickness={4} />
      ) : showPlayIcon ? (
        <img
          src={effectiveUrl}
          alt="Video thumbnail"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Avatar
          sx={{
            width: size * 0.8,
            height: size * 0.8,
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'inherit',
          }}
        >
          <VideoFileIcon />
        </Avatar>
      )}

      {showPlayIcon && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.3)',
            transition: 'background-color 0.2s',
          }}
        >
          <PlayArrowIcon
            sx={{
              fontSize: size * 0.4,
              color: 'white',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
            }}
          />
        </Box>
      )}
    </Box>
  )
}
