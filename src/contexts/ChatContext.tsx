import { createContext, useContext, type ReactNode } from 'react'
import { useChat } from '../hooks/useChat'

interface ChatContextType extends ReturnType<typeof useChat> { }

const ChatContext = createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const chatData = useChat()

  return (
    <ChatContext.Provider value={chatData}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}
