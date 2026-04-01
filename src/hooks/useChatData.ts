import { useCallback, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getChatBootstrap,
  getConversationMessages,
  getConversations,
} from '../api/chatApi'
import { subscribeRealtime } from '../api/realtimeApi'
import type { ChatState } from './useChatState'

export function useChatData(state: ChatState) {
  const { user } = useAuth()

  const {
    bootstrap,
    conversations,
    selectedConversationId,
    setBootstrap,
    setConversations,
    setSelectedConversationId,
    setMessages,
    setLoadingConversations,
    setLoadingMessages,
    setError,
  } = state

  // Computed values
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
    const match = state.composerText.match(/(?:^|\s)@([^\s@]{0,30})$/)
    if (!match) return null
    return match[1] ?? ''
  }, [state.composerText])

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

  // Data fetching functions
  const refreshBootstrap = useCallback(async () => {
    const data = await getChatBootstrap()
    setBootstrap(data)
  }, [setBootstrap])

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
  }, [selectedConversationId, setConversations, setSelectedConversationId, setLoadingConversations])

  const refreshMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true)
    try {
      const data = await getConversationMessages(conversationId, 120)
      setMessages(data)
    } finally {
      setLoadingMessages(false)
    }
  }, [setMessages, setLoadingMessages])

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
  }, [refreshBootstrap, refreshConversations, setError])

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

  return {
    // Computed values
    usersById,
    selectedConversation,
    isGeneralDiscussionSelected,
    memberList,
    filesById,
    atMentionQuery,
    memberMentionSuggestions,

    // Data fetching functions
    refreshBootstrap,
    refreshConversations,
    refreshMessages,
  }
}
