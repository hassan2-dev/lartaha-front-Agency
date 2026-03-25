import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Toolbar,
  Typography,
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import RefreshIcon from '@mui/icons-material/Refresh'
import UploadIcon from '@mui/icons-material/Upload'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { useNavigate } from 'react-router-dom'
import UploadDropzone, { type SelectedUploadFile } from '../components/UploadDropzone'
import { useAuth } from '../contexts/AuthContext'
import { useThemeMode } from '../contexts/ThemeContext'
import { API_ENV } from '../config/api'
import { listUploadedObjects, uploadFiles } from '../api/uploadApi'

function fmtBytes(bytes: number | undefined) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

async function shareOrCopy(url: string) {
  if (!url) return
  try {
    if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
      await navigator.share({ url })
      return
    }
  } catch {
    // fall back to copy
  }

  try {
    await navigator.clipboard.writeText(url)
  } catch {
    // ignore
  }
}

export default function UploadPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { mode, toggle } = useThemeMode()

  const [selectedFiles, setSelectedFiles] = useState<SelectedUploadFile[]>([])
  // Explorer path under "uploads/". Examples: "" (root), "team1", "team1/sub1"
  const [currentPath, setCurrentPath] = useState('')
  const [uploadedObjects, setUploadedObjects] = useState<Array<{ key: string; size?: number }>>([])
  const [foldersHere, setFoldersHere] = useState<string[]>([])
  const [filesHere, setFilesHere] = useState<Array<{ key: string; size?: number }>>([])

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loadingExplorer, setLoadingExplorer] = useState(false)

  const canUpload = useMemo(() => selectedFiles.length > 0 && !uploading, [selectedFiles, uploading])

  const ROOT_PREFIX = 'uploads'
  const explorerPrefix = currentPath.trim()
    ? `${ROOT_PREFIX}/${currentPath.trim()}`
    : ROOT_PREFIX

  async function handleUpload() {
    setError(null)
    setSuccess(null)
    setUploadedObjects([])

    if (selectedFiles.length === 0) {
      setError('يرجى اختيار ملفات أو مجلد للرفع.')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()

      // Destination prefix in R2. Root is always "uploads".
      // If user is inside a folder, upload goes inside that folder.
      formData.append('batchName', explorerPrefix)

      for (const sf of selectedFiles) {
        // Using relativePath as filename helps your backend preserve folder structure.
        formData.append('files', sf.file, sf.relativePath)
      }

      const res = await uploadFiles(formData, (pct) => setUploadProgress(pct))
      const uploaded = res.uploaded ?? []
      setUploadedObjects(uploaded)

      const count = uploaded.length
      setSuccess(`تم الرفع بنجاح. عدد الملفات: ${count}`)
      setSelectedFiles([])
      // Keep selected destination so user can keep uploading.

      // Refresh explorer after upload.
      void fetchExplorer()
    } catch (e: unknown) {
      const err = e as {
        message?: string
        response?: { data?: { message?: string; error?: string } }
      }
      const backendMsg = err.response?.data?.message ?? err.response?.data?.error
      setError(`فشل الرفع: ${backendMsg ?? err.message ?? 'خطأ غير معروف'}`)
    } finally {
      setUploading(false)
    }
  }

  async function fetchExplorer() {
    setLoadingExplorer(true)
    try {
      const res = await listUploadedObjects(explorerPrefix, 1000, true)
      setFoldersHere(res.folders ?? [])
      setFilesHere(res.objects ?? [])
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? err.message ?? 'فشل جلب الملفات')
    } finally {
      setLoadingExplorer(false)
    }
  }

  useEffect(() => {
    void fetchExplorer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath])

  const publicBase = API_ENV.r2PublicBaseUrl?.trim() ?? ''
  function keyToPublicUrl(key: string) {
    if (!publicBase) return ''
    const base = publicBase.endsWith('/') ? publicBase.slice(0, -1) : publicBase
    const safeKey = key.startsWith('/') ? key.slice(1) : key
    return `${base}/${safeKey}`
  }

  function keyToDownloadUrl(key: string) {
    const base = API_ENV.apiBaseUrl?.trim() || ''
    if (!base) return ''
    const normalized = base.endsWith('/') ? base.slice(0, -1) : base
    return `${normalized}/api/download?key=${encodeURIComponent(key)}`
  }

  function filenameFromKey(key: string) {
    const parts = String(key).split('/').filter(Boolean)
    return parts[parts.length - 1] || 'file'
  }

  function prefixToDisplayName(prefix: string) {
    const p = String(prefix || '')
    if (!p) return ROOT_PREFIX
    const cleaned = p.endsWith('/') ? p.slice(0, -1) : p
    return cleaned
  }

  const breadcrumbs = useMemo(() => {
    const parts = currentPath.split('/').filter(Boolean)
    const crumbs: Array<{ label: string; path: string }> = [{ label: ROOT_PREFIX, path: '' }]
    const acc: string[] = []
    for (const seg of parts) {
      acc.push(seg)
      crumbs.push({ label: seg, path: acc.join('/') })
    }
    return crumbs
  }, [currentPath])

  return (
    <Box sx={{ height: '100%' }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: 'transparent',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          color: 'inherit',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
             larthaa Agency
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="text"
              onClick={() => navigate('/tasks')}
              sx={{ color: 'inherit', borderRadius: 999, px: 2 }}
            >
              المهام
            </Button>
            <IconButton onClick={toggle} color="inherit" aria-label="تبديل الثيم">
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
            <IconButton
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
              color="inherit"
              aria-label="تسجيل الخروج"
            >
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <UploadDropzone
          files={selectedFiles}
          onFilesChange={setSelectedFiles}
          uploading={uploading}
          uploadProgress={uploadProgress}
          error={error}
        />

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.9, fontWeight: 800 }}>
            المستعرض (Root / Folder)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {breadcrumbs.map((c, idx) => (
              <Button
                key={`${c.path}_${idx}`}
                size="small"
                variant="text"
                onClick={() => setCurrentPath(c.path)}
                sx={{ borderRadius: 999 }}
              >
                {c.label}
              </Button>
            ))}
            <Box sx={{ flex: '1 1 auto' }} />
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              وجهة الرفع: {prefixToDisplayName(explorerPrefix)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ flex: '1 1 auto' }} />
          <Button
            variant="outlined"
            onClick={() => {
              void fetchExplorer()
            }}
            disabled={uploading || loadingExplorer}
            startIcon={loadingExplorer ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
            sx={{ borderRadius: 999 }}
          >
            {loadingExplorer ? 'جارٍ التحديث...' : 'تحديث المحتويات'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/tasks')}
            disabled={uploading}
            sx={{ borderRadius: 999 }}
          >
            لوحة المهام
          </Button>

          <Button
            variant="contained"
            disabled={!canUpload}
            onClick={handleUpload}
            startIcon={<UploadIcon />}
            sx={{ borderRadius: 999 }}
          >
            {uploading ? 'جارٍ الرفع...' : 'رفع'}
          </Button>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}

        {uploadedObjects.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.9 }}>
              الملفات التي تم رفعها
            </Typography>
            <List
              dense
              sx={{
                maxHeight: 280,
                overflow: 'auto',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {uploadedObjects.slice(0, 200).map((obj) => {
                const url = keyToPublicUrl(obj.key)
                const dl = keyToDownloadUrl(obj.key)
                return (
                  <ListItem
                    key={obj.key}
                    sx={{
                      py: 0.75,
                      alignItems: 'flex-start',
                      gap: 1,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ wordBreak: 'break-word', opacity: 0.92 }}>
                          {obj.key}
                        </Typography>
                      }
                      secondary={obj.size ? `الحجم: ${fmtBytes(obj.size)}` : undefined}
                    />
                    {url && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="text"
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          sx={{ borderRadius: 999 }}
                        >
                          فتح
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          href={dl || url}
                          download={dl ? undefined : filenameFromKey(obj.key)}
                          sx={{ borderRadius: 999 }}
                        >
                          تنزيل
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => void shareOrCopy(url)}
                          sx={{ borderRadius: 999 }}
                        >
                          مشاركة
                        </Button>
                      </Box>
                    )}
                  </ListItem>
                )
              })}
              {uploadedObjects.length > 200 && (
                <ListItem sx={{ py: 0.75 }}>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    + {uploadedObjects.length - 200} المزيد...
                  </Typography>
                </ListItem>
              )}
            </List>
            {!publicBase && (
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
                لتفعيل زر (فتح)، اضف قيمة `VITE_R2_PUBLIC_BASE_URL` في `frontend/.env.local`.
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.9 }}>
            داخل: {prefixToDisplayName(explorerPrefix)}
          </Typography>

          {loadingExplorer ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                جارٍ التحميل...
              </Typography>
            </Box>
          ) : (
            <>
              {foldersHere.length === 0 && filesHere.length === 0 ? (
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  لا يوجد شيء هنا (0).
                </Typography>
              ) : (
                <>
                  {foldersHere.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ opacity: 0.75, mb: 0.5 }}>
                        المجلدات
                      </Typography>
                      <List dense sx={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
                        {foldersHere.map((p) => {
                          const cleaned = p.endsWith('/') ? p.slice(0, -1) : p
                          const rel = cleaned.startsWith(`${ROOT_PREFIX}/`)
                            ? cleaned.slice(`${ROOT_PREFIX}/`.length)
                            : cleaned === ROOT_PREFIX
                              ? ''
                              : cleaned
                          const name = rel.split('/').filter(Boolean).pop() || cleaned
                          return (
                            <ListItem key={p}>
                              <Button
                                variant="text"
                                onClick={() => setCurrentPath(rel)}
                                sx={{ borderRadius: 999 }}
                              >
                                {name}
                              </Button>
                            </ListItem>
                          )
                        })}
                      </List>
                    </Box>
                  )}

                  {filesHere.length > 0 && (
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.75, mb: 0.5 }}>
                        الملفات
                      </Typography>
                      <List
                        dense
                        sx={{
                          maxHeight: 320,
                          overflow: 'auto',
                          borderRadius: 2,
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {filesHere.slice(0, 200).map((obj) => {
                          const url = keyToPublicUrl(obj.key)
                          const dl = keyToDownloadUrl(obj.key)
                          return (
                            <ListItem
                              key={obj.key}
                              sx={{
                                py: 0.75,
                                alignItems: 'flex-start',
                                gap: 1,
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Typography variant="body2" sx={{ wordBreak: 'break-word', opacity: 0.92 }}>
                                    {obj.key}
                                  </Typography>
                                }
                                secondary={obj.size ? `الحجم: ${fmtBytes(obj.size)}` : undefined}
                              />
                              {url && (
                                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, flexWrap: 'wrap' }}>
                                  <Button
                                    size="small"
                                    variant="text"
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    sx={{ borderRadius: 999 }}
                                  >
                                    فتح
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="text"
                                    href={dl || url}
                                    download={dl ? undefined : filenameFromKey(obj.key)}
                                    sx={{ borderRadius: 999 }}
                                  >
                                    تنزيل
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => void shareOrCopy(url)}
                                    sx={{ borderRadius: 999 }}
                                  >
                                    مشاركة
                                  </Button>
                                </Box>
                              )}
                            </ListItem>
                          )
                        })}
                      </List>
                    </Box>
                  )}
                </>
              )}
            </>
          )}

          {!publicBase && (
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
              لتفعيل زر (فتح)، اضف قيمة `VITE_R2_PUBLIC_BASE_URL` في `frontend/.env.local`.
            </Typography>
          )}
        </Box>
      </Container>
    </Box>
  )
}

