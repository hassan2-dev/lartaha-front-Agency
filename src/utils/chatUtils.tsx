const URL_REGEX = /(https?:\/\/[^\s]+)/g

export function linkifyText(text: string) {
  const parts = text.split(URL_REGEX)
  return parts.map((part, idx) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={`${part}_${idx}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          style={{ color: '#42a5f5' }}
        >
          {part}
        </a>
      )
    }
    return (
      <span key={`${part}_${idx}`} style={{ whiteSpace: 'pre-wrap' }}>
        {part}
      </span>
    )
  })
}

export function extractLinks(text: string) {
  const links = text.match(URL_REGEX) || []
  return Array.from(new Set(links))
}

export function getFileUrl(key: string, baseUrl?: string) {
  const base = baseUrl?.trim() || ''
  if (!base) return null
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base
  const safeKey = key.startsWith('/') ? key.slice(1) : key
  return `${normalized}/${safeKey}`
}

interface Attachment {
  mimeType?: string
  name?: string
  key?: string
}

export function isImageAttachment(
  attachment: Attachment | { mimeType?: string | null; name?: string; key?: string }
) {
  const mimeType = attachment.mimeType || ''
  const byMime = (mimeType as string).toLowerCase().startsWith('image/')
  const byName = /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(attachment.name || '')
  const byKey = /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(attachment.key || '')
  return byMime || byName || byKey
}

export const EMOJIS = ['😀', '😂', '😍', '😎', '🤝', '🔥', '🚀', '🎯', '✅', '💡', '🙏', '🎉']
