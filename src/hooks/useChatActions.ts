import { useCallback, type ChangeEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  createConversation,
  sendMessage,
  type ChatMention,
  type ChatMentionType,
} from '../api/chatApi'
import { uploadFiles } from '../api/uploadApi'
import { API_ENV } from '../config/api'
import { getFileUrl } from '../utils/chatUtils'
import type { ChatState } from './useChatState'

export function useChatActions(state: ChatState) {
  const { user } = useAuth()

  const {
    bootstrap,
    conversations,
    selectedConversationId,
    composerText,
    composerMentions,
    composerFiles,
    setSending,
    setError,
    setComposerText,
    setComposerMentions,
    setComposerFiles,
    setMeetingOpen,
    setSelectedConversationId,
  } = state

  // Conversation management
  const getConversationLabel = useCallback(
    (conversation: any) => {
      if (conversation.type === 'group') {
        return conversation.title || 'مجموعة بدون اسم'
      }

      // For direct conversations, we'd need to get the other participant's name
      // This would require access to usersById or be passed in
      return 'محادثة مباشرة'
    },
    [user?.id]
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
      // Would need to call refreshConversations here
      setSelectedConversationId(created.id)
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? err.message ?? 'فشل فتح النقاش العام')
    }
  }, [bootstrap.users, conversations, user, setSelectedConversationId, setError])

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
        // Would need to call refreshConversations here
        setSelectedConversationId(created.id)
      } catch (e: unknown) {
        const err = e as { message?: string; response?: { data?: { message?: string } } }
        setError(err.response?.data?.message ?? err.message ?? 'فشل فتح المحادثة المباشرة')
      }
    },
    [conversations, sameParticipants, user, setSelectedConversationId, setError]
  )

  // Composer actions
  const resetComposer = useCallback(() => {
    setComposerText('')
    setComposerMentions([])
    setComposerFiles([])
  }, [setComposerText, setComposerMentions, setComposerFiles])

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || [])
    if (selected.length === 0) return
    setComposerFiles((prev) => [...prev, ...selected])
    event.target.value = ''
  }, [setComposerFiles])

  const addMention = useCallback((type: ChatMentionType, id: string, label: string) => {
    setComposerMentions((prev) => {
      if (prev.some((m) => m.type === type && m.id === id)) return prev
      return [...prev, { type, id, label }]
    })
    state.setMentionDialogOpen(false)
  }, [setComposerMentions, state.setMentionDialogOpen])

  const removeMention = useCallback((mention: ChatMention) => {
    setComposerMentions((prev) => prev.filter((m) => !(m.type === mention.type && m.id === mention.id)))
  }, [setComposerMentions])

  const removeComposerFile = useCallback((index: number) => {
    setComposerFiles((prev) => prev.filter((_, i) => i !== index))
  }, [setComposerFiles])

  const addEmoji = useCallback((emoji: string) => {
    setComposerText((prev) => `${prev}${prev ? ' ' : ''}${emoji}`)
  }, [setComposerText])

  const applyMemberMentionFromInput = useCallback((memberId: string, memberLabel: string) => {
    const mentionText = `@${memberLabel.replace(/\s+/g, '_')}`
    setComposerText((prev) => prev.replace(/(?:^|\s)@([^\s@]{0,30})$/, (full) => {
      const prefix = full.startsWith(' ') ? ' ' : ''
      return `${prefix}${mentionText} `
    }))
    addMention('member', memberId, memberLabel)
  }, [setComposerText, addMention])

  const getMentionHref = useCallback(
    (mention: ChatMention) => {
      if (mention.type === 'task') {
        return `/tasks?taskId=${encodeURIComponent(mention.id)}`
      }

      if (mention.type === 'file') {
        // This would need filesById from useChatData
        return `/upload?fileId=${encodeURIComponent(mention.id)}`
      }

      return null
    },
    []
  )

  // Meeting actions
  const openGeneralMeeting = useCallback(() => {
    setMeetingOpen(true)
  }, [setMeetingOpen])

  // Send message
  const handleSend = useCallback(async (refreshMessages: (conversationId: string) => Promise<void>, refreshConversations: () => Promise<void>) => {
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
  }, [selectedConversationId, composerText, composerFiles, composerMentions, setSending, setError, resetComposer])

  return {
    // Conversation actions
    getConversationLabel,
    sameParticipants,
    openGeneralDiscussion,
    openDirectConversation,

    // Composer actions
    resetComposer,
    handleFileChange,
    addMention,
    removeMention,
    removeComposerFile,
    addEmoji,
    applyMemberMentionFromInput,
    getMentionHref,

    // Meeting actions
    openGeneralMeeting,

    // Send action
    handleSend,
  }
}
