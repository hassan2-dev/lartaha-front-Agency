import { useState, useRef } from 'react'
import type { ChatBootstrapData, ChatConversation, ChatMessage, ChatMention } from '../api/chatApi'

export function useChatState() {
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  return {
    // Refs
    fileInputRef,

    // State
    bootstrap,
    conversations,
    selectedConversationId,
    messages,
    loadingConversations,
    loadingMessages,
    sending,
    error,
    composerText,
    composerMentions,
    composerFiles,
    emojiAnchorEl,
    mentionDialogOpen,
    mentionType,
    meetingOpen,

    // Setters
    setBootstrap,
    setConversations,
    setSelectedConversationId,
    setMessages,
    setLoadingConversations,
    setLoadingMessages,
    setSending,
    setError,
    setComposerText,
    setComposerMentions,
    setComposerFiles,
    setEmojiAnchorEl,
    setMentionDialogOpen,
    setMentionType,
    setMeetingOpen,
  }
}

export type ChatState = ReturnType<typeof useChatState>
