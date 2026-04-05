import { api } from './http'

export type ChatMentionType = 'task' | 'file' | 'member'

export interface ChatMention {
  type: ChatMentionType
  id: string
  label: string
}

export interface ChatAttachment {
  key: string
  name: string
  size?: number | null
  mimeType?: string | null
  url?: string | null
}

export interface ChatConversation {
  id: string
  type: 'direct' | 'group'
  title?: string | null
  participantIds: string[]
  createdById: string
  createdAt: string
  updatedAt: string
  lastMessageAt?: string | null
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  text: string
  sticker?: string | null
  attachments?: ChatAttachment[]
  mentions?: ChatMention[]
  readBy?: string[] // Array of user IDs who have read this message
  createdAt: string
}

export interface ChatUser {
  id: string
  name: string
  email: string
  avatar?: string | null
  position?: string | null
  isAdmin?: boolean
  isOnline?: boolean
}

export interface ChatTaskRef {
  id: string
  title: string
  status?: string
}

export interface ChatFileRef {
  id: string
  key: string
  name: string
  size?: number
}

export interface ChatBootstrapData {
  users: ChatUser[]
  tasks: ChatTaskRef[]
  files: ChatFileRef[]
}

export interface ChatLivekitSession {
  token: string
  roomName: string
  url: string
}

export async function getChatBootstrap(): Promise<ChatBootstrapData> {
  const res = await api.get('/api/chat/bootstrap')
  return {
    users: (res.data?.users ?? []) as ChatUser[],
    tasks: (res.data?.tasks ?? []) as ChatTaskRef[],
    files: (res.data?.files ?? []) as ChatFileRef[],
  }
}

export async function getConversations(): Promise<ChatConversation[]> {
  const res = await api.get('/api/chat/conversations')
  return (res.data?.conversations ?? []) as ChatConversation[]
}

export async function createConversation(input: {
  type: 'direct' | 'group'
  title?: string
  participantIds: string[]
}): Promise<ChatConversation> {
  const res = await api.post('/api/chat/conversations', input)
  return res.data.conversation as ChatConversation
}

export async function getConversationMessages(id: string, limit: number = 120): Promise<ChatMessage[]> {
  const res = await api.get(`/api/chat/conversations/${id}/messages`, {
    params: { limit },
  })
  return (res.data?.messages ?? []) as ChatMessage[]
}

export async function sendMessage(
  conversationId: string,
  payload: {
    text?: string
    sticker?: string | null
    mentions?: ChatMention[]
    attachments?: ChatAttachment[]
  }
): Promise<ChatMessage> {
  const res = await api.post(`/api/chat/conversations/${conversationId}/messages`, payload)
  return res.data.message as ChatMessage
}

export async function createConversationLivekitSession(conversationId: string): Promise<ChatLivekitSession> {
  const res = await api.post(`/api/chat/conversations/${conversationId}/livekit-token`)
  return {
    token: String(res.data?.token ?? ''),
    roomName: String(res.data?.roomName ?? ''),
    url: String(res.data?.url ?? ''),
  }
}
