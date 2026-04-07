import {
  Box,
  Typography,
  Divider,
  Button,
} from '@mui/material'
import { Forum as ForumIcon } from '@mui/icons-material'
import { MessageSkeleton } from '../SkeletonLoaders'
import MessageItem from './MessageItem'
import { useChatContext } from '../../contexts/ChatContext'
import { VideocameraAdd } from '@solar-icons/react'

export default function MessageList() {
  const {
    messages,
    loadingMessages,
    selectedConversation,
    usersById,
    isGeneralDiscussionSelected,
    openGeneralMeeting,
    openDirectConversation,
    getConversationLabel,
    getMentionHref,
    user,
  } = useChatContext()

  if (!selectedConversation) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 1 }}>
        <ForumIcon sx={{ fontSize: 40, opacity: 0.5 }} />
        <Typography variant="body1" sx={{ opacity: 0.7 }}>
          اختر محادثة من القائمة
        </Typography>
      </Box>
    )
  }

  return (
    <>
      <Box sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {getConversationLabel(selectedConversation)}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {selectedConversation.type === 'group' ? 'مناقشة جماعية' : 'محادثة فردية'}
          </Typography>
        </Box>

        {isGeneralDiscussionSelected && (
          <Button sx={{ px: 0 }} variant="contained" endIcon={<VideocameraAdd size={24} />} onClick={openGeneralMeeting}>
            <span className='hidden sm:inline me-3'>اجتماع مباشر</span>
          </Button>
        )}
      </Box>

      <Divider sx={{ mb: 1 }} />

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1,
          py: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        {loadingMessages && messages.length === 0 ? (
          <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <MessageSkeleton isMine={false} />
            <MessageSkeleton isMine={true} />
            <MessageSkeleton isMine={false} />
            <MessageSkeleton isMine={true} />
            <MessageSkeleton isMine={false} />
          </Box>
        ) : messages.length === 0 ? (
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            ابدأ أول رسالة في هذه المحادثة.
          </Typography>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === user?.id
            const sender = usersById.get(message.senderId)

            return (
              <MessageItem
                key={message.id}
                message={message}
                isMine={isMine}
                sender={sender}
                isGeneralDiscussionSelected={isGeneralDiscussionSelected}
                usersById={usersById}
                onOpenDirectConversation={openDirectConversation}
                getMentionHref={getMentionHref}
              />
            )
          })
        )}
      </Box>
    </>
  )
}
