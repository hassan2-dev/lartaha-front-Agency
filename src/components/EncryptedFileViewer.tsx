/**
 * Encrypted File Viewer
 * 
 * Component for previewing and decrypting encrypted files.
 * Supports images, videos, and other file types.
 */

import { useState, useEffect, useRef } from 'react'
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
import { getWorkspaceEncryptionKey } from '../api/workspaceApi'
import { API_ENV, TOKEN_STORAGE_KEY } from '../config/api'
import {
  decryptFile,
  decryptFileChunked,
} from '../lib/encryption'

// Cache for workspace encryption key in sessionStorage
const WORKSPACE_KEY_CACHE = 'workspace_encryption_key'

function getCachedWorkspaceKey(): string | null {
  try {
    return sessionStorage.getItem(WORKSPACE_KEY_CACHE)
  } catch {
    return null
  }
}

function setCachedWorkspaceKey(key: string): void {
  try {
    sessionStorage.setItem(WORKSPACE_KEY_CACHE, key)
  } catch {
    // Ignore storage errors
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

  const videoRef = useRef<HTMLVideoElement>(null)

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

  // Auto-fetch workspace key and decrypt when opening
  useEffect(() => {
    console.log('[EncryptedFileViewer] Props:', { open, encryptionEnabled, encryptionIv, encryptionSalt })
    if (!open) {
      console.log('[EncryptedFileViewer] Dialog not open, skipping')
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
        // Step 1: Get workspace key (use cache if available)
        let key = getCachedWorkspaceKey()
        if (!key) {
          console.log('[EncryptedFileViewer] Step 1: Fetching workspace encryption key...')
          const res = await getWorkspaceEncryptionKey()
          if (!res.ok || !res.key) {
            throw new Error('Failed to get encryption key from server')
          }
          // Convert Node.js base64 to URL-safe base64
          key = res.key.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
          setCachedWorkspaceKey(key)
          console.log('[EncryptedFileViewer] Step 1: Got and cached key:', key.substring(0, 15) + '...')
        } else {
          console.log('[EncryptedFileViewer] Step 1: Using cached key:', key.substring(0, 15) + '...')
        }

        // Step 2: Get download URL
        console.log('[EncryptedFileViewer] Step 2: Getting download URL for:', fileId)
        const result = await getDownloadUrl(fileId)
        if (!result.ok || !result.url) {
          throw new Error('Failed to get download URL')
        }
        console.log('[EncryptedFileViewer] Step 2: Got URL:', result.url.substring(0, 50) + '...')

        // Step 3: Fetch encrypted data through server proxy (bypasses CORS)
        console.log('[EncryptedFileViewer] Step 3: Fetching encrypted data through server proxy...')
        // Use API base URL or fallback to localhost:3030 for development
        const apiBase = API_ENV.apiBaseUrl || 'http://localhost:3030'
        console.log('[EncryptedFileViewer] API base:', apiBase)
        
        // Get auth token for the request
        const token = localStorage.getItem(TOKEN_STORAGE_KEY)
        const headers: Record<string, string> = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        
        const response = await fetch(`${apiBase}/api/upload/download/${fileId}/data`, { headers })
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
        
        const decrypted = encryptedData.byteLength > 12 * 1024 * 1024
          ? await decryptFileChunked(
              { encryptedChunks: splitIntoChunks(encryptedData), iv: encryptionIv!, salt: encryptionSalt!, password: key },
              (progress) => setDecryptionProgress(progress)
            )
          : await decryptFile(encryptedData, encryptionIv!, encryptionSalt!, key)
        
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

function splitIntoChunks(buffer: ArrayBuffer, chunkSize: number = 5 * 1024 * 1024): ArrayBuffer[] {
  const chunks: ArrayBuffer[] = []
  let offset = 0
  while (offset < buffer.byteLength) {
    chunks.push(buffer.slice(offset, offset + chunkSize))
    offset += chunkSize
  }
  return chunks
}