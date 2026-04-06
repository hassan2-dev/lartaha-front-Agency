import {
  Alert,
  Box,
  Container,
  Paper,
} from '@mui/material'
import LiveKitMeetingDialog from '../components/chat/LiveKitMeetingDialog'
import ConversationList from '../components/chat/ConversationList'
import MessageList from '../components/chat/MessageList'
import MessageComposer from '../components/chat/MessageComposer'
import { ChatProvider, useChatContext } from '../contexts/ChatContext'

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

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
          minHeight: 'calc(100vh - 170px)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <ConversationList />

        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <MessageList />
          <MessageComposer />
        </Box>
      </Paper>

      <LiveKitMeetingDialog
        open={meetingOpen}
        conversationId={isGeneralDiscussionSelected ? selectedConversationId : null}
        conversationLabel={selectedConversation ? getConversationLabel(selectedConversation) : 'General Discussion'}
        onClose={() => setMeetingOpen(false)}
      />
    </Container>
  )
}

export default function ChatPage() {
  return (
    <ChatProvider>
      <ChatPageContent />
    </ChatProvider>
  )
}
