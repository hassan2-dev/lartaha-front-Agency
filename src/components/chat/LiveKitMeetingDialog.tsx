import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from '@livekit/components-react'
import '@livekit/components-styles'
import { createConversationLivekitSession, type ChatLivekitSession } from '../../api/chatApi'

interface LiveKitMeetingDialogProps {
  open: boolean
  conversationId: string | null
  conversationLabel: string
  onClose: () => void
}

export default function LiveKitMeetingDialog({
  open,
  conversationId,
  conversationLabel,
  onClose,
}: LiveKitMeetingDialogProps) {
  const [session, setSession] = useState<ChatLivekitSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  const loadSession = useCallback(async () => {
    if (!conversationId) return

    setLoading(true)
    setError(null)

    try {
      const next = await createConversationLivekitSession(conversationId)
      if (!next.token || !next.url || !next.roomName) {
        throw new Error('Invalid LiveKit session response')
      }
      setSession(next)
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setSession(null)
      setError(err.response?.data?.message ?? err.message ?? 'فشل تجهيز جلسة الاجتماع')
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    if (!open || !conversationId) {
      setSession(null)
      setError(null)
      return
    }

    void loadSession()
  }, [open, conversationId, loadSession, refreshIndex])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>
        اجتماع مباشر · {conversationLabel}
      </DialogTitle>
      <DialogContent sx={{ minHeight: 360 }}>
        {!conversationId ? (
          <Alert severity="warning">اختر محادثة صالحة لبدء الاجتماع.</Alert>
        ) : loading ? (
          <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ py: 2 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Button variant="contained" onClick={() => setRefreshIndex((prev) => prev + 1)}>
              إعادة المحاولة
            </Button>
          </Box>
        ) : session ? (
          <Box
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
              height: { xs: 420, md: 620 },
            }}
          >
            <LiveKitRoom
              token={session.token}
              serverUrl={session.url}
              connect
              video
              audio
              data-lk-theme="default"
            >
              <VideoConference />
              <RoomAudioRenderer />
            </LiveKitRoom>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            جارٍ تجهيز الاجتماع...
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  )
}
