import { Box, Typography, Divider, Avatar, IconButton, Tooltip, InputBase, Collapse } from '@mui/material'
import { Forum as ForumIcon, Search as SearchIcon, Info as InfoIcon, Close as CloseIcon } from '@mui/icons-material'
import { MessageSkeleton } from '../SkeletonLoaders'
import MessageItem from './MessageItem'
import { useChatContext } from '../../contexts/ChatContext'
import { VideocameraAdd } from '@solar-icons/react'
import { useEffect, useRef, useState } from 'react'

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
    bootstrap,
  } = useChatContext()

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  if (!selectedConversation) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: 2,
          opacity: 0.6,
        }}
      >
        <ForumIcon sx={{ fontSize: 56 }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            اختر محادثة
          </Typography>
          <Typography variant="body2">
            اختر محادثة من القائمة للبدء
          </Typography>
        </Box>
      </Box>
    )
  }

  const otherId = selectedConversation.type === 'direct'
    ? selectedConversation.participantIds.find(id => id !== user?.id)
    : null
  const otherUser = otherId ? usersById.get(otherId) : null
  const isOtherOnline = otherUser?.isOnline ?? false

  const onlineCount = isGeneralDiscussionSelected
    ? bootstrap.users.filter(u => u.id !== user?.id && u.isOnline).length
    : 0

  const label = getConversationLabel(selectedConversation)

  return (
    <>
      {/* Rich header — hidden on mobile (MemberStories serves as nav there) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          gap: 1.5,
          px: 1,
          py: 1,
        }}
      >
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          {isGeneralDiscussionSelected ? (
            <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
              <ForumIcon sx={{ fontSize: 22 }} />
            </Avatar>
          ) : (
            <Avatar src={otherUser?.avatar || undefined} sx={{ width: 40, height: 40 }}>
              {label.charAt(0).toUpperCase()}
            </Avatar>
          )}
          {!isGeneralDiscussionSelected && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 1,
                right: 1,
                width: 11,
                height: 11,
                borderRadius: '50%',
                bgcolor: isOtherOnline ? '#22c55e' : 'action.disabled',
                border: '2px solid',
                borderColor: 'background.paper',
              }}
            />
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {label}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            {isGeneralDiscussionSelected
              ? `${onlineCount} متصل الآن`
              : isOtherOnline
                ? 'متصل الآن'
                : 'غير متصل'}
          </Typography>
        </Box>

        {/* Action icons */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {isGeneralDiscussionSelected && (
            <Tooltip title="اجتماع مباشر">
              <IconButton size="small" onClick={openGeneralMeeting} color="primary" sx={{ bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' }, width: 34, height: 34 }}>
                <VideocameraAdd size={18} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={searchOpen ? 'إغلاق البحث' : 'بحث في الرسائل'}>
            <IconButton
              size="small"
              onClick={() => { setSearchOpen(v => !v); setSearchQuery('') }}
              sx={{ width: 34, height: 34 }}
            >
              {searchOpen ? <CloseIcon sx={{ fontSize: 18 }} /> : <SearchIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="معلومات">
            <IconButton size="small" sx={{ width: 34, height: 34 }}>
              <InfoIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Inline search bar — desktop only */}
      <Collapse in={searchOpen}>
        <Box
          sx={{
            mx: 1,
            mb: 1,
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.75,
            borderRadius: 2,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <SearchIcon sx={{ fontSize: 16, opacity: 0.5 }} />
          <InputBase
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث في الرسائل..."
            sx={{ flex: 1, fontSize: 13 }}
          />
          {filteredMessages.length !== messages.length && (
            <Typography variant="caption" sx={{ opacity: 0.6, flexShrink: 0 }}>
              {filteredMessages.length} نتيجة
            </Typography>
          )}
        </Box>
      </Collapse>

      <Divider sx={{ display: { xs: 'none', md: 'block' } }} />

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: { xs: 0.5, md: 1 },
          py: { xs: 0.5, md: 1.5 },
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          backgroundImage: theme =>
            theme.palette.mode === 'dark'
              ? 'url(/chat_bg_dark.jpeg)'
              : 'url(/chat_bg_light.jpeg)',
          backgroundSize: '400px auto',
          backgroundRepeat: 'repeat',
          backgroundAttachment: 'scroll',
          backgroundBlendMode: 'luminosity',
          backgroundColor: theme => theme.palette.mode === 'dark'
            ? 'rgba(18,18,18,0.88)'
            : 'rgba(245,245,245,0.88)',
        }}
      >
        {loadingMessages && messages.length === 0 ? (
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <MessageSkeleton isMine={false} />
            <MessageSkeleton isMine={true} />
            <MessageSkeleton isMine={false} />
            <MessageSkeleton isMine={true} />
            <MessageSkeleton isMine={false} />
          </Box>
        ) : filteredMessages.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, opacity: 0.5, gap: 1 }}>
            <Typography variant="body2">
              {searchQuery ? 'لا توجد رسائل تطابق البحث' : 'ابدأ أول رسالة في هذه المحادثة.'}
            </Typography>
          </Box>
        ) : (
          <>
            {filteredMessages.map(message => {
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
                  currentUserId={user?.id}
                  conversationParticipantIds={selectedConversation.participantIds}
                />
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>
    </>
  )
}
