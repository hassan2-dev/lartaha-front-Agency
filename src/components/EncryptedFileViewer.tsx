/**
 * Encrypted File Viewer
 * 
 * Component for previewing and decrypting encrypted files.
 * Supports images, videos, and other file types.
 */

import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  LinearProgress,
  Typography,
  IconButton,
} from '@mui/material'
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  InsertDriveFile as InsertDriveFileIcon,
} from '@mui/icons-material'

import { getDownloadUrl } from '../api/uploadApi'
import { downloadAndDecryptStream } from '../lib/encryption'
import StreamingVideoPlayer from './StreamingVideoPlayer'

// Cache for client-only encryption key in sessionStorage
const CLIENT_KEY_CACHE = 'file_encryption_password'

function getCachedClientKey(): string | null {
  try {
    return sessionStorage.getItem(CLIENT_KEY_CACHE)
  } catch {
    return null
  }
}

interface EncryptedFileViewerProps {
  fileId: string
  filename: string
  mimeType?: string
  size?: number
  encryptionEnabled?: boolean
  encryptionIv?: string
  encryptionSalt?: string
  open: boolean
  onClose: () => void
}

export default function EncryptedFileViewer({
  fileId,
  filename,
  mimeType = '',
  size,
  encryptionEnabled = false,
  encryptionIv,
  encryptionSalt,
  open,
  onClose,
}: EncryptedFileViewerProps) {
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptionProgress, setDecryptionProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // videoRef is no longer needed since we use StreamingVideoPlayer

  // Reset state when file changes
  useEffect(() => {
    if (open) {
      setDecryptedUrl(null)
      setIsLoading(false)
      setIsDecrypting(false)
      setDecryptionProgress(0)
      setError(null)
    }
  }, [open, fileId])

  // Determine file type for preview
  const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(filename)
  const isVideo = mimeType.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi)$/i.test(filename)
  const isAudio = mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(filename)

  // Auto-fetch workspace key and decrypt when opening
  useEffect(() => {
    console.log('[EncryptedFileViewer] Props:', { open, encryptionEnabled, encryptionIv, encryptionSalt })
    if (!open) {
      console.log('[EncryptedFileViewer] Dialog not open, skipping')
      return
    }
    
    // For video files, let StreamingVideoPlayer handle decryption
    if (isVideo) {
      console.log('[EncryptedFileViewer] Video file, will let StreamingVideoPlayer handle decryption')
      console.log('[EncryptedFileViewer] File ID:', fileId)
      setIsLoading(true)
      getDownloadUrl(fileId)
        .then(result => {
          console.log('[EncryptedFileViewer] Download URL result:', result)
          if (result.ok && result.url) {
            console.log('[EncryptedFileViewer] Setting decrypted URL:', result.url.substring(0, 50) + '...')
            setDecryptedUrl(result.url)
          } else {
            console.error('[EncryptedFileViewer] Failed to get file URL:', result)
            setError('Failed to get file URL')
          }
        })
        .catch((err) => {
          console.error('[EncryptedFileViewer] Error fetching file:', err)
          setError('Failed to fetch file')
        })
        .finally(() => setIsLoading(false))
      return
    }
    
    if (!encryptionEnabled) {
      console.log('[EncryptedFileViewer] File not encrypted, will show directly')
      // For non-encrypted files, just fetch and show directly
      setIsLoading(true)
      getDownloadUrl(fileId)
        .then(result => {
          if (result.ok && result.url) {
            setDecryptedUrl(result.url)
          } else {
            setError('Failed to get file URL')
          }
        })
        .catch(() => setError('Failed to fetch file'))
        .finally(() => setIsLoading(false))
      return
    }
    if (!encryptionIv || !encryptionSalt) {
      console.error('[EncryptedFileViewer] MISSING IV or SALT - treating as non-encrypted:', { encryptionIv, encryptionSalt })
      // Fallback: try to show as non-encrypted
      setIsLoading(true)
      getDownloadUrl(fileId)
        .then(result => {
          if (result.ok && result.url) {
            setDecryptedUrl(result.url)
          } else {
            setError('Failed to get file URL')
          }
        })
        .catch(() => setError('Failed to fetch file'))
        .finally(() => setIsLoading(false))
      return
    }

    const decrypt = async () => {
      console.log('[EncryptedFileViewer] Starting decrypt flow...')
      setIsLoading(true)
      setError(null)

      try {
        // Step 1: Get client-only key (use cache if available)
        const key = getCachedClientKey()
        if (!key) {
          throw new Error('Missing encryption key')
        }

        // Step 2: Get download URL
        console.log('[EncryptedFileViewer] Step 2: Getting download URL for:', fileId)
        const result = await getDownloadUrl(fileId)
        if (!result.ok || !result.url) {
          throw new Error('Failed to get download URL')
        }
        console.log('[EncryptedFileViewer] Step 2: Got URL:', result.url.substring(0, 50) + '...')

        // Step 3: Fetch encrypted data directly from R2 (with CORS)
        console.log('[EncryptedFileViewer] Step 3: Fetching encrypted data directly from R2...')
        const response = await fetch(result.url, {
          headers: {
            'Origin': window.location.origin,
          },
        })
        if (!response.ok) {
          throw new Error('Failed to fetch encrypted file')
        }
        const encryptedData = await response.arrayBuffer()
        console.log('[EncryptedFileViewer] Step 3: Got data, size:', encryptedData.byteLength)

        if (encryptedData.byteLength === 0) {
          throw new Error('Encrypted file is empty')
        }

        setIsLoading(false)
        setIsDecrypting(true)

        // Step 4: Decrypt
        console.log('[EncryptedFileViewer] Step 4: Decrypting with IV:', encryptionIv, 'Salt:', encryptionSalt)
        
        // Use streaming decryption for large files
        // Note: We need to get the file size from the server response
        const fileSize = result.size || 0
        const decrypted = await downloadAndDecryptStream(
          result.url,
          encryptionIv!,
          encryptionSalt!,
          key,
          fileSize,
          (progress) => setDecryptionProgress(progress),
          fileId, // Pass fileId for caching
          mimeType, // Pass MIME type for caching
          filename // Pass filename for caching
        )
        
        console.log('[EncryptedFileViewer] Step 4: Decryption complete, blob size:', decrypted.size)

        const url = URL.createObjectURL(decrypted)
        setDecryptedUrl(url)
        setIsDecrypting(false)
      } catch (err) {
        console.error('[EncryptedFileViewer] Decryption error:', err)
        setError(err instanceof Error ? err.message : 'Decryption failed')
        setIsLoading(false)
        setIsDecrypting(false)
      }
    }

    void decrypt()
  }, [open, fileId, encryptionEnabled, encryptionIv, encryptionSalt])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (decryptedUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(decryptedUrl)
      }
    }
  }, [decryptedUrl])

  const handleDownload = () => {
    if (!decryptedUrl) return

    const a = document.createElement('a')
    a.href = decryptedUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const renderPreview = () => {
    // For video files, let StreamingVideoPlayer handle loading states
    if (isVideo) {
      if (!decryptedUrl) {
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <CircularProgress />
          </Box>
        )
      }
      return (
        <StreamingVideoPlayer
          url={decryptedUrl}
          filename={filename}
          mimeType={mimeType}
          size={size || 0}
          encryptionEnabled={encryptionEnabled || false}
          encryptionIv={encryptionIv}
          encryptionSalt={encryptionSalt}
          fileId={fileId}
          onClose={onClose}
        />
      )
    }

    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </Box>
      )
    }

    if (isDecrypting) {
      return (
        <Box sx={{ minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <CircularProgress size={48} />
          <Typography>جاري فك التشفير... {decryptionProgress}%</Typography>
          <LinearProgress variant="determinate" value={decryptionProgress} sx={{ width: '80%' }} />
        </Box>
      )
    }

    if (error && !decryptedUrl) {
      return (
        <Box sx={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )
    }

    if (!decryptedUrl) {
      return null
    }

    if (isImage) {
      return (
        <Box sx={{ textAlign: 'center' }}>
          <img
            src={decryptedUrl}
            alt={filename}
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
          />
        </Box>
      )
    }

    // Video rendering is handled above

    if (isAudio) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <audio controls src={decryptedUrl} style={{ width: '100%' }} />
        </Box>
      )
    }

    // Generic file preview
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <InsertDriveFileIcon sx={{ fontSize: 64, opacity: 0.5, mb: 2 }} />
        <Typography variant="body1" sx={{ mb: 2 }}>
          {filename}
        </Typography>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleDownload}>
          تحميل الملف
        </Button>
      </Box>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {encryptionEnabled ? <LockIcon /> : <LockOpenIcon />}
          <Typography variant="h6" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {filename}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* File Info */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {size && (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              الحجم: {formatBytes(size)}
            </Typography>
          )}
          {mimeType && (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              النوع: {mimeType}
            </Typography>
          )}
          {encryptionEnabled && (
            <Typography variant="body2" sx={{ color: 'success.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LockIcon sx={{ fontSize: 14 }} /> مشفر
            </Typography>
          )}
        </Box>

        {/* Preview Area */}
        {renderPreview()}
      </DialogContent>

      <DialogActions>
        {decryptedUrl && (
          <Button startIcon={<DownloadIcon />} onClick={handleDownload}>
            تحميل
          </Button>
        )}
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  )
}

// Utility function
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

// splitIntoChunks function moved to encryption.ts