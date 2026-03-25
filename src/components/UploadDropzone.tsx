import { useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'

export type SelectedUploadFile = {
  file: File
  relativePath: string
}

function toSelectedFiles(files: FileList | File[] | null | undefined): SelectedUploadFile[] {
  if (!files) return []
  const arr = Array.isArray(files) ? files : Array.from(files)
  return arr
    .filter(Boolean)
    .map((f) => {
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath
      return {
        file: f,
        // Keep the full relative path so the root folder name is preserved in storage keys.
        // Example from browser: "MyFolder/sub/a.png"
        relativePath: rel && rel.length > 0 ? rel : f.name,
      }
    })
}

function fmtBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

export default function UploadDropzone({
  files,
  onFilesChange,
  uploading,
  uploadProgress,
  error,
}: {
  files: SelectedUploadFile[]
  onFilesChange: (next: SelectedUploadFile[]) => void
  uploading: boolean
  uploadProgress: number
  error: string | null
}) {
  const [dragOver, setDragOver] = useState(false)
  const [lastPickSource, setLastPickSource] = useState<'files' | 'folder' | 'drop' | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const folderInputRef = useRef<HTMLInputElement | null>(null)

  const totals = useMemo(() => {
    const totalBytes = files.reduce((sum, f) => sum + f.file.size, 0)
    return { totalBytes }
  }, [files])

  function onPickFiles(next: FileList | File[], source: 'files' | 'folder' | 'drop') {
    const selected = toSelectedFiles(next)
    // Dedupe by relativePath + size (good enough for upload UIs)
    const deduped = Array.from(
      new Map(selected.map((sf) => [`${sf.relativePath}_${sf.file.size}`, sf])).values()
    )
    setLastPickSource(source)
    onFilesChange(deduped)
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        borderColor: dragOver ? 'primary.main' : 'rgba(255,255,255,0.10)',
        background: (t) =>
          `linear-gradient(135deg, ${t.palette.primary.main}14, transparent 55%)`,
        transition: 'border-color 150ms ease',
      }}
      onDragEnter={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        if (e.dataTransfer.files?.length) {
          onPickFiles(e.dataTransfer.files, 'drop')
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <CloudUploadIcon color="primary" />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            اسحب الملفات هنا، أو اختر من جهازك
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            رفع المجلد يحافظ على المسارات النسبية (عندما يدعم المتصفح ذلك).
          </Typography>
        </Box>
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => onPickFiles(e.target.files ? Array.from(e.target.files) : [], 'files')}
      />

      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error: webkitdirectory is non-standard but supported in Chromium/WebKit browsers.
        webkitdirectory="true"
        style={{ display: 'none' }}
        onChange={(e) =>
          onPickFiles(e.target.files ? Array.from(e.target.files) : [], 'folder')
        }
      />

      <Box sx={{ display: 'flex', gap: 1.5, mt: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          startIcon={<InsertDriveFileIcon />}
          sx={{ borderRadius: 999 }}
        >
          اختر ملفات
        </Button>
        <Button
          variant="outlined"
          onClick={() => folderInputRef.current?.click()}
          disabled={uploading}
          startIcon={<FolderOpenIcon />}
          sx={{ borderRadius: 999, borderColor: 'rgba(255,255,255,0.18)' }}
        >
          اختر مجلد
        </Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
          {files.length} عنصر · {fmtBytes(totals.totalBytes)}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {uploading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={uploadProgress}
            sx={{ height: 10, borderRadius: 999 }}
          />
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.75 }}>
            جارٍ الرفع... {uploadProgress}%
          </Typography>
        </Box>
      )}

      {files.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.8 }}>
            العناصر المحددة
          </Typography>
          {lastPickSource === 'folder' &&
            files.length > 0 &&
            files.every((f) => !f.relativePath.includes('/')) && (
              <Alert severity="info" sx={{ mb: 1 }}>
                ملاحظة: متصفحك غالباً ما وفر مسار المجلد (relativePath) بدون أسماء الفروع. جرّب
                `اختر مجلد` من Chrome/Edge (مو السحب والإفلات).
              </Alert>
            )}
          <List
            dense
            sx={{
              maxHeight: 220,
              overflow: 'auto',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {files.slice(0, 80).map((sf) => (
              <ListItem key={`${sf.relativePath}_${sf.file.size}`} sx={{ py: 0.75 }}>
                <Typography variant="body2" sx={{ wordBreak: 'break-word', opacity: 0.92 }}>
                  {sf.relativePath}
                </Typography>
              </ListItem>
            ))}
            {files.length > 80 && (
              <ListItem sx={{ py: 0.75 }}>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  + {files.length - 80} المزيد…
                </Typography>
              </ListItem>
            )}
          </List>
        </>
      )}

      {dragOver && (
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
          اترك لإضافة الملفات
        </Typography>
      )}
    </Paper>
  )
}

