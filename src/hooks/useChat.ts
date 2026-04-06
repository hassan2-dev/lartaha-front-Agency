import { useRef, useState, type ChangeEvent } from 'react'
import { useCallback, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getChatBootstrap,
  getConversationMessages,
  getConversations,
  createConversation,
  sendMessage,
  type ChatBootstrapData,
  type ChatConversation,
  type ChatMessage,
  type ChatMention,
  type ChatMentionType,
} from '../api/chatApi'
import { uploadFiles } from '../api/uploadApi'
import { API_ENV } from '../config/api'
import { subscribeRealtime } from '../api/realtimeApi'
import { getFileUrl } from '../utils/chatUtils'

export function useChat() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [bootstrap, setBootstrap] = useState<ChatBootstrapData>({ users: [], tasks: [], files: [] })
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadMessageCounts, setUnreadMessageCounts] = useState<Map<string, number>>(new Map())

  const [composerText, setComposerText] = useState('')
  const [composerMentions, setComposerMentions] = useState<ChatMention[]>([])
  const [composerFiles, setComposerFiles] = useState<File[]>([])
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLElement | null>(null)

  const [mentionDialogOpen, setMentionDialogOpen] = useState(false)
  const [mentionType, setMentionType] = useState<'task' | 'file'>('task')
  const [meetingOpen, setMeetingOpen] = useState(false)

  // Computed values
  const usersById = useMemo(() => {
    const map = new Map()
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

  // Calculate unread message counts and sort conversations
  const sortedConversations = useMemo(() => {
    const counts = new Map<string, number>()

    conversations.forEach(conv => {
      let unreadCount = 0

      // For direct conversations, check if there are unread messages
      if (conv.type === 'direct' && conv.participantIds.includes(user?.id || '')) {
        // This is a simplified logic - in real implementation, you'd track which messages
        // have been read by the current user
        const otherParticipantId = conv.participantIds.find(id => id !== user?.id)
        if (otherParticipantId && conv.lastMessageAt) {
          // For now, we'll mark conversations with recent messages as unread
          // In a real app, you'd have proper read tracking
          const lastMessageTime = new Date(conv.lastMessageAt)
          const now = new Date()
          const hoursDiff = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60)

          // Mark as unread if message is recent and conversation is not selected
          if (hoursDiff < 24 && conv.id !== selectedConversationId) {
            unreadCount = 1
          }
        }
      }

      counts.set(conv.id, unreadCount)
    })

    setUnreadMessageCounts(counts)

    // Sort conversations: unread first, then by last message time
    return [...conversations].sort((a, b) => {
      const aUnread = counts.get(a.id) || 0
      const bUnread = counts.get(b.id) || 0

      if (aUnread !== bUnread) {
        return bUnread - aUnread // More unread messages first
      }

      // If same unread count, sort by last message time
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
      return bTime - aTime
    })
  }, [conversations, selectedConversationId, user?.id])

  // Data fetching
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

  // Effects
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

  // Actions
  const getConversationLabel = useCallback((conversation: any) => {
    if (conversation.type === 'group') {
      return conversation.title || 'مجموعة بدون اسم'
    }
    const otherId = conversation.participantIds.find((id: string) => id !== user?.id)
    const other = otherId ? usersById.get(otherId) : null
    return other?.name || 'محادثة مباشرة'
  }, [user?.id, usersById])

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

  const openDirectConversation = useCallback(async (memberId: string) => {
    if (!user || memberId === user.id) return
    const participantIds = [user.id, memberId]
    const existing = conversations.find(
      (conversation) => conversation.type === 'direct' && sameParticipants(conversation.participantIds || [], participantIds)
    )
    if (existing) {
      setSelectedConversationId(existing.id)
      return
    }
    try {
      const created = await createConversation({ type: 'direct', participantIds })
      await refreshConversations()
      setSelectedConversationId(created.id)
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? err.message ?? 'فشل فتح المحادثة المباشرة')
    }
  }, [conversations, refreshConversations, sameParticipants, user])

  const resetComposer = useCallback(() => {
    setComposerText('')
    setComposerMentions([])
    setComposerFiles([])
  }, [])

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || [])
    if (selected.length === 0) return
    setComposerFiles((prev) => [...prev, ...selected])
    event.target.value = ''
  }, [])

  const addMention = useCallback((type: ChatMentionType, id: string, label: string) => {
    setComposerMentions((prev) => {
      if (prev.some((m) => m.type === type && m.id === id)) return prev
      return [...prev, { type, id, label }]
    })
    setMentionDialogOpen(false)
  }, [])

  const removeMention = useCallback((mention: ChatMention) => {
    setComposerMentions((prev) => prev.filter((m) => !(m.type === mention.type && m.id === mention.id)))
  }, [])

  const removeComposerFile = useCallback((index: number) => {
    setComposerFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const addEmoji = useCallback((emoji: string) => {
    setComposerText((prev) => `${prev}${prev ? ' ' : ''}${emoji}`)
  }, [])

  const applyMemberMentionFromInput = useCallback((memberId: string, memberLabel: string) => {
    const mentionText = `@${memberLabel.replace(/\s+/g, '_')}`
    setComposerText((prev) => prev.replace(/(?:^|\s)@([^\s@]{0,30})$/, (full) => {
      const prefix = full.startsWith(' ') ? ' ' : ''
      return `${prefix}${mentionText} `
    }))
    addMention('member', memberId, memberLabel)
  }, [addMention])

  const getMentionHref = useCallback((mention: ChatMention) => {
    if (mention.type === 'task') {
      return `/tasks?taskId=${encodeURIComponent(mention.id)}`
    }
    if (mention.type === 'file') {
      return `/upload?fileId=${encodeURIComponent(mention.id)}`
    }
    return null
  }, [])

  const openGeneralMeeting = useCallback(() => {
    setMeetingOpen(true)
  }, [])

  const handleSend = useCallback(async () => {
    if (!selectedConversationId) return
    const normalizedText = composerText.trim()
    if (!normalizedText && composerFiles.length === 0) return

    setSending(true)
    setError(null)

    try {
      let attachments: any[] = []

      if (composerFiles.length > 0) {
        const formData = new FormData()
        formData.append('batchName', `${selectedConversationId}/chat`)
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
          url: getFileUrl(item.key, API_ENV.r2PublicBaseUrl),
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
  }, [selectedConversationId, composerText, composerFiles, composerMentions, resetComposer, refreshMessages, refreshConversations])

  return {
    // State
    fileInputRef,
    bootstrap,
    conversations,
    sortedConversations,
    selectedConversationId,
    messages,
    loadingConversations,
    loadingMessages,
    sending,
    error,
    unreadMessageCounts,
    composerText,
    composerMentions,
    composerFiles,
    emojiAnchorEl,
    mentionDialogOpen,
    mentionType,
    meetingOpen,
    user,

    // Computed values
    usersById,
    selectedConversation,
    isGeneralDiscussionSelected,
    memberList,
    atMentionQuery,
    memberMentionSuggestions,

    // Setters
    setComposerText,
    setEmojiAnchorEl,
    setMentionDialogOpen,
    setMentionType,
    setMeetingOpen,

    // Actions
    getConversationLabel,
    openGeneralDiscussion,
    openDirectConversation,
    handleFileChange,
    removeMention,
    removeComposerFile,
    addEmoji,
    addMention,
    applyMemberMentionFromInput,
    openGeneralMeeting,
    handleSend,
    getMentionHref,
  }
}
