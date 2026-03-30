import { API_ENV, TOKEN_STORAGE_KEY } from '../config/api'

export type RealtimeScope = 'tasks' | 'files' | 'chat'

export interface RealtimeEvent {
  scope: RealtimeScope
  action: string
  id?: string
  targetUserId?: string
  data?: Record<string, unknown>
  timestamp: string
}

function resolveRealtimeUrl() {
  const base = API_ENV.apiBaseUrl?.trim() || ''

  if (!base) {
    return `${window.location.origin}/api/realtime/stream`
  }

  if (base.startsWith('http://') || base.startsWith('https://')) {
    const normalized = base.endsWith('/') ? base.slice(0, -1) : base
    return `${normalized}/api/realtime/stream`
  }

  return `${window.location.origin}${base.startsWith('/') ? base : `/${base}`}/api/realtime/stream`
}

export function subscribeRealtime(
  onEvent: (event: RealtimeEvent) => void,
  onError?: (error: unknown) => void
) {
  const abortController = new AbortController()
  let closed = false
  let reconnectTimeout: number | null = null

  const connect = async () => {
    if (closed) return

    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY)
      const response = await fetch(resolveRealtimeUrl(), {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: 'no-store',
        signal: abortController.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`Realtime stream failed with status ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (!closed) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const messages = buffer.split('\n\n')
        buffer = messages.pop() ?? ''

        for (const rawMessage of messages) {
          if (!rawMessage || rawMessage.startsWith(':')) continue

          let eventName = 'message'
          const dataLines: string[] = []

          for (const line of rawMessage.split('\n')) {
            if (line.startsWith('event:')) {
              eventName = line.slice('event:'.length).trim()
            }
            if (line.startsWith('data:')) {
              dataLines.push(line.slice('data:'.length).trim())
            }
          }

          if (eventName !== 'update' || dataLines.length === 0) continue

          try {
            const payload = JSON.parse(dataLines.join('\n')) as RealtimeEvent
            onEvent(payload)
          } catch (error) {
            onError?.(error)
          }
        }
      }
    } catch (error) {
      if (!closed && !abortController.signal.aborted) {
        onError?.(error)
      }
    }

    if (!closed && !abortController.signal.aborted) {
      reconnectTimeout = window.setTimeout(() => {
        void connect()
      }, 1500)
    }
  }

  void connect()

  return () => {
    closed = true
    if (reconnectTimeout !== null) {
      window.clearTimeout(reconnectTimeout)
    }
    abortController.abort()
  }
}
