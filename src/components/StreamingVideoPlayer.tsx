/**
 * Streaming Video Player with progressive decryption
 *
 * Downloads and decrypts video in chunks while playing
 */

import { useState, useEffect, useRef } from 'react'
import { Box, CircularProgress, LinearProgress, Typography } from '@mui/material'

import { downloadAndDecryptStream } from '../lib/encryption'

interface StreamingVideoPlayerProps {
  url: string
  filename: string
  mimeType: string
  size: number
  encryptionEnabled: boolean
  encryptionIv?: string
  encryptionSalt?: string
  fileId?: string
  onClose: () => void
}

export default function StreamingVideoPlayer({
  url,
  filename,
  mimeType: _mimeType, // Not used directly, but kept for interface consistency
  size,
  encryptionEnabled,
  encryptionIv,
  encryptionSalt,
  fileId,
  onClose,
}: StreamingVideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptionProgress, setDecryptionProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const decryptionPasswordRef = useRef<string>('')

  // Password is retrieved in the video loading effect

  // Download and decrypt video
  useEffect(() => {
    const loadVideo = async () => {
      console.log('[StreamingVideoPlayer] Loading video:', filename)
      console.log('[StreamingVideoPlayer] URL prop:', url)
      console.log('[StreamingVideoPlayer] Encryption enabled:', encryptionEnabled)
      setIsLoading(true)
      setError(null)

      try {
        if (!encryptionEnabled) {
          // For non-encrypted files, use direct URL (streaming from R2)
          console.log('[StreamingVideoPlayer] Non-encrypted file, using direct URL')
          console.log('[StreamingVideoPlayer] URL:', url)
          setVideoUrl(url)
          setIsLoading(false)
          return
        }

        // For encrypted files, need password
        if (!decryptionPasswordRef.current) {
          const password = sessionStorage.getItem('file_encryption_password')
          if (!password) {
            throw new Error('Missing encryption password')
          }
          decryptionPasswordRef.current = password
        }

        if (!encryptionIv || !encryptionSalt) {
          throw new Error('Missing encryption parameters')
        }

        setIsDecrypting(true)

        // For encrypted files, use streaming decryption
        console.log('[StreamingVideoPlayer] Encrypted file, using streaming decryption')
        const decrypted = await downloadAndDecryptStream(
          url,
          encryptionIv,
          encryptionSalt,
          decryptionPasswordRef.current,
          size,
          progress => setDecryptionProgress(progress),
          fileId, // Pass fileId for caching
          _mimeType, // Pass MIME type for caching
          filename // Pass filename for caching
        )

        console.log('[StreamingVideoPlayer] Decryption complete, blob size:', decrypted.size)

        // Create blob URL for video
        const blobUrl = URL.createObjectURL(decrypted)
        setVideoUrl(blobUrl)
        setIsDecrypting(false)
        setIsLoading(false)
      } catch (err) {
        console.error('[StreamingVideoPlayer] Error loading video:', err)
        setError(err instanceof Error ? err.message : 'Failed to load video')
        setIsLoading(false)
        setIsDecrypting(false)
      }
    }

    loadVideo()

    // Cleanup
    return () => {
      if (videoUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [url, filename, size, encryptionEnabled, encryptionIv, encryptionSalt])

  // Handle video loaded
  const handleLoadedData = () => {
    console.log('[StreamingVideoPlayer] Video loaded data')
    console.log('[StreamingVideoPlayer] Video URL:', videoUrl)
    console.log('[StreamingVideoPlayer] Video ref:', videoRef.current)
    if (videoRef.current) {
      console.log('[StreamingVideoPlayer] Attempting to play video')
      videoRef.current.play().catch(err => {
        console.warn('[StreamingVideoPlayer] Auto-play failed:', err)
      })
    }
  }

  // Handle video error
  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('[StreamingVideoPlayer] Video error:', e)
    console.error('[StreamingVideoPlayer] Video URL:', videoUrl)
    setError('Failed to play video')
  }

  if (error) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: 'center',
          minHeight: 300,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <Typography color="error">{error}</Typography>
        <button onClick={onClose}>Close</button>
      </Box>
    )
  }

  if (isLoading || isDecrypting) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: 'center',
          minHeight: 300,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CircularProgress size={48} />
        {isDecrypting && (
          <>
            <Typography>جاري فك التشفير... {decryptionProgress}%</Typography>
            <LinearProgress
              variant="determinate"
              value={decryptionProgress}
              sx={{ width: '80%' }}
            />
          </>
        )}
        {isLoading && !isDecrypting && <Typography>جاري تحميل الفيديو...</Typography>}
      </Box>
    )
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      <video
        ref={videoRef}
        controls
        autoPlay
        style={{
          maxWidth: '100%',
          maxHeight: '70vh',
          width: '100%',
        }}
        src={videoUrl || undefined}
        onLoadedData={handleLoadedData}
        onError={handleVideoError}
        onCanPlay={() => console.log('[StreamingVideoPlayer] Video can play')}
        onPlaying={() => console.log('[StreamingVideoPlayer] Video is playing')}
        onWaiting={() => console.log('[StreamingVideoPlayer] Video is waiting')}
        onStalled={() => console.log('[StreamingVideoPlayer] Video is stalled')}
      />
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          {filename}
        </Typography>
      </Box>
    </Box>
  )
}
