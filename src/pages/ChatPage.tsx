import { Alert, Box, Paper, useTheme } from '@mui/material'
import LiveKitMeetingDialog from '../components/chat/LiveKitMeetingDialog'
import ConversationList from '../components/chat/ConversationList'
import MessageList from '../components/chat/MessageList'
import MessageComposer from '../components/chat/MessageComposer'
import MemberStories from '../components/chat/MemberStories'
import { ChatProvider, useChatContext } from '../contexts/ChatContext'
import meet from '../../public/meet.svg'

function ChatPageContent() {
  const {
    error,
    meetingOpen,
    isGeneralDiscussionSelected,
    selectedConversationId,
    selectedConversation,
    getConversationLabel,
    setMeetingOpen,
  } = useChatContext()

  const theme = useTheme()

  // AppBar Toolbar height (MUI default min-height)
  // Mobile: 56px toolbar + 64px bottom nav + 88px stories bar + 8px container py
  // Desktop: 64px toolbar + 0 bottom nav
  const MOBILE_APPBAR = 56
  const MOBILE_BOTTOM_NAV = 64
  const MOBILE_STORIES = 88  // MemberStories height on mobile
  const DESKTOP_APPBAR = 64

  return (
    <Box
      sx={{
        // Prevent the outer main scroll area from scrolling on this page
        // by making the chat fill exactly the remaining space
        display: 'flex',
        flexDirection: 'column',
        height: {
          xs: `calc(100dvh - ${MOBILE_APPBAR}px - ${MOBILE_BOTTOM_NAV}px)`,
          md: `calc(100dvh - ${DESKTOP_APPBAR}px)`,
        },
        px: { xs: 0, md: 2 },
        pb: { xs: 0, md: 1.5 },
        pt: { xs: 0, md: 1 },
        overflow: 'hidden',
        // Cancel out SideNav's paddingBottom on mobile so the outer container doesn't scroll
        mb: { xs: '-80px', md: 0 },
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 1, mx: { xs: 0.5, md: 0 } }}>
          {error}
        </Alert>
      )}

      {/* Mobile stories bar — rendered OUTSIDE the Paper so its height is tracked */}
      <MemberStories />

      <Paper
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '300px 1fr' },
          // Remaining height = total - stories bar on mobile
          flex: 1,
          minHeight: 0,
          borderRadius: { xs: 0, md: 2 },
          overflow: 'hidden',
          boxShadow: theme.shadows[2],
          // On mobile subtract stories height from the flex container
          maxHeight: {
            xs: `calc(100dvh - ${MOBILE_APPBAR}px - ${MOBILE_BOTTOM_NAV}px - ${MOBILE_STORIES}px)`,
            md: 'none',
          },
        }}
      >
        {/* Desktop sidebar */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            borderRight: '1px solid rgba(128,128,128,0.15)',
            overflow: 'hidden',
          }}
        >
          <ConversationList />
        </Box>

        {/* Message area */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {selectedConversationId ? (
            <>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', px: { xs: 0, md: 2 }, pt: { xs: 0, md: 1 } }}>
                <MessageList />
              </Box>

              <Box sx={{ px: { xs: 0.5, md: 2 }, pb: { xs: 0.5, md: 1.5 }, pt: 0.5 }}>
                <MessageComposer />
              </Box>
            </>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Box
                component="img"
                src={meet}
                alt="No chat selected"
                sx={{
                  maxWidth: '300px',
                  maxHeight: '300px',
                  opacity: 0.6,
                }}
              />
            </Box>
          )}
        </Box>
      </Paper>

      <LiveKitMeetingDialog
        open={meetingOpen}
        conversationId={isGeneralDiscussionSelected ? selectedConversationId : null}
        conversationLabel={
          selectedConversation ? getConversationLabel(selectedConversation) : 'General Discussion'
        }
        onClose={() => setMeetingOpen(false)}
      />
    </Box>
  )
}

export default function ChatPage() {
  return (
    <ChatProvider>
      <ChatPageContent />
    </ChatProvider>
  )
}
