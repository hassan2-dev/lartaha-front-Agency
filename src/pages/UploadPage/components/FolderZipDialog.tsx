import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogContent,
  DialogActions,
  alpha,
} from '@mui/material'
import FolderIcon from '@mui/icons-material/Folder'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import SpeedIcon from '@mui/icons-material/Speed'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { ArchiveDownMinimalistic } from '@solar-icons/react'
import { keyframes } from '@mui/system'
import { useState } from 'react'
import { fmtDuration } from './utils'

type FolderZipProgress = {
  folderPath: string
  folderName: string
  elapsedSeconds: number
  phase: 'preparing' | 'downloading' | 'zipping'
  serverMessage?: string
  filesDone?: number
  filesTotal?: number
  currentFile?: string
}

export function FolderZipDialog({
  folderZipProgress,
  folderZipDisplayElapsed,
  onCancel,
}: {
  folderZipProgress: FolderZipProgress | null
  folderZipDisplayElapsed: number
  onCancel: () => void
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <Dialog
      open={folderZipProgress !== null}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
          backgroundColor: theme =>
            theme.palette.mode === 'dark' ? '#0f1115' : '#ffffff',
          backgroundImage: 'none',
          boxShadow: theme =>
            theme.palette.mode === 'dark'
              ? '0 24px 64px rgba(0,0,0,0.6)'
              : '0 24px 64px rgba(0,0,0,0.12)',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{
            height: 4,
            background: theme =>
              `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          }}
        />

        <Box sx={{ p: 4, pt: 3.5, textAlign: 'center' }}>
          {/* Animated icon */}
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '24px',
              mx: 'auto',
              mb: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              background: theme =>
                `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
              border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <Box
              sx={{
                animation: `${keyframes`
                  0% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(1.15); opacity: 0.7; }
                  100% { transform: scale(1); opacity: 1; }
                `} 2s ease-in-out infinite`,
              }}
            >
              <Box sx={{ color: 'primary.main', display: 'inline-flex' }}>
                <ArchiveDownMinimalistic size={32} />
              </Box>
            </Box>
          </Box>

          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontSize: '1.15rem', mb: 0.5, letterSpacing: '-0.01em' }}
          >
            تحضير تنزيل المجلد
          </Typography>

          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              mt: 1,
              mb: 3,
              px: 2,
              py: 0.6,
              borderRadius: 2,
              backgroundColor: theme =>
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              border: theme => `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              maxWidth: '100%',
            }}
          >
            <FolderIcon sx={{ fontSize: 18, color: 'primary.main', flexShrink: 0 }} />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                direction: 'ltr',
                textAlign: 'right',
                wordBreak: 'break-word',
                fontSize: '0.85rem',
              }}
            >
              {folderZipProgress?.folderName}
            </Typography>
          </Box>

          {/* Phase pills */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            {(
              [
                { key: 'preparing', label: 'جمع الملفات' },
                { key: 'downloading', label: 'التنزيل' },
                { key: 'zipping', label: 'الضغط' },
              ] as const
            ).map((step, idx) => {
              const phases = ['preparing', 'downloading', 'zipping'] as const
              const currentIdx = phases.indexOf(folderZipProgress?.phase || 'preparing')
              const isActive = idx === currentIdx
              const isDone = idx < currentIdx
              return (
                <Box
                  key={step.key}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                    backgroundColor: isActive
                      ? theme => alpha(theme.palette.primary.main, 0.12)
                      : isDone
                        ? theme => alpha(theme.palette.success.main, 0.1)
                        : theme =>
                          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    color: isActive ? 'primary.main' : isDone ? 'success.main' : 'text.disabled',
                    border: theme =>
                      `1px solid ${isActive
                        ? alpha(theme.palette.primary.main, 0.3)
                        : isDone
                          ? alpha(theme.palette.success.main, 0.25)
                          : alpha(theme.palette.divider, 0.3)
                      }`,
                  }}
                >
                  {isDone ? (
                    <CheckIcon sx={{ fontSize: 14 }} />
                  ) : isActive ? (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: 'primary.main',
                        animation: `${keyframes`
                          0% { opacity: 1; transform: scale(1); }
                          50% { opacity: 0.4; transform: scale(1.4); }
                          100% { opacity: 1; transform: scale(1); }
                        `} 1.4s ease-in-out infinite`,
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: 'text.disabled',
                        opacity: 0.4,
                      }}
                    />
                  )}
                  {step.label}
                </Box>
              )
            })}
          </Box>

          {/* Progress bar */}
          <Box
            sx={{
              height: 8,
              borderRadius: 4,
              overflow: 'hidden',
              backgroundColor: theme =>
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              mb: 1.5,
              position: 'relative',
            }}
          >
            <Box
              sx={{
                height: '100%',
                borderRadius: 4,
                background: theme =>
                  `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                width: folderZipProgress?.filesTotal
                  ? `${Math.round(((folderZipProgress.filesDone ?? 0) / folderZipProgress.filesTotal) * 100)}%`
                  : folderZipProgress && folderZipProgress.elapsedSeconds > 0
                    ? '40%'
                    : '0%',
                ...(folderZipProgress && !folderZipProgress.filesTotal && folderZipProgress.elapsedSeconds > 0
                  ? {
                    animation: `${keyframes`
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(250%); }
                      `} 1.2s ease-in-out infinite`,
                  }
                  : {}),
              }}
            />
          </Box>

          {/* File count + percent row */}
          {folderZipProgress?.filesTotal != null && (
            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.75rem' }}>
                {folderZipProgress.filesDone ?? 0} / {folderZipProgress.filesTotal} ملف
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(((folderZipProgress.filesDone ?? 0) / folderZipProgress.filesTotal) * 100)}%
              </Typography>
            </Box>
          )}

          {/* Stat chips */}
          {(() => {
            const elapsed = folderZipDisplayElapsed
            const done = folderZipProgress?.filesDone ?? 0
            const total = folderZipProgress?.filesTotal ?? 0
            const hasFileCounts = total > 0
            const speed = elapsed > 0 && done > 0 ? done / elapsed : 0
            const remaining = speed > 0 && total > 0 ? (total - done) / speed : null
            return (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
                <Box
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.75,
                    px: 1.5, py: 0.6, borderRadius: 2,
                    backgroundColor: theme =>
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    border: theme => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                  }}
                >
                  <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: 'text.secondary' }}>
                    {fmtDuration(elapsed)}
                  </Typography>
                </Box>

                {hasFileCounts && (
                  <Box
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 0.75,
                      px: 1.5, py: 0.6, borderRadius: 2,
                      backgroundColor: theme =>
                        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: theme => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                    }}
                  >
                    <SpeedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: 'text.secondary' }}>
                      {speed >= 1
                        ? `${speed.toFixed(1)} ملف/ث`
                        : speed > 0
                          ? `${(speed * 60).toFixed(1)} ملف/د`
                          : 'جاري البدء...'}
                    </Typography>
                  </Box>
                )}

                {hasFileCounts && remaining != null && (
                  <Box
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 0.75,
                      px: 1.5, py: 0.6, borderRadius: 2,
                      backgroundColor: theme =>
                        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: theme => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                    }}
                  >
                    <HourglassEmptyIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: 'text.secondary' }}>
                      ~{fmtDuration(remaining)} متبقي
                    </Typography>
                  </Box>
                )}
              </Box>
            )
          })()}

          {/* Details toggle */}
          <Button
            size="small"
            onClick={() => setDetailsOpen(v => !v)}
            endIcon={detailsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.8rem',
              color: 'text.secondary',
              mb: detailsOpen ? 1.5 : 0,
              borderRadius: 2,
              px: 1.5,
            }}
          >
            {detailsOpen ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </Button>

          {/* Expandable details */}
          {detailsOpen && (
            <Box
              sx={{
                textAlign: 'right',
                p: 2,
                borderRadius: 2,
                backgroundColor: theme =>
                  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: theme => `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                mb: 2,
              }}
            >
              <Typography variant="caption" sx={{ display: 'block', mb: 0.75, fontWeight: 500, color: 'text.primary' }}>
                الحالة:
                <Box component="span" sx={{ color: 'text.secondary', mr: 0.5 }}>
                  {folderZipProgress?.phase === 'zipping'
                    ? 'جاري ضغط الملفات...'
                    : folderZipProgress?.phase === 'downloading'
                      ? folderZipProgress.filesTotal != null
                        ? `تنزيل الملفات ${folderZipProgress.filesDone ?? 0} / ${folderZipProgress.filesTotal}`
                        : 'جاري تنزيل الملفات...'
                      : 'جاري تجميع قائمة الملفات...'}
                </Box>
              </Typography>

              {folderZipProgress?.currentFile && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  <InsertDriveFileIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    title={folderZipProgress.currentFile}
                    sx={{ direction: 'ltr', textAlign: 'right', flex: 1 }}
                  >
                    {folderZipProgress.currentFile}
                  </Typography>
                </Box>
              )}

              {folderZipProgress?.serverMessage && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {folderZipProgress.serverMessage}
                </Typography>
              )}

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}
              >
                يشمل كل الملفات داخل المجلد والمجلدات الفرعية. لا تغلق الصفحة.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', gap: 1.5, px: 4, pb: 3, pt: 0 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          color="error"
          startIcon={<CloseIcon />}
          sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600, px: 3, py: 1 }}
        >
          إلغاء التنزيل
        </Button>
      </DialogActions>
    </Dialog>
  )
}
