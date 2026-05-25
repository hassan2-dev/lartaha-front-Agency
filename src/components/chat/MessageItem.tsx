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
  IconButton,
} from '@mui/material'
import {
  Check,
  DoneAll,
  AttachFile,
  Person,
  ContentCopy,
  EmojiEmotions,
  Reply,
  InsertDriveFile,
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'
import { useState } from 'react'

const ChatBubble = styled(Paper, {
  shouldForwardProp: prop => prop !== 'isMine',
})<{ isMine: boolean }>(({ theme, isMine }) => ({
  padding: theme.spacing(1.5, 2),
  borderRadius: isMine ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
  maxWidth: '72%',
  minWidth: 120,
  background: isMine
    ? theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
      : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    : theme.palette.mode === 'dark'
      ? 'rgb(24, 70, 70)'
      : 'rgb(230, 255, 238)',
  color: isMine ? '#fff' : theme.palette.mode === 'dark' ? '#e0f2f2' : '#1a1a1a',
  border: 'none',
  boxShadow: 'none',
  position: 'relative',
}))

const HoverActions = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: -32,
  display: 'flex',
  gap: 2,
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 20,
  padding: theme.spacing(0.25, 0.5),
  boxShadow: theme.shadows[3],
  opacity: 0,
  pointerEvents: 'none',
  transition: 'opacity 0.15s ease',
  zIndex: 10,
}))

const BubbleWrapper = styled(Box)({
  position: 'relative',
  '&:hover .msg-actions': {
    opacity: 1,
    pointerEvents: 'auto',
  },
})

const MessageTime = styled(Typography)({
  fontSize: '0.7rem',
  opacity: 0.7,
})

const MentionChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.25),
  backgroundColor: 'rgba(255,255,255,0.2)',
  color: 'inherit',
  border: '1px solid rgba(255,255,255,0.3)',
  '&:hover': {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
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

function formatFileSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getReadStatusInfo(
  message: ChatMessage,
  currentUserId: string,
  conversationParticipantIds: string[]
) {
  if (!message.readBy || !currentUserId) return null
  const otherParticipants = conversationParticipantIds.filter(
    id => id !== currentUserId && id !== message.senderId
  )
  const readCount = otherParticipants.filter(id => message.readBy?.includes(id)).length
  const totalCount = otherParticipants.length
  if (totalCount === 0) return null
  return readCount === 0 ? (
    <Check sx={{ fontSize: 14, opacity: 0.6 }} />
  ) : readCount === totalCount ? (
    <DoneAll sx={{ fontSize: 14, color: '#60a5fa' }} />
  ) : (
    <DoneAll sx={{ fontSize: 14, opacity: 0.7 }} />
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
  const [copied, setCopied] = useState(false)
  const linkPreviews = extractLinks(message.text || '')

  const handleCopy = () => {
    if (message.text) {
      void navigator.clipboard.writeText(message.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const timeStr = new Date(message.createdAt).toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 1,
        mb: 0.5,
        px: 0.5,
      }}
    >
      {!isMine && isGeneralDiscussionSelected && (
        <Avatar src={sender?.avatar || undefined} sx={{ width: 30, height: 30, mb: 0.5, flexShrink: 0 }}>
          {sender?.name ? sender.name.charAt(0).toUpperCase() : 'U'}
        </Avatar>
      )}

      <BubbleWrapper sx={{ maxWidth: { xs: '88%', md: '72%' }, display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
        {/* Hover action bar */}
        <HoverActions className="msg-actions" sx={{ [isMine ? 'right' : 'left']: 0 }}>
          <Tooltip title={copied ? 'تم النسخ!' : 'نسخ'}>
            <IconButton size="small" onClick={handleCopy} sx={{ p: 0.5 }}>
              <ContentCopy sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="رد">
            <IconButton size="small" sx={{ p: 0.5 }}>
              <Reply sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="تفاعل">
            <IconButton size="small" sx={{ p: 0.5 }}>
              <EmojiEmotions sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </HoverActions>

        {/* Sender name (group chat, others only) */}
        {isGeneralDiscussionSelected && !isMine && (
          <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8, mb: 0.25, ml: 0.5 }}>
            {sender?.name?.split(' ')[0] || 'مستخدم'}
          </Typography>
        )}

        {(() => {
          const attachments = Array.isArray(message.attachments) ? message.attachments : []
          const imageAttachments = attachments.filter(a => isImageAttachment(a) && (a.url || getFileUrl(a.key)))
          const fileAttachments = attachments.filter(a => !isImageAttachment(a))
          const hasText = !!message.text
          const hasMentions = Array.isArray(message.mentions) && message.mentions.length > 0
          const isImageOnly = imageAttachments.length > 0 && !hasText && !hasMentions && fileAttachments.length === 0

          const timeReadRow = (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mt: 0.75 }}>
              <MessageTime variant="caption">{timeStr}</MessageTime>
              {isMine && currentUserId && conversationParticipantIds.length > 1 && (
                getReadStatusInfo(message, currentUserId, conversationParticipantIds)
              )}
            </Box>
          )

          // Image-only: render without bubble
          if (isImageOnly) {
            return (
              <Stack spacing={0.5}>
                {imageAttachments.map((attachment, idx) => {
                  const attachmentUrl = attachment.url || getFileUrl(attachment.key)
                  return (
                    <Box
                      key={`${message.id}_att_${idx}`}
                      component="a"
                      href={attachmentUrl ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      sx={{
                        display: 'block',
                        borderRadius: 2,
                        overflow: 'hidden',
                        maxWidth: { xs: 220, md: 280 },
                        textDecoration: 'none',
                        position: 'relative',
                      }}
                    >
                      <img
                        src={attachmentUrl ?? undefined}
                        alt={attachment.name}
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                      />
                      {/* Timestamp overlaid on bottom of image */}
                      <Box sx={{
                        position: 'absolute', bottom: 4, right: 6,
                        display: 'flex', alignItems: 'center', gap: 0.5,
                        bgcolor: 'rgba(0,0,0,0.45)', borderRadius: 1, px: 0.75, py: 0.25,
                      }}>
                        <MessageTime variant="caption" sx={{ color: '#fff', opacity: 1 }}>{timeStr}</MessageTime>
                        {isMine && currentUserId && conversationParticipantIds.length > 1 && (
                          getReadStatusInfo(message, currentUserId, conversationParticipantIds)
                        )}
                      </Box>
                    </Box>
                  )
                })}
              </Stack>
            )
          }

          // Normal bubble for text / files / mixed content
          return (
            <ChatBubble isMine={isMine} elevation={0}>
              {/* Message text */}
              {hasText && (
                <Typography
                  variant="body2"
                  sx={{ wordBreak: 'break-word', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}
                >
                  {linkifyText(message.text!)}
                </Typography>
              )}

              {/* Link previews */}
              {linkPreviews.length > 0 && (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {linkPreviews.map(link => (
                    <Box
                      key={`${message.id}_${link}`}
                      component="a"
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      sx={{
                        display: 'block',
                        textDecoration: 'none',
                        borderRadius: 1.5,
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.2)',
                        bgcolor: 'rgba(0,0,0,0.12)',
                        p: 1,
                      }}
                    >
                      <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>
                        🔗 رابط
                      </Typography>
                      <Typography variant="caption" sx={{ wordBreak: 'break-all', opacity: 0.9 }}>
                        {link}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}

              {/* Mentions */}
              {hasMentions && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1 }}>
                  {message.mentions!.map((mention, idx) => {
                    const key = `${message.id}_${mention.type}_${mention.id}_${idx}`
                    if (mention.type === 'member') {
                      const member = usersById.get(mention.id)
                      return (
                        <Tooltip
                          key={key}
                          title={
                            <Box
                              onClick={e => { e.stopPropagation(); onOpenDirectConversation(mention.id) }}
                              sx={{ p: 1.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 180 }}
                            >
                              <Avatar sx={{ width: 32, height: 32 }}>
                                {member?.avatar ? (
                                  <img src={member.avatar} alt={member?.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : <Person />}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{member?.name || mention.label}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.75 }}>{member?.position || 'عضو الفريق'}</Typography>
                              </Box>
                            </Box>
                          }
                        >
                          <MentionChip label={`@${mention.label}`} size="small" clickable />
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

              {/* Images inside bubble (mixed with text) */}
              {imageAttachments.length > 0 && (
                <Stack spacing={1} sx={{ mt: hasText || hasMentions ? 1 : 0 }}>
                  {imageAttachments.map((attachment, idx) => {
                    const attachmentUrl = attachment.url || getFileUrl(attachment.key)
                    return (
                      <Box
                        key={`${message.id}_img_${idx}`}
                        component="a"
                        href={attachmentUrl ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        sx={{ display: 'block', borderRadius: 1.5, overflow: 'hidden', maxWidth: 240, textDecoration: 'none' }}
                      >
                        <img src={attachmentUrl ?? undefined} alt={attachment.name} style={{ width: '100%', height: 'auto', display: 'block' }} />
                      </Box>
                    )
                  })}
                </Stack>
              )}

              {/* File attachments */}
              {fileAttachments.length > 0 && (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {fileAttachments.map((attachment, idx) => {
                    const attachmentUrl = attachment.url || getFileUrl(attachment.key)
                    return (
                      <Box
                        key={`${message.id}_file_${idx}`}
                        component={attachmentUrl ? 'a' : 'div'}
                        href={attachmentUrl || undefined}
                        target="_blank"
                        rel="noreferrer"
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1.5,
                          bgcolor: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.15)',
                          textDecoration: 'none', color: 'inherit',
                          cursor: attachmentUrl ? 'pointer' : 'default',
                          '&:hover': attachmentUrl ? { bgcolor: 'rgba(0,0,0,0.2)' } : {},
                        }}
                      >
                        <InsertDriveFile sx={{ fontSize: 22, opacity: 0.8 }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                            {attachment.name}
                          </Typography>
                          {attachment.size && (
                            <Typography variant="caption" sx={{ opacity: 0.65 }}>
                              {formatFileSize(attachment.size)}
                            </Typography>
                          )}
                        </Box>
                        <AttachFile sx={{ fontSize: 14, opacity: 0.5, ml: 'auto' }} />
                      </Box>
                    )
                  })}
                </Stack>
              )}

              {timeReadRow}
            </ChatBubble>
          )
        })()}
      </BubbleWrapper>
    </Box>
  )
}
