/**
 * DownloadProgressDialog Component
 * Shows download progress with pause/resume/cancel controls
 */

import { useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  LinearProgress,
  Tooltip,
  Button,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import MinimizeIcon from '@mui/icons-material/Minimize'
import DownloadIcon from '@mui/icons-material/Download'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import ReplayIcon from '@mui/icons-material/Replay'
import { useTheme } from '@mui/material/styles'
import { useDownload } from '../../contexts/DownloadContext'
import { fmtBytes, formatSpeed, formatTime } from './utils/fileUtils'

const MAX_DOWNLOAD_RETRIES = 3

export function DownloadProgressDialog() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const {
    downloads,
    updateDownload,
    removeDownload,
    clearCompleted,
    abortControllers,
    isMinimized,
    setIsMinimized,
    showDialog,
    setShowDialog,
  } = useDownload()

  const list = Array.from(downloads.values())
  const activeList = list.filter(
    d =>
      d.status === 'downloading' ||
      d.status === 'decrypting' ||
      d.status === 'pending' ||
      d.status === 'paused'
  )
  const completedList = list.filter(d => d.status === 'completed')
  const failedList = list.filter(d => d.status === 'failed' || d.status === 'cancelled')
  const allDone =
    list.length > 0 &&
    list.every(
      d =>
        d.status !== 'downloading' &&
        d.status !== 'decrypting' &&
        d.status !== 'pending' &&
        d.status !== 'paused'
    )

  const overallProgress =
    list.length > 0 ? Math.round(list.reduce((sum, d) => sum + d.progress, 0) / list.length) : 0

  const handleCancel = useCallback(
    (key: string) => {
      const ac = abortControllers.current.get(key)
      if (ac) {
        ac.abort()
        abortControllers.current.delete(key)
      }
      updateDownload(key, { status: 'cancelled', error: 'تم الإلغاء' })
    },
    [abortControllers, updateDownload]
  )

  const handlePauseResume = useCallback(
    (key: string, current: (typeof list)[0]) => {
      if (current.status === 'paused') {
        // Resume: re-trigger
        const [s3Key, ...filenameParts] = current.key.split(':')
        const filename = filenameParts.join(':')
        window.dispatchEvent(
          new CustomEvent('retry-download', {
            detail: { key: s3Key, filename },
          })
        )
      } else {
        // Pause: abort
        const ac = abortControllers.current.get(key)
        if (ac) ac.abort()
      }
    },
    [abortControllers]
  )

  const handleRetry = useCallback(
    (key: string) => {
      const d = downloads.get(key)
      if (!d) return
      removeDownload(key)
      window.dispatchEvent(
        new CustomEvent('retry-download', {
          detail: { key: d.key, filename: d.filename },
        })
      )
    },
    [downloads, removeDownload]
  )

  if (!showDialog || list.length === 0) return null

  return (
    <Dialog
      open={!isMinimized}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      onClose={() => setIsMinimized(true)}
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: t =>
            `linear-gradient(145deg, ${t.palette.background.paper} 0%, ${t.palette.background.default} 100%)`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        },
      }}
    >
      {/* Gradient header */}
      <Box
        sx={{
          background: t =>
            `linear-gradient(135deg, ${t.palette.info.dark} 0%, ${t.palette.info.main} 100%)`,
          p: 3,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }}
        />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2.5,
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <DownloadIcon sx={{ fontSize: 28, color: 'white' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mb: 0.5 }}>
              {allDone ? 'اكتملت التنزيلات!' : 'جاري التنزيل'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              {completedList.length} من {list.length} ملفات اكتملت
            </Typography>
          </Box>
          <IconButton
            onClick={() => setIsMinimized(true)}
            sx={{
              color: 'white',
              opacity: 0.8,
              '&:hover': { opacity: 1, background: 'rgba(255,255,255,0.1)' },
            }}
          >
            <MinimizeIcon />
          </IconButton>
          <IconButton
            onClick={() => {
              clearCompleted()
              if (
                list.every(
                  d => d.status === 'completed' || d.status === 'failed' || d.status === 'cancelled'
                )
              ) {
                setShowDialog(false)
              } else {
                setIsMinimized(true)
              }
            }}
            sx={{
              color: 'white',
              opacity: 0.8,
              '&:hover': { opacity: 1, background: 'rgba(255,255,255,0.1)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* Overall progress */}
        {!allDone && (
          <Box
            sx={{
              mb: 3,
              p: 2.5,
              borderRadius: 2,
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: t => `1px solid ${t.palette.divider}`,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500, opacity: 0.9 }}>
                التقدم الإجمالي
              </Typography>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: 'info.main', fontSize: '1.5rem' }}
              >
                {overallProgress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={overallProgress}
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 5,
                  background: t =>
                    `linear-gradient(90deg, ${t.palette.info.main} 0%, ${t.palette.info.light} 100%)`,
                },
              }}
            />
          </Box>
        )}

        {/* All done success banner */}
        {allDone && (
          <Box
            sx={{
              mb: 3,
              p: 3,
              borderRadius: 2,
              background: isDark ? 'rgba(76,175,80,0.15)' : 'rgba(76,175,80,0.1)',
              border: t => `1px solid ${t.palette.success.main}`,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <Typography sx={{ color: 'white', fontSize: 28, fontWeight: 700 }}>✓</Typography>
            </Box>
            <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 700 }}>
              اكتملت جميع التنزيلات!
            </Typography>
          </Box>
        )}

        {/* Active / paused downloads */}
        <Box
          sx={{
            maxHeight: 320,
            overflow: 'auto',
            borderRadius: 2,
            border: t => `1px solid ${t.palette.divider}`,
          }}
        >
          {activeList.map((download, idx) => {
            const remaining =
              download.speed > 0
                ? (download.totalBytes - download.bytesDownloaded) / download.speed
                : 0
            const eta = download.progress < 100 && download.speed > 0 ? formatTime(remaining) : ''
            const isDecrypting = download.status === 'decrypting'
            const isPaused = download.status === 'paused'

            return (
              <Box
                key={download.key}
                sx={{
                  p: 2,
                  borderBottom:
                    idx < activeList.length - 1 ? t => `1px solid ${t.palette.divider}` : 'none',
                  background: isPaused
                    ? isDark
                      ? 'rgba(255,152,0,0.06)'
                      : 'rgba(255,152,0,0.04)'
                    : 'transparent',
                  transition: 'background-color 0.2s',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    mb: 1.5,
                  }}
                >
                  {/* Icon */}
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: isPaused
                        ? 'rgba(255,152,0,0.15)'
                        : t => `${t.palette.info.main}15`,
                    }}
                  >
                    {isPaused ? (
                      <PauseIcon sx={{ fontSize: 20, color: 'warning.main' }} />
                    ) : (
                      <DownloadIcon sx={{ fontSize: 20, color: 'info.main' }} />
                    )}
                  </Box>

                  {/* Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        mb: 0.5,
                        wordBreak: 'break-word',
                        lineHeight: 1.4,
                      }}
                    >
                      {download.filename}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        flexWrap: 'wrap',
                      }}
                    >
                      {download.totalBytes > 0 && (
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>
                          {fmtBytes(download.bytesDownloaded)} / {fmtBytes(download.totalBytes)}
                        </Typography>
                      )}
                      {!isDecrypting && download.speed > 0 && (
                        <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 500 }}>
                          {formatSpeed(download.speed)}
                        </Typography>
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: isPaused
                            ? 'warning.main'
                            : isDecrypting
                              ? 'secondary.main'
                              : 'info.main',
                        }}
                      >
                        {isPaused
                          ? 'متوقف'
                          : isDecrypting
                            ? `فك تشفير ${download.decryptionProgress ?? download.progress}%`
                            : `${download.progress}%`}
                      </Typography>
                      {eta && !isPaused && (
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>
                          المتبقي: {eta}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Controls */}
                  {!isDecrypting && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      <Tooltip title={isPaused ? 'استئناف' : 'إيقاف مؤقت'}>
                        <IconButton
                          size="small"
                          onClick={() => handlePauseResume(download.key, download)}
                          sx={{
                            width: 32,
                            height: 32,
                            color: isPaused ? 'success.main' : 'warning.main',
                            backgroundColor: isPaused
                              ? 'rgba(76,175,80,0.12)'
                              : 'rgba(255,152,0,0.12)',
                            '&:hover': {
                              backgroundColor: isPaused
                                ? 'rgba(76,175,80,0.22)'
                                : 'rgba(255,152,0,0.22)',
                            },
                          }}
                        >
                          {isPaused ? (
                            <PlayArrowIcon sx={{ fontSize: 18 }} />
                          ) : (
                            <PauseIcon sx={{ fontSize: 18 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="إلغاء">
                        <IconButton
                          size="small"
                          onClick={() => handleCancel(download.key)}
                          sx={{
                            width: 32,
                            height: 32,
                            color: 'error.main',
                            backgroundColor: 'rgba(244,67,54,0.12)',
                            '&:hover': {
                              backgroundColor: 'rgba(244,67,54,0.22)',
                            },
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </Box>

                {/* Progress bar */}
                <Box sx={{ ml: 7 }}>
                  <LinearProgress
                    variant="determinate"
                    value={
                      isDecrypting
                        ? (download.decryptionProgress ?? download.progress)
                        : download.progress
                    }
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        background: isPaused
                          ? t =>
                              `linear-gradient(90deg, ${t.palette.warning.main} 0%, ${t.palette.warning.light} 100%)`
                          : isDecrypting
                            ? t =>
                                `linear-gradient(90deg, ${t.palette.secondary.main} 0%, ${t.palette.secondary.light} 100%)`
                            : t =>
                                `linear-gradient(90deg, ${t.palette.info.main} 0%, ${t.palette.info.light} 100%)`,
                      },
                    }}
                  />
                </Box>
              </Box>
            )
          })}

          {/* Completed */}
          {completedList.map(download => (
            <Box
              key={download.key}
              sx={{
                p: 2,
                background: isDark ? 'rgba(76,175,80,0.08)' : 'rgba(76,175,80,0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderBottom: t => `1px solid ${t.palette.divider}`,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: 'rgba(76,175,80,0.15)',
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
                  {download.filename}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.6 }}>
                  اكتمل • {download.totalBytes > 0 ? fmtBytes(download.totalBytes) : ''}
                  {download.speed > 0 ? ` • ${formatSpeed(download.speed)}` : ''}
                </Typography>
              </Box>
              <Tooltip title="إزالة">
                <IconButton
                  size="small"
                  onClick={() => removeDownload(download.key)}
                  sx={{ color: 'text.secondary' }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}

          {/* Failed / cancelled */}
          {failedList.map(download => (
            <Box
              key={download.key}
              sx={{
                p: 2,
                background: isDark ? 'rgba(244,67,54,0.08)' : 'rgba(244,67,54,0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderBottom: t => `1px solid ${t.palette.divider}`,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: 'rgba(244,67,54,0.15)',
                }}
              >
                <ErrorOutlineIcon sx={{ fontSize: 20, color: 'error.main' }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
                  {download.filename}
                </Typography>
                <Typography variant="caption" sx={{ color: 'error.main', opacity: 0.9 }}>
                  {download.error || 'فشل التنزيل'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {download.status !== 'cancelled' &&
                  (download.retries || 0) < MAX_DOWNLOAD_RETRIES && (
                    <Tooltip title="إعادة المحاولة">
                      <IconButton
                        size="small"
                        onClick={() => handleRetry(download.key)}
                        sx={{ color: 'warning.main' }}
                      >
                        <ReplayIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                <Tooltip title="إزالة">
                  <IconButton
                    size="small"
                    onClick={() => removeDownload(download.key)}
                    sx={{ color: 'text.secondary' }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>

      {allDone && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              clearCompleted()
              setShowDialog(false)
            }}
            variant="contained"
            color="info"
            sx={{ borderRadius: 999 }}
          >
            إغلاق
          </Button>
        </DialogActions>
      )}
    </Dialog>
  )
}
