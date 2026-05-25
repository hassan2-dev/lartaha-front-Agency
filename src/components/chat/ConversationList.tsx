import {
  Avatar,
  Box,
  List,
  ListItemButton,
  Typography,
  Divider,
  InputBase,
  Badge,
} from '@mui/material'
import { Search as SearchIcon, Forum as ForumIcon } from '@mui/icons-material'
import { ConversationItemSkeleton } from '../SkeletonLoaders'
import { useChatContext } from '../../contexts/ChatContext'
import { useMemo, useState } from 'react'

function formatRelativeTime(dateStr?: string | null) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)
  if (diffMin < 1) return 'الآن'
  if (diffMin < 60) return `${diffMin}د`
  if (diffH < 24) return `${diffH}س`
  if (diffD < 7) return `${diffD}ي`
  return date.toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit' })
}

export default function ConversationList() {
  const {
    conversations,
    selectedConversationId,
    bootstrap,
    loadingConversations,
    unreadMessageCounts,
    openGeneralDiscussion,
    openDirectConversation,
    user,
  } = useChatContext()

  const [search, setSearch] = useState('')

  const onlineCount = useMemo(
    () => bootstrap.users.filter(u => u.id !== user?.id && u.isOnline).length,
    [bootstrap.users, user?.id]
  )

  const generalConversation = useMemo(
    () =>
      conversations.find(
        c => c.type === 'group' && (c.title || '').trim().toLowerCase() === 'general discussion'
      ),
    [conversations]
  )
  const isGeneralSelected =
    !!generalConversation && generalConversation.id === selectedConversationId

  const memberList = useMemo(() => {
    const members = bootstrap.users.filter(candidate => candidate.id !== user?.id)
    return members
      .map(member => {
        const conv = conversations.find(
          c =>
            c.type === 'direct' &&
            c.participantIds.includes(member.id) &&
            c.participantIds.includes(user?.id || '')
        )
        return {
          ...member,
          conversation: conv ?? null,
          unreadCount: conv ? unreadMessageCounts.get(conv.id) || 0 : 0,
          lastMessageAt: conv?.lastMessageAt ?? null,
        }
      })
      .sort((a, b) => {
        if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount
        const aT = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
        const bT = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
        return bT - aT
      })
  }, [bootstrap.users, user, conversations, unreadMessageCounts])

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return memberList
    return memberList.filter(
      m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
    )
  }, [memberList, search])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderLeft: { md: '1px solid rgba(128,128,128,0.15)' },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
          المحادثات
        </Typography>

        {/* Search */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.75,
            borderRadius: 2.5,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <SearchIcon sx={{ fontSize: 18, opacity: 0.5 }} />
          <InputBase
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث..."
            sx={{ flex: 1, fontSize: 14 }}
          />
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 2 }}>
        {/* General Discussion */}
        <Typography variant="caption" sx={{ opacity: 0.55, px: 0.5, mb: 0.5, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          المناقشات
        </Typography>

        <List sx={{ p: 0, mb: 1 }}>
          <ListItemButton
            selected={isGeneralSelected}
            onClick={() => openGeneralDiscussion()}
            sx={{ borderRadius: 2, mb: 0.5, px: 1.5, py: 1 }}
          >
            <Box sx={{ position: 'relative', mr: 1.5, flexShrink: 0 }}>
              <Avatar
                sx={{
                  width: 38,
                  height: 38,
                  bgcolor: 'primary.main',
                  fontSize: 18,
                }}
              >
                <ForumIcon sx={{ fontSize: 20 }} />
              </Avatar>
              {onlineCount > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -1,
                    right: -1,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    bgcolor: '#22c55e',
                    border: '2px solid',
                    borderColor: 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 0.25,
                  }}
                >
                  <Typography sx={{ fontSize: 9, color: '#fff', fontWeight: 700, lineHeight: 1 }}>
                    {onlineCount}
                  </Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                نقاش جماعي
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {generalConversation?.lastMessageAt
                  ? formatRelativeTime(generalConversation.lastMessageAt)
                  : 'General Discussion'}
              </Typography>
            </Box>
          </ListItemButton>
        </List>

        <Divider sx={{ mb: 1 }} />

        <Typography variant="caption" sx={{ opacity: 0.55, px: 0.5, mb: 0.5, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          الأعضاء
        </Typography>

        {loadingConversations && filteredMembers.length === 0 ? (
          <Box sx={{ py: 1 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <ConversationItemSkeleton key={i} />
            ))}
          </Box>
        ) : filteredMembers.length === 0 ? (
          <Typography variant="body2" sx={{ opacity: 0.55, px: 0.5, py: 1 }}>
            {search ? 'لا توجد نتائج' : 'لا يوجد أعضاء متاحون.'}
          </Typography>
        ) : (
          <List sx={{ p: 0 }}>
            {filteredMembers.map(member => {
              const isSelected = member.conversation?.id === selectedConversationId
              const isOnline = Boolean(member.isOnline)

              return (
                <ListItemButton
                  key={member.id}
                  selected={isSelected}
                  onClick={() => openDirectConversation(member.id)}
                  sx={{ borderRadius: 2, mb: 0.5, px: 1.5, py: 0.75 }}
                >
                  <Box sx={{ position: 'relative', mr: 1.5, flexShrink: 0 }}>
                    <Avatar
                      src={member.avatar || undefined}
                      sx={{ width: 38, height: 38, fontSize: 15 }}
                    >
                      {(member.name || 'U').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 1,
                        right: 1,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: isOnline ? '#22c55e' : 'action.disabled',
                        border: '2px solid',
                        borderColor: 'background.paper',
                      }}
                    />
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: member.unreadCount > 0 ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {member.name}
                      </Typography>
                      {member.lastMessageAt && (
                        <Typography variant="caption" sx={{ opacity: 0.5, flexShrink: 0, fontSize: 11 }}>
                          {formatRelativeTime(member.lastMessageAt)}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isOnline ? 'متصل الآن' : 'غير متصل'}
                      </Typography>
                      {member.unreadCount > 0 && (
                        <Badge
                          badgeContent={member.unreadCount > 9 ? '9+' : member.unreadCount}
                          color="primary"
                          sx={{ '& .MuiBadge-badge': { position: 'static', transform: 'none', fontSize: 10, minWidth: 18, height: 18 } }}
                        />
                      )}
                    </Box>
                  </Box>
                </ListItemButton>
              )
            })}
          </List>
        )}
      </Box>
    </Box>
  )
}
