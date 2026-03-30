import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  Forum as ForumIcon,
  Send as SendIcon,
  Tag as TagIcon,
  VideoCall as VideoCallIcon,
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import {
  createConversation,
  getChatBootstrap,
  getConversationMessages,
  getConversations,
  sendMessage,
  type ChatAttachment,
  type ChatBootstrapData,
  type ChatConversation,
  type ChatMention,
  type ChatMessage,
  type ChatMentionType,
} from '../api/chatApi'
import { uploadFiles } from '../api/uploadApi'
import { API_ENV } from '../config/api'
import { subscribeRealtime } from '../api/realtimeApi'
import LiveKitMeetingDialog from '../components/chat/LiveKitMeetingDialog'
import { ConversationItemSkeleton, MessageSkeleton } from '../components/SkeletonLoaders'

const EMOJIS = ['😀', '😂', '😍', '😎', '🤝', '🔥', '🚀', '🎯', '✅', '💡', '🙏', '🎉']
const URL_REGEX = /(https?:\/\/[^\s]+)/g

function linkifyText(text: string) {
  const parts = text.split(URL_REGEX)
  return parts.map((part, idx) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a key={`${part}_${idx}`} href={part} target="_blank" rel="noreferrer" style={{ color: '#42a5f5' }}>
          {part}
        </a>
      )
    }
    return <span key={`${part}_${idx}`}>{part}</span>
  })
}

function extractLinks(text: string) {
  const links = text.match(URL_REGEX) || []
  return Array.from(new Set(links))
}

function getFileUrl(key: string) {
  const base = API_ENV.r2PublicBaseUrl?.trim() || ''
  if (!base) return null
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base
  const safeKey = key.startsWith('/') ? key.slice(1) : key
  return `${normalized}/${safeKey}`
}

export default function ChatPage() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [bootstrap, setBootstrap] = useState<ChatBootstrapData>({ users: [], tasks: [], files: [] })
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [composerText, setComposerText] = useState('')
  const [composerMentions, setComposerMentions] = useState<ChatMention[]>([])
  const [composerFiles, setComposerFiles] = useState<File[]>([])
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLElement | null>(null)

  const [mentionDialogOpen, setMentionDialogOpen] = useState(false)
  const [mentionType, setMentionType] = useState<'task' | 'file'>('task')
  const [meetingOpen, setMeetingOpen] = useState(false)

  const usersById = useMemo(() => {
    const map = new Map<string, {
      id: string
      name: string
      email: string
      avatar?: string | null
      position?: string | null
      isOnline?: boolean
    }>()
    bootstrap.users.forEach((u) => {
      map.set(u.id, {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar || null,
        position: u.position || null,
        isOnline: Boolean(u.isOnline),
      })
    })
    if (user && !map.has(user.id)) {
      map.set(user.id, {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
        position: user.position || null,
        isOnline: true,
      })
    }
    return map
  }, [bootstrap.users, user])

  const selectedConversation = useMemo(
    () => conversations.find((conv) => conv.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  )

  const isGeneralDiscussionSelected = useMemo(() => {
    if (!selectedConversation) return false
    return (
      selectedConversation.type === 'group' &&
      (selectedConversation.title || '').trim().toLowerCase() === 'general discussion'
    )
  }, [selectedConversation])

  const memberList = useMemo(
    () => bootstrap.users.filter((candidate) => candidate.id !== user?.id),
    [bootstrap.users, user?.id]
  )

  const filesById = useMemo(() => {
    const map = new Map<string, { id: string; key: string; name: string }>()
    bootstrap.files.forEach((item) => {
      map.set(item.id, { id: item.id, key: item.key, name: item.name })
    })
    return map
  }, [bootstrap.files])

  const atMentionQuery = useMemo(() => {
    const match = composerText.match(/(?:^|\s)@([^\s@]{0,30})$/)
    if (!match) return null
    return match[1] ?? ''
  }, [composerText])

  const memberMentionSuggestions = useMemo(() => {
    if (atMentionQuery === null) return []
    const query = atMentionQuery.trim().toLowerCase()
    return memberList
      .filter((candidate) => {
        if (!query) return true
        return candidate.name.toLowerCase().includes(query) || candidate.email.toLowerCase().includes(query)
      })
      .slice(0, 6)
  }, [atMentionQuery, memberList])

  const mentionOptions = useMemo(() => {
    if (mentionType === 'task') {
      return bootstrap.tasks.map((t) => ({
        id: t.id,
        label: t.title,
      }))
    }

    return bootstrap.files.map((f) => ({
      id: f.id,
      label: f.name,
    }))
  }, [bootstrap, mentionType])

  const refreshBootstrap = useCallback(async () => {
    const data = await getChatBootstrap()
    setBootstrap(data)
  }, [])

  const refreshConversations = useCallback(async () => {
    setLoadingConversations(true)
    try {
      const data = await getConversations()
      setConversations(data)
      if (!selectedConversationId && data.length > 0) {
        setSelectedConversationId(data[0].id)
      }
    } finally {
      setLoadingConversations(false)
    }
  }, [selectedConversationId])

  const refreshMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true)
    try {
      const data = await getConversationMessages(conversationId, 120)
      setMessages(data)
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    async function init() {
      setError(null)
      try {
        await Promise.all([refreshBootstrap(), refreshConversations()])
      } catch (e: unknown) {
        const err = e as { message?: string; response?: { data?: { message?: string } } }
        setError(err.response?.data?.message ?? err.message ?? 'فشل تحميل المحادثات')
      }
    }

    void init()
  }, [refreshBootstrap, refreshConversations])

  useEffect(() => {
    if (!selectedConversationId) return
    void refreshMessages(selectedConversationId)
  }, [refreshMessages, selectedConversationId])

  useEffect(() => {
    const unsubscribe = subscribeRealtime(
      (event) => {
        if (event.scope !== 'chat') return

        void refreshConversations()
        if (event.action === 'presence_changed') {
          void refreshBootstrap()
        }

        if (selectedConversationId && event.id === selectedConversationId) {
          void refreshMessages(selectedConversationId)
        }
      },
      () => {
        // silent reconnect
      }
    )

    return unsubscribe
  }, [refreshBootstrap, refreshConversations, refreshMessages, selectedConversationId])

  const getConversationLabel = useCallback(
    (conversation: ChatConversation) => {
      if (conversation.type === 'group') {
        return conversation.title || 'مجموعة بدون اسم'
      }

      const otherId = conversation.participantIds.find((id) => id !== user?.id)
      const other = otherId ? usersById.get(otherId) : null
      return other?.name || 'محادثة مباشرة'
    },
    [user?.id, usersById]
  )

  const sameParticipants = useCallback((a: string[], b: string[]) => {
    if (a.length !== b.length) return false
    const aa = [...a].sort()
    const bb = [...b].sort()
    return aa.every((value, idx) => value === bb[idx])
  }, [])

  const openGeneralDiscussion = useCallback(async () => {
    if (!user) return

    const allParticipantIds = Array.from(new Set([user.id, ...bootstrap.users.map((candidate) => candidate.id)]))

    const existing = conversations.find(
      (conversation) =>
        conversation.type === 'group' &&
        (conversation.title || '').trim().toLowerCase() === 'general discussion'
    )

    if (existing) {
      setSelectedConversationId(existing.id)
      return
    }

    try {
      const created = await createConversation({
        type: 'group',
        title: 'General Discussion',
        participantIds: allParticipantIds,
      })
      await refreshConversations()
      setSelectedConversationId(created.id)
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? err.message ?? 'فشل فتح النقاش العام')
    }
  }, [bootstrap.users, conversations, refreshConversations, user])

  const openGeneralMeeting = () => {
    if (!isGeneralDiscussionSelected) return
    setMeetingOpen(true)
  }

  const openDirectConversation = useCallback(
    async (memberId: string) => {
      if (!user) return
      if (memberId === user.id) return

      const participantIds = [user.id, memberId]
      const existing = conversations.find(
        (conversation) => conversation.type === 'direct' && sameParticipants(conversation.participantIds || [], participantIds)
      )

      if (existing) {
        setSelectedConversationId(existing.id)
        return
      }

      try {
        const created = await createConversation({
          type: 'direct',
          participantIds,
        })
        await refreshConversations()
        setSelectedConversationId(created.id)
      } catch (e: unknown) {
        const err = e as { message?: string; response?: { data?: { message?: string } } }
        setError(err.response?.data?.message ?? err.message ?? 'فشل فتح المحادثة المباشرة')
      }
    },
    [conversations, refreshConversations, sameParticipants, user]
  )

  const resetComposer = () => {
    setComposerText('')
    setComposerMentions([])
    setComposerFiles([])
  }

  const handleAttachFiles = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || [])
    if (selected.length === 0) return
    setComposerFiles((prev) => [...prev, ...selected])
    event.target.value = ''
  }

  const addMention = (type: ChatMentionType, id: string, label: string) => {
    setComposerMentions((prev) => {
      if (prev.some((m) => m.type === type && m.id === id)) return prev
      return [...prev, { type, id, label }]
    })
    setMentionDialogOpen(false)
  }

  const removeMention = (mention: ChatMention) => {
    setComposerMentions((prev) => prev.filter((m) => !(m.type === mention.type && m.id === mention.id)))
  }

  const removeComposerFile = (index: number) => {
    setComposerFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const addEmoji = (emoji: string) => {
    setComposerText((prev) => `${prev}${prev ? ' ' : ''}${emoji}`)
  }

  const applyMemberMentionFromInput = (memberId: string, memberLabel: string) => {
    const mentionText = `@${memberLabel.replace(/\s+/g, '_')}`
    setComposerText((prev) => prev.replace(/(?:^|\s)@([^\s@]{0,30})$/, (full) => {
      const prefix = full.startsWith(' ') ? ' ' : ''
      return `${prefix}${mentionText} `
    }))
    addMention('member', memberId, memberLabel)
  }

  const getMentionHref = useCallback(
    (mention: ChatMention) => {
      if (mention.type === 'task') {
        return `/tasks?taskId=${encodeURIComponent(mention.id)}`
      }

      if (mention.type === 'file') {
        const fileItem = filesById.get(mention.id)
        if (fileItem) {
          return getFileUrl(fileItem.key) || `/upload?fileId=${encodeURIComponent(mention.id)}`
        }
        return `/upload?fileId=${encodeURIComponent(mention.id)}`
      }

      return null
    },
    [filesById]
  )

  const isImageAttachment = (attachment: ChatAttachment) => {
    const byMime = (attachment.mimeType || '').toLowerCase().startsWith('image/')
    const byName = /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(attachment.name || '')
    const byKey = /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(attachment.key || '')
    return byMime || byName || byKey
  }

  async function handleSend() {
    if (!selectedConversationId) return

    const normalizedText = composerText.trim()
    if (!normalizedText && composerFiles.length === 0) return

    setSending(true)
    setError(null)

    try {
      let attachments: ChatAttachment[] = []

      if (composerFiles.length > 0) {
        const formData = new FormData()
        formData.append('batchName', 'uploads/chat')

        composerFiles.forEach((file) => {
          formData.append('files', file, file.name)
        })

        const uploadRes = await uploadFiles(formData)
        const uploaded = uploadRes.uploaded ?? []

        attachments = uploaded.map((item, index) => ({
          key: item.key,
          name: composerFiles[index]?.name || item.key,
          size: item.size,
          mimeType: composerFiles[index]?.type || null,
          url: getFileUrl(item.key),
        }))
      }

      await sendMessage(selectedConversationId, {
        text: normalizedText || undefined,
        mentions: composerMentions,
        attachments,
      })

      resetComposer()
      await refreshMessages(selectedConversationId)
      await refreshConversations()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? err.message ?? 'فشل إرسال الرسالة')
    } finally {
      setSending(false)
    }
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <input ref={fileInputRef} hidden type="file" multiple onChange={handleFileChange} />

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
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
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
              onClick={() => void openGeneralDiscussion()}
              sx={{ borderRadius: 2, mb: 0.75 }}
            >
              <ListItemText primary="General Discussion" secondary="نقاش جماعي للجميع" />
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
                    onClick={() => void openDirectConversation(member.id)}
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

        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {!selectedConversation ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 1 }}>
              <ForumIcon sx={{ fontSize: 40, opacity: 0.5 }} />
              <Typography variant="body1" sx={{ opacity: 0.7 }}>
                اختر محادثة من القائمة
              </Typography>
            </Box>
          ) : (
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
                  <Button variant="contained" startIcon={<VideoCallIcon />} onClick={openGeneralMeeting}>
                    اجتماع مباشر
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
                    const linkPreviews = extractLinks(message.text || '')

                    return (
                      <Box
                        key={message.id}
                        sx={{
                          display: 'flex',
                          justifyContent: isMine ? 'flex-start' : 'flex-end',
                        }}
                      >
                        <Paper
                          sx={{
                            maxWidth: '78%',
                            px: 1.5,
                            py: 1,
                            borderRadius: 2,
                            bgcolor: isMine ? 'primary.main' : 'background.default',
                            color: isMine ? 'primary.contrastText' : 'text.primary',
                            border: isMine ? 'none' : '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            {isGeneralDiscussionSelected && (
                              <Avatar src={sender?.avatar || undefined} sx={{ width: 22, height: 22, fontSize: 11 }}>
                                {(sender?.name || 'U').charAt(0).toUpperCase()}
                              </Avatar>
                            )}
                            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 700 }}>
                              {sender?.name || 'مستخدم'}
                            </Typography>
                          </Box>

                          {message.text && (
                            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                              {linkifyText(message.text)}
                            </Typography>
                          )}

                          {linkPreviews.length > 0 && (
                            <Stack spacing={0.75} sx={{ mt: 1 }}>
                              {linkPreviews.map((link) => (
                                <Paper
                                  key={`${message.id}_${link}`}
                                  component="a"
                                  href={link}
                                  target="_blank"
                                  rel="noreferrer"
                                  sx={{
                                    p: 1,
                                    textDecoration: 'none',
                                    borderRadius: 1.5,
                                    bgcolor: isMine ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.04)',
                                  }}
                                >
                                  <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                                    رابط
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: isMine ? 'inherit' : 'primary.main', wordBreak: 'break-word' }}>
                                    {link}
                                  </Typography>
                                </Paper>
                              ))}
                            </Stack>
                          )}

                          {Array.isArray(message.mentions) && message.mentions.length > 0 && (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
                              {message.mentions.map((mention, idx) => (
                                (() => {
                                  const key = `${message.id}_${mention.type}_${mention.id}_${idx}`

                                  if (mention.type === 'member') {
                                    const member = usersById.get(mention.id)
                                    const memberStatusText = member?.isOnline ? 'Online' : 'Offline'
                                    const memberPosition = member?.position || 'Team Member'

                                    return (
                                      <Tooltip
                                        key={key}
                                        arrow
                                        placement="top"
                                        title={
                                          <Box
                                            onClick={(event) => {
                                              event.stopPropagation()
                                              void openDirectConversation(mention.id)
                                            }}
                                            sx={{
                                              minWidth: 220,
                                              p: 1,
                                              borderRadius: 1,
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 1,
                                            }}
                                          >
                                            <Avatar src={member?.avatar || undefined} sx={{ width: 34, height: 34 }}>
                                              {(member?.name || mention.label || 'U').charAt(0).toUpperCase()}
                                            </Avatar>
                                            <Box>
                                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
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
                                        <Chip
                                          size="small"
                                          color="secondary"
                                          variant="filled"
                                          label={`@ ${mention.label}`}
                                        />
                                      </Tooltip>
                                    )
                                  }

                                  const href = getMentionHref(mention)
                                  return (
                                    <Chip
                                      key={key}
                                      size="small"
                                      color="secondary"
                                      variant="filled"
                                      clickable={Boolean(href)}
                                      onClick={href ? () => window.open(href, '_blank', 'noopener,noreferrer') : undefined}
                                      label={`${mention.type === 'task' ? '#' : '📎'} ${mention.label}`}
                                    />
                                  )
                                })()
                              ))}
                            </Stack>
                          )}

                          {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                            <Stack spacing={0.5} sx={{ mt: 1 }}>
                              {message.attachments.map((attachment, idx) => {
                                const attachmentUrl = attachment.url || getFileUrl(attachment.key)

                                if (!attachmentUrl) {
                                  return (
                                    <Chip
                                      key={`${message.id}_attachment_${idx}`}
                                      size="small"
                                      label={`📎 ${attachment.name}`}
                                      variant="outlined"
                                    />
                                  )
                                }

                                return (
                                  <Stack key={`${message.id}_attachment_${idx}`} spacing={0.5}>
                                    {isImageAttachment(attachment) && (
                                      <Box
                                        component="a"
                                        href={attachmentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        sx={{
                                          width: '100%',
                                          maxWidth: 260,
                                          borderRadius: 1.5,
                                          overflow: 'hidden',
                                          border: '1px solid rgba(255,255,255,0.12)',
                                          display: 'block',
                                        }}
                                      >
                                        <Box
                                          component="img"
                                          src={attachmentUrl}
                                          alt={attachment.name}
                                          sx={{ width: '100%', height: 'auto', display: 'block' }}
                                        />
                                      </Box>
                                    )}
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      component="a"
                                      href={attachmentUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      sx={{ justifyContent: 'flex-start' }}
                                    >
                                      📎 {attachment.name}
                                    </Button>
                                  </Stack>
                                )
                              })}
                            </Stack>
                          )}

                          <Typography variant="caption" sx={{ opacity: 0.75, mt: 0.5, display: 'block' }}>
                            {new Date(message.createdAt).toLocaleString('ar-SA')}
                          </Typography>
                        </Paper>
                      </Box>
                    )
                  })
                )}
              </Box>

              <Divider sx={{ mt: 1, mb: 1 }} />

              {composerMentions.length > 0 && (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mb: 1 }}>
                  {composerMentions.map((mention, idx) => (
                    <Chip
                      key={`${mention.type}_${mention.id}_${idx}`}
                      onDelete={() => removeMention(mention)}
                      label={`${mention.type === 'member' ? '@' : mention.type === 'task' ? '#' : '📎'} ${mention.label}`}
                    />
                  ))}
                </Stack>
              )}

              {composerFiles.length > 0 && (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mb: 1 }}>
                  {composerFiles.map((file, idx) => (
                    <Chip key={`${file.name}_${idx}`} label={file.name} onDelete={() => removeComposerFile(idx)} />
                  ))}
                </Stack>
              )}

              <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={6}
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                placeholder="اكتب رسالتك هنا... استخدم @ لذكر عضو"
              />

              {atMentionQuery !== null && memberMentionSuggestions.length > 0 && (
                <Paper variant="outlined" sx={{ mt: 1, p: 0.5, borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ px: 1, py: 0.5, opacity: 0.7, display: 'block' }}>
                    اقتراحات الأعضاء
                  </Typography>
                  <List sx={{ p: 0 }}>
                    {memberMentionSuggestions.map((member) => (
                      <ListItemButton
                        key={`mention_member_${member.id}`}
                        onClick={() => applyMemberMentionFromInput(member.id, member.name)}
                        sx={{ borderRadius: 1.5 }}
                      >
                        <Avatar src={member.avatar || undefined} sx={{ width: 24, height: 24, mr: 1, fontSize: 11 }}>
                          {member.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <ListItemText primary={member.name} secondary={member.email} />
                      </ListItemButton>
                    ))}
                  </List>
                </Paper>
              )}

              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<TagIcon />}
                  onClick={() => {
                    setMentionType('task')
                    setMentionDialogOpen(true)
                  }}
                >
                  Tags
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<TagIcon />}
                  onClick={() => {
                    setMentionType('file')
                    setMentionDialogOpen(true)
                  }}
                >
                  Files
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<EmojiIcon />}
                  onClick={(event) => setEmojiAnchorEl(event.currentTarget)}
                >
                  إيموجي
                </Button>
                <Button variant="outlined" startIcon={<AttachFileIcon />} onClick={handleAttachFiles}>
                  إرفاق ملف
                </Button>
                <Box sx={{ flex: 1 }} />
                <Button variant="contained" endIcon={<SendIcon />} disabled={sending} onClick={() => void handleSend()}>
                  {sending ? 'إرسال...' : 'إرسال'}
                </Button>
              </Box>

              <Popover
                open={Boolean(emojiAnchorEl)}
                anchorEl={emojiAnchorEl}
                onClose={() => setEmojiAnchorEl(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              >
                <Box sx={{ p: 1, maxWidth: 260 }}>
                  <Typography variant="caption" sx={{ opacity: 0.7, px: 0.5, display: 'block', mb: 0.5 }}>
                    اختر إيموجي
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {EMOJIS.map((emoji) => (
                      <Button
                        key={emoji}
                        size="small"
                        variant="text"
                        onClick={() => {
                          addEmoji(emoji)
                          setEmojiAnchorEl(null)
                        }}
                        sx={{ minWidth: 36, fontSize: 18 }}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </Stack>
                </Box>
              </Popover>
            </>
          )}
        </Box>
      </Paper>

      <Dialog open={mentionDialogOpen} onClose={() => setMentionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{mentionType === 'task' ? 'إضافة تاق مهمة' : 'إضافة تاق ملف'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Stack sx={{ maxHeight: 260, overflowY: 'auto' }} spacing={0.75}>
              {mentionOptions.map((option) => (
                <Button
                  key={`${mentionType}_${option.id}`}
                  variant="outlined"
                  onClick={() => addMention(mentionType, option.id, option.label)}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  {option.label}
                </Button>
              ))}
              {mentionOptions.length === 0 && (
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  لا توجد عناصر متاحة.
                </Typography>
              )}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMentionDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      <LiveKitMeetingDialog
        open={meetingOpen}
        conversationId={isGeneralDiscussionSelected ? selectedConversationId : null}
        conversationLabel={selectedConversation ? getConversationLabel(selectedConversation) : 'General Discussion'}
        onClose={() => setMeetingOpen(false)}
      />
    </Container>
  )
}
