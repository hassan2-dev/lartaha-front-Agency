/**
 * VideoThumbnail Component
 * Displays video thumbnails with play icon overlay
 */

import { useState, useEffect } from 'react'
import { Box, Avatar } from '@mui/material'
import VideoFileIcon from '@mui/icons-material/VideoFile'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { API_ENV, TOKEN_STORAGE_KEY } from '../../../config/api'
import { decryptThumbnailBuffer } from '../../../lib/encryption'
import { getClientEncryptionKey } from '../utils/encryptionStorage'
import type { VideoThumbnailProps } from '../types'

export function VideoThumbnail({
  url,
  thumbnailKey,
  size = 60,
  encryptionEnabled,
}: VideoThumbnailProps) {
  const [decryptedThumbnailUrl, setDecryptedThumbnailUrl] = useState<string | null>(null)
  const [protectedThumbnailUrl, setProtectedThumbnailUrl] = useState<string | null>(null)

  const apiBase = API_ENV.apiBaseUrl?.trim() || ''
  const apiBaseNormalized = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase

  const displayUrl = (() => {
    if (url && url.includes('/api/image/')) {
      return url
    }
    if (thumbnailKey) {
      const safeKey = thumbnailKey.startsWith('/') ? thumbnailKey.slice(1) : thumbnailKey
      return `${apiBaseNormalized}/api/image/${encodeURIComponent(safeKey)}`
    }
    return ''
  })()

  // Fetch protected thumbnail

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
    if (!thumbnailKey || thumbnailKey.trim() === '') {
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
  }, [thumbnailKey, apiBaseNormalized])

  const effectiveUrl = encryptionEnabled
    ? decryptedThumbnailUrl || ''
    : protectedThumbnailUrl || displayUrl
  const showPlayIcon = !!effectiveUrl

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
      {showPlayIcon ? (
        <img
          src={effectiveUrl}
          alt="Video thumbnail"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
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

      {/* Play icon overlay */}
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
    </Box>
  )
}
