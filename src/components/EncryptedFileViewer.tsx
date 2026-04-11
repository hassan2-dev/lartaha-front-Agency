/**
 * Encrypted File Viewer
 * 
 * Component for previewing and decrypting encrypted files.
 * Supports images, videos, and other file types.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
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
  TextField,
} from '@mui/material'
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  InsertDriveFile as InsertDriveFileIcon,
} from '@mui/icons-material'

import { getDownloadUrl } from '../api/uploadApi'
import {
  decryptFile,
  verifyPassword,
} from '../lib/encryption'

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
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptionProgress, setDecryptionProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null)
  const [isPasswordRequired, setIsPasswordRequired] = useState(encryptionEnabled)
  const [passwordVerified, setPasswordVerified] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)

  // Reset state when file changes
  useEffect(() => {
    if (open) {
      setPassword('')
      setIsLoading(false)
      setIsDecrypting(false)
      setDecryptionProgress(0)
      setError(null)
      setDecryptedUrl(null)
      setIsPasswordRequired(encryptionEnabled)
      setPasswordVerified(false)
    }
  }, [open, fileId, encryptionEnabled])

  // Fetch and decrypt file
  const fetchAndDecrypt = useCallback(async () => {
    if (!encryptionEnabled || !encryptionIv || !encryptionSalt) {
      // No encryption, just fetch the file
      setIsLoading(true)
      try {
        const result = await getDownloadUrl(fileId)
        if (result.ok && result.url) {
          setDecryptedUrl(result.url)
        } else {
          setError('Failed to get file URL')
        }
      } catch (err) {
        setError('Failed to fetch file')
      } finally {
        setIsLoading(false)
      }
      return
    }

    // Need password for encrypted files
    if (!password) {
      setError('Password is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get download URL from server
      const result = await getDownloadUrl(fileId)
      if (!result.ok || !result.url) {
        throw new Error('Failed to get file URL')
      }

      // Fetch encrypted data
      const response = await fetch(result.url)
      if (!response.ok) {
        throw new Error('Failed to fetch encrypted file')
      }

      const encryptedData = await response.arrayBuffer()

      // Decrypt the data
      setIsLoading(false)
      setIsDecrypting(true)

      const decrypted = await decryptFile(
        encryptedData,
        encryptionIv,
        encryptionSalt,
        password
      )

      // Create blob URL for preview
      const url = URL.createObjectURL(decrypted)
      setDecryptedUrl(url)
      setPasswordVerified(true)
      setIsDecrypting(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Decryption failed'
      setError(message)
      setIsLoading(false)
      setIsDecrypting(false)
    }
  }, [fileId, encryptionEnabled, encryptionIv, encryptionSalt, password])

  // Verify password without downloading full file (for small files)
  const verifyPasswordHandler = useCallback(async () => {
    if (!encryptionEnabled || !encryptionIv || !encryptionSalt || !password) {
      setError('Encryption parameters missing')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get download URL
      const result = await getDownloadUrl(fileId)
      if (!result.ok || !result.url) {
        throw new Error('Failed to get file URL')
      }

      // Fetch a small portion to verify password (first 1MB)
      const response = await fetch(result.url)
      if (!response.ok) {
        throw new Error('Failed to fetch file')
      }

      const partialData = await response.arrayBuffer()

      // Try to decrypt
      const isValid = await verifyPassword(partialData, encryptionIv, encryptionSalt, password)
      
      if (isValid) {
        setPasswordVerified(true)
        // Now fetch and decrypt the full file
        await fetchAndDecrypt()
      } else {
        setError('Incorrect password')
      }
    } catch (err) {
      // If partial decrypt fails, try full decrypt anyway
      await fetchAndDecrypt()
    } finally {
      setIsLoading(false)
    }
  }, [fileId, encryptionEnabled, encryptionIv, encryptionSalt, password, fetchAndDecrypt])

  // Handle download
  const handleDownload = useCallback(() => {
    if (!decryptedUrl) return

    const a = document.createElement('a')
    a.href = decryptedUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [decryptedUrl, filename])

  // Cleanup blob URL on close
  useEffect(() => {
    return () => {
      if (decryptedUrl && decryptedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(decryptedUrl)
      }
    }
  }, [decryptedUrl])

  // Determine file type for preview
  const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(filename)
  const isVideo = mimeType.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi)$/i.test(filename)
  const isAudio = mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(filename)

  const renderPreview = () => {
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

    if (isVideo) {
      return (
        <Box sx={{ textAlign: 'center' }}>
          <video
            ref={videoRef}
            controls
            style={{ maxWidth: '100%', maxHeight: '70vh' }}
            src={decryptedUrl}
          />
        </Box>
      )
    }

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

        {/* Password Input for Encrypted Files */}
        {isPasswordRequired && !passwordVerified && (
          <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              هذا الملف مشفر. أدخل كلمة المرور لفك التشفير.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                type="password"
                size="small"
                label="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                onKeyPress={(e) => e.key === 'Enter' && verifyPasswordHandler()}
              />
              <Button
                variant="contained"
                onClick={verifyPasswordHandler}
                disabled={!password || isLoading}
              >
                فك التشفير
              </Button>
            </Box>
            {error && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
          </Box>
        )}

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