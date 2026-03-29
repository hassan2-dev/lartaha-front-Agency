import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  Divider,
  List,
  ListItem,
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
      // For folder uploads, webkitRelativePath should contain the full path including folder name
      // Example: "MyFolder/subfolder/file.jpg"
      // If webkitRelativePath exists, use it; otherwise fall back to just filename
      const relativePath = rel && rel.length > 0 ? rel : f.name
      return {
        file: f,
        relativePath,
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
  error,
}: {
  files: SelectedUploadFile[]
  onFilesChange: (next: SelectedUploadFile[]) => void
  uploading: boolean
  error: string | null
}) {
  const [dragOver, setDragOver] = useState(false)
  const [pendingFolderFiles, setPendingFolderFiles] = useState<SelectedUploadFile[] | null>(null)
  const [pendingFolderName, setPendingFolderName] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const folderInputRef = useRef<HTMLInputElement | null>(null)

  async function toSelectedFilesFromDropWithPaths(dt: DataTransfer): Promise<SelectedUploadFile[]> {
    // Directory drag&drop (preserve folder paths) is not supported everywhere.
    // Chromium supports it via webkitGetAsEntry.
    const items = dt.items
    if (!items || items.length === 0) return []

    const anyItem = items[0] as unknown as { webkitGetAsEntry?: () => unknown }
    if (typeof anyItem.webkitGetAsEntry !== 'function') return []

    type AnyEntry = {
      isFile: boolean
      isDirectory: boolean
      fullPath?: string
      file?: (cb: (file: File) => void, err?: (e: unknown) => void) => void
      createReader?: () => {
        readEntries: (cb: (entries: AnyEntry[]) => void, err?: (e: unknown) => void) => void
      }
    }

    const readAllEntries = async (
      reader: {
        readEntries: (cb: (entries: AnyEntry[]) => void, err?: (e: unknown) => void) => void
      },
    ): Promise<AnyEntry[]> => {
      const all: AnyEntry[] = []
      while (true) {
        const chunk = await new Promise<AnyEntry[]>((resolve, reject) => {
          reader.readEntries(
            (entries: AnyEntry[]) => resolve(entries),
            (err: unknown) => reject(err)
          )
        })
        if (chunk.length === 0) break
        all.push(...chunk)
      }
      return all
    }

    const selected: SelectedUploadFile[] = []

    const traverse = async (entry: AnyEntry) => {
      if (entry.isFile && entry.file) {
        const file = await new Promise<File>((resolve, reject) => {
          entry.file!(
            (f) => resolve(f),
            (err) => reject(err)
          )
        })
        const relativePath = (entry.fullPath ?? '').replace(/^\/+/, '') || file.name
        selected.push({ file, relativePath })
        return
      }

      if (entry.isDirectory && entry.createReader) {
        const reader = entry.createReader()
        const entries = await readAllEntries(reader)
        await Promise.all(entries.map(traverse))
      }
    }

    const roots = Array.from(items)
      .map((it) => {
        const e = (it as unknown as { webkitGetAsEntry?: () => AnyEntry | null }).webkitGetAsEntry?.()
        return e
      })
      .filter(Boolean) as AnyEntry[]

    await Promise.all(roots.map(traverse))
    return selected
  }

  const totals = useMemo(() => {
    const totalBytes = files.reduce((sum, f) => sum + f.file.size, 0)
    return { totalBytes }
  }, [files])

  function onPickFiles(next: FileList | File[], source: 'files' | 'folder' | 'drop') {
    const selected = toSelectedFiles(next)

    // Dedupe by relativePath + size (good enough for upload UIs)
    const deduped = Array.from(new Map(selected.map((sf) => [`${sf.relativePath}_${sf.file.size}`, sf])).values())

    // For folder uploads, we should preserve the structure automatically if webkitRelativePath is available
    // Only show the folder name prompt if the browser doesn't support folder structure
    if (source === 'folder') {
      const hasAnyPath = deduped.some((sf) => sf.relativePath.includes('/'))

      if (!hasAnyPath) {
        // Browser didn't provide folder paths, ask user for folder name
        setPendingFolderFiles(deduped)
        setPendingFolderName('')
        onFilesChange([]) // keep parent state clean until user applies helper
        return
      }
    }

    setPendingFolderFiles(null)
    setPendingFolderName('')
    onFilesChange(deduped)
  }

  function applyPendingFolderName() {
    if (!pendingFolderFiles) return
    const root = pendingFolderName.trim().replace(/^\/+|\/+$/g, '')
    if (!root) return

    const transformed = pendingFolderFiles.map((sf) => ({
      ...sf,
      relativePath: `${root}/${sf.relativePath}`,
    }))

    const deduped = Array.from(new Map(transformed.map((sf) => [`${sf.relativePath}_${sf.file.size}`, sf])).values())
    setPendingFolderFiles(null)
    setPendingFolderName('')
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
        // Try preserve folder structure on directory drop (Chrome/Edge).
        void (async () => {
          const droppedWithPaths = await toSelectedFilesFromDropWithPaths(e.dataTransfer)
          if (droppedWithPaths.length > 0) {
            onFilesChange(droppedWithPaths)
            return
          }
          if (e.dataTransfer.files?.length) {
            onPickFiles(e.dataTransfer.files, 'drop')
          }
        })()
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
        webkitdirectory=""
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

      {files.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.8 }}>
            العناصر المحددة
          </Typography>
          {pendingFolderFiles && (
            <Alert severity="info" sx={{ mb: 1 }}>
              المتصفح ما وفّر مسار المجلد. حتى نسوي مجلد داخل `uploads/`، اكتب اسم المجلد:
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box sx={{ flex: '1 1 220px' }}>
                  <TextField
                    size="small"
                    label="اسم المجلد داخل uploads"
                    value={pendingFolderName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPendingFolderName(e.target.value)}
                    fullWidth
                  />
                </Box>
                <Button
                  variant="contained"
                  onClick={applyPendingFolderName}
                  disabled={pendingFolderName.trim().length === 0}
                  sx={{ borderRadius: 999 }}
                >
                  تطبيق
                </Button>
              </Box>
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

