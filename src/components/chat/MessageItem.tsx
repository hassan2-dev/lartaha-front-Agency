import { linkifyText, extractLinks, getFileUrl, isImageAttachment } from '../../utils/chatUtils'
import type { ChatMessage, ChatMention, ChatUser } from '../../api/chatApi'
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Tooltip,
  Paper,
  Stack,
  Card,
  CardContent
} from '@mui/material'
import {
  Check,
  DoneAll,
  AttachFile,
  Person
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'

// Styled components for modern chat bubble
const ChatBubble = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isMine'
})<{ isMine: boolean }>(({ theme, isMine }) => ({
  padding: theme.spacing(2),
  borderRadius: 16,
  maxWidth: '78%',
  minWidth: 160,
  background: isMine
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : theme.palette.mode === 'dark'
      ? theme.palette.grey[800]
      : theme.palette.grey[100],
  color: isMine
    ? theme.palette.common.white
    : theme.palette.text.primary,
  border: isMine
    ? 'none'
    : `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[2],
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: theme.shadows[4],
  }
}))

const MessageTime = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  opacity: 0.7,
  marginTop: theme.spacing(0.5),
}))

const AttachmentCard = styled(Card)(({ theme }) => ({
  marginTop: theme.spacing(1),
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  }
}))

const MentionChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  }
}))

interface MessageItemProps {
  message: ChatMessage
  isMine: boolean
  sender: ChatUser | undefined
  isGeneralDiscussionSelected: boolean
  usersById: Map<string, ChatUser>
  onOpenDirectConversation: (memberId: string) => void
  getMentionHref: (mention: ChatMention) => string | null
  currentUserId?: string
  conversationParticipantIds?: string[]
}

function getReadStatusInfo(
  message: ChatMessage,
  currentUserId: string,
  conversationParticipantIds: string[]
) {
  if (!message.readBy || !currentUserId) return null

  // Get other participants (excluding current user and sender)
  const otherParticipants = conversationParticipantIds.filter(
    id => id !== currentUserId && id !== message.senderId
  )

  // Count how many other participants have read the message
  const readCount = otherParticipants.filter(id => message.readBy?.includes(id)).length
  const totalCount = otherParticipants.length

  if (totalCount === 0) return null

  return (
    <Stack direction="row" spacing={0.5}>
      {readCount === 0 ? (
        <Check sx={{ fontSize: 16, opacity: 0.5 }} />
      ) : readCount === totalCount ? (
        <>
          <DoneAll sx={{ fontSize: 16 }} />
          <DoneAll sx={{ fontSize: 16, ml: -1 }} />
        </>
      ) : (
        <>
          <DoneAll sx={{ fontSize: 16 }} />
          <DoneAll sx={{ fontSize: 16, ml: -1, opacity: 0.5 }} />
        </>
      )}
    </Stack>
  )
}

export default function MessageItem({
  message,
  isMine,
  sender,
  isGeneralDiscussionSelected,
  usersById,
  onOpenDirectConversation,
  getMentionHref,
  currentUserId,
  conversationParticipantIds = [],
}: MessageItemProps) {
  const linkPreviews = extractLinks(message.text || '')

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isMine ? 'flex-start' : 'flex-end',
        mb: 1
      }}
    >
      <ChatBubble isMine={isMine}>
        {isGeneralDiscussionSelected && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Avatar
              src={sender?.avatar || undefined}
              sx={{ width: 28, height: 28 }}
            >
              {sender?.name ? sender.name.charAt(0).toUpperCase() : 'U'}
            </Avatar>
            <Typography variant="caption" sx={{ fontWeight: 'bold', opacity: 0.85 }}>
              {sender?.name?.split(' ')[0] || 'مستخدم'}
            </Typography>
          </Box>
        )}

        {message.text && (
          <Typography
            variant="body2"
            sx={{
              wordBreak: 'break-word',
              mb: 0.5,
              lineHeight: 1.4
            }}
          >
            {linkifyText(message.text)}
          </Typography>
        )}

        {linkPreviews.length > 0 && (
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {linkPreviews.map((link) => (
              <Box
                key={`${message.id}_${link}`}
                component="a"
                href={link}
                target="_blank"
                rel="noreferrer"
                sx={{ textDecoration: 'none' }}
              >
                <AttachmentCard>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mb: 0.5 }}>
                      رابط
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        wordBreak: 'break-word',
                        color: isMine ? 'inherit' : 'text.secondary'
                      }}
                    >
                      {link}
                    </Typography>
                  </CardContent>
                </AttachmentCard>
              </Box>
            ))}
          </Stack>
        )}

        {Array.isArray(message.mentions) && message.mentions.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            {message.mentions.map((mention, idx) => {
              const key = `${message.id}_${mention.type}_${mention.id}_${idx}`

              if (mention.type === 'member') {
                const member = usersById.get(mention.id)
                const memberStatusText = member?.isOnline ? 'Online' : 'Offline'
                const memberPosition = member?.position || 'Team Member'

                return (
                  <Tooltip
                    key={key}
                    title={
                      <Box
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpenDirectConversation(mention.id)
                        }}
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          minWidth: 220
                        }}
                      >
                        <Avatar sx={{ width: 34, height: 34 }}>
                          {member?.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member?.name || mention.label || 'User'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <Person />
                          )}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {member?.name || mention.label}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.85, display: 'block' }}>
                            {memberPosition}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.85, display: 'block' }}>
                            {memberStatusText}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  >
                    <MentionChip
                      label={`@${mention.label}`}
                      size="small"
                      clickable
                    />
                  </Tooltip>
                )
              }

              const href = getMentionHref(mention)
              return (
                <MentionChip
                  key={key}
                  label={`${mention.type === 'task' ? '#' : '📎'} ${mention.label}`}
                  size="small"
                  clickable={!!href}
                  onClick={href ? () => window.open(href, '_blank', 'noopener,noreferrer') : undefined}
                />
              )
            })}
          </Box>
        )}

        {Array.isArray(message.attachments) && message.attachments.length > 0 && (
          <Stack spacing={1} sx={{ mt: 2 }}>
            {message.attachments.map((attachment, idx) => {
              const attachmentUrl = attachment.url || getFileUrl(attachment.key)

              if (!attachmentUrl) {
                return (
                  <Chip
                    key={`${message.id}_attachment_${idx}`}
                    icon={<AttachFile />}
                    label={attachment.name}
                    size="small"
                    variant="outlined"
                  />
                )
              }

              return (
                <Box key={`${message.id}_attachment_${idx}`}>
                  {isImageAttachment(attachment) && (
                    <Box
                      component="a"
                      href={attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      sx={{
                        display: 'block',
                        width: '100%',
                        maxWidth: 260,
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        textDecoration: 'none',
                        mb: 1
                      }}
                    >
                      <img
                        src={attachmentUrl}
                        alt={attachment.name}
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                      />
                    </Box>
                  )}
                  <Chip
                    icon={<AttachFile />}
                    label={attachment.name}
                    size="small"
                    variant="outlined"
                    clickable
                    component="a"
                    href={attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      }
                    }}
                  />
                </Box>
              )
            })}
          </Stack>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, opacity: 0.8 }}>
          <MessageTime variant="caption">
            {new Date(message.createdAt).toLocaleString('ar-SA', {
              day: '2-digit',
              month: '2-digit',
            })}
          </MessageTime>

          <MessageTime variant="caption">
            {new Date(message.createdAt).toLocaleString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </MessageTime>

          {isMine && currentUserId && conversationParticipantIds.length > 1 && (
            <Box sx={{ mt: 0.5 }}>
              {getReadStatusInfo(message, currentUserId, conversationParticipantIds)}
            </Box>
          )}
        </Box>
      </ChatBubble>
    </Box>
  )
}
