import {
  Avatar,
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material'
import { ConversationItemSkeleton } from '../SkeletonLoaders'
import { useChatContext } from '../../contexts/ChatContext'

export default function ConversationList() {
  const {
    conversations,
    selectedConversationId,
    bootstrap,
    loadingConversations,
    openGeneralDiscussion,
    openDirectConversation,
    user,
  } = useChatContext()

  const selectedConversation = conversations.find((conv) => conv.id === selectedConversationId)
  const memberList = bootstrap.users.filter((candidate) => candidate.id !== user?.id)

  return (
    <Box sx={{ borderLeft: { md: '1px solid rgba(255,255,255,0.08)' }, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          المحادثات
        </Typography>
      </Box>

      <Typography variant="caption" sx={{ opacity: 0.65, mb: 1, display: 'block' }}>
        المناقشات
      </Typography>

      <List sx={{ p: 0, mb: 1.5 }}>
        <ListItemButton
          selected={selectedConversation?.type === 'group' && (selectedConversation.title || '').toLowerCase() === 'general discussion'}
          onClick={() => openGeneralDiscussion()}
          sx={{ borderRadius: 2, mb: 0.75 }}
        >
          <ListItemText primary="نقاش جماعي للجميع" secondary="General Discussion" />
        </ListItemButton>
      </List>

      <Divider sx={{ mb: 1.5 }} />

      <Typography variant="caption" sx={{ opacity: 0.65, mb: 1, display: 'block' }}>
        الأعضاء
      </Typography>

      {loadingConversations && memberList.length === 0 ? (
        <Box sx={{ py: 2 }}>
          <ConversationItemSkeleton />
          <ConversationItemSkeleton />
          <ConversationItemSkeleton />
          <ConversationItemSkeleton />
          <ConversationItemSkeleton />
        </Box>
      ) : memberList.length === 0 ? (
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          لا يوجد أعضاء متاحون.
        </Typography>
      ) : (
        <List sx={{ p: 0 }}>
          {memberList.map((member) => {
            const memberDirectConversation = conversations.find(
              (conversation) =>
                conversation.type === 'direct' &&
                conversation.participantIds.includes(member.id) &&
                conversation.participantIds.includes(user?.id || '')
            )
            const memberOnline = Boolean(member.isOnline)

            return (
              <ListItemButton
                key={member.id}
                selected={memberDirectConversation?.id === selectedConversationId}
                onClick={() => openDirectConversation(member.id)}
                sx={{ borderRadius: 2, mb: 0.75 }}
              >
                <Avatar src={member.avatar || undefined} sx={{ width: 28, height: 28, mr: 1.25, fontSize: 12 }}>
                  {(member.name || 'U').charAt(0).toUpperCase()}
                </Avatar>
                <ListItemText
                  primary={member.name}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: memberOnline ? '#22c55e' : 'rgba(148,163,184,0.9)',
                        }}
                      />
                      <Typography component="span" variant="caption" sx={{ opacity: 0.9 }}>
                        {memberOnline ? 'متصل' : 'غير متصل'}
                      </Typography>
                    </Box>
                  }
                />
              </ListItemButton>
            )
          })}
        </List>
      )}
    </Box>
  )
}
