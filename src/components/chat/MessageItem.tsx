import { linkifyText, extractLinks, getFileUrl, isImageAttachment } from '../../utils/chatUtils'
import type { ChatMessage, ChatMention, ChatUser } from '../../api/chatApi'

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  className?: string
}

function Tooltip({ children, content, className = '' }: TooltipProps) {
  return (
    <div className={`group relative inline-block ${className}`}>
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div className="bg-gray-900 text-white text-sm rounded-lg shadow-lg p-2 min-w-[220px] cursor-pointer">
          {content}
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
          <div className="border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  )
}

interface MessageItemProps {
  message: ChatMessage
  isMine: boolean
  sender: ChatUser | undefined
  isGeneralDiscussionSelected: boolean
  usersById: Map<string, ChatUser>
  onOpenDirectConversation: (memberId: string) => void
  getMentionHref: (mention: ChatMention) => string | null
}

export default function MessageItem({
  message,
  isMine,
  sender,
  isGeneralDiscussionSelected,
  usersById,
  onOpenDirectConversation,
  getMentionHref,
}: MessageItemProps) {
  const linkPreviews = extractLinks(message.text || '')

  return (
    <div className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[78%] min-w-40 p-4 rounded-lg ${isMine
          ? 'bg-slate-700 text-white'
          : 'bg-slate-800 text-slate-100 border border-slate-600'
          }`}
      >
        {isGeneralDiscussionSelected && <div className="flex items-center gap-1.5 mb-2 translate-x-1">
          <div className="relative w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text font-medium overflow-hidden">
            {sender?.avatar ? (
              <img
                src={sender.avatar}
                alt={sender.name || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className='translate-y-0.5 text-sm'>{(sender?.name || 'U').charAt(0).toUpperCase()}</span>
            )}
          </div>

          <span className="text-xs opacity-85 font-bold">
            {sender?.name?.split(' ')[0] || 'مستخدم'}
          </span>
        </div>}

        {message.text && (
          <div className="text-sm wrap-break-word mt-2.5 mb-0.5">
            {linkifyText(message.text)}
          </div>
        )}

        {linkPreviews.length > 0 && (
          <div className="space-y-3 mt-4">
            {linkPreviews.map((link) => (
              <a
                key={`${message.id}_${link}`}
                href={link}
                target="_blank"
                rel="noreferrer"
                className={`block p-4 no-underline rounded-lg ${isMine
                  ? 'bg-white/18'
                  : 'bg-white/4'
                  }`}
              >
                <div className="text-xs opacity-90 block mb-1">
                  رابط
                </div>
                <div className={`text-sm wrap-break-word ${isMine ? 'text-inherit' : 'text-slate-300'
                  }`}>
                  {link}
                </div>
              </a>
            ))}
          </div>
        )}

        {Array.isArray(message.mentions) && message.mentions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {message.mentions.map((mention, idx) => {
              const key = `${message.id}_${mention.type}_${mention.id}_${idx}`

              if (mention.type === 'member') {
                const member = usersById.get(mention.id)
                const memberStatusText = member?.isOnline ? 'Online' : 'Offline'
                const memberPosition = member?.position || 'Team Member'

                return (
                  <Tooltip
                    key={key}
                    content={
                      <div
                        onClick={(event: React.MouseEvent) => {
                          event.stopPropagation()
                          onOpenDirectConversation(mention.id)
                        }}
                        className="min-w-[220px] p-4 rounded-lg cursor-pointer flex items-center gap-4"
                      >
                        <div className="relative w-[34px] h-[34px] rounded-full bg-gray-600 flex items-center justify-center text-sm font-medium overflow-hidden">
                          {member?.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member?.name || mention.label || 'User'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{(member?.name || mention.label || 'U').charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold">
                            {member?.name || mention.label}
                          </div>
                          <div className="text-xs opacity-85 block">
                            {memberPosition}
                          </div>
                          <div className="text-xs opacity-85 block">
                            {memberStatusText}
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-600 text-white">
                      @ {mention.label}
                    </span>
                  </Tooltip>
                )
              }

              const href = getMentionHref(mention)
              return (
                <span
                  key={key}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-600 text-white ${href ? 'cursor-pointer hover:bg-slate-500' : ''
                    }`}
                  onClick={href ? () => window.open(href, '_blank', 'noopener,noreferrer') : undefined}
                >
                  {mention.type === 'task' ? '#' : '📎'} {mention.label}
                </span>
              )
            })}
          </div>
        )}

        {Array.isArray(message.attachments) && message.attachments.length > 0 && (
          <div className="space-y-2 mt-4">
            {message.attachments.map((attachment, idx) => {
              const attachmentUrl = attachment.url || getFileUrl(attachment.key)

              if (!attachmentUrl) {
                return (
                  <span
                    key={`${message.id}_attachment_${idx}`}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs border border-gray-600 text-gray-300"
                  >
                    📎 {attachment.name}
                  </span>
                )
              }

              return (
                <div key={`${message.id}_attachment_${idx}`} className="space-y-2">
                  {isImageAttachment(attachment) && (
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full max-w-[260px] rounded-lg overflow-hidden border border-gray-700"
                    >
                      <img
                        src={attachmentUrl}
                        alt={attachment.name}
                        className="w-full h-auto block"
                      />
                    </a>
                  )}
                  <a
                    href={attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-3 py-2 rounded-lg text-xs border border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500 justify-start"
                  >
                    📎 {attachment.name}
                  </a>
                </div>
              )
            })}
          </div>
        )}
        <div className='flex items-center gap-1.5 opacity-80'>
          <span className="text-xs opacity-75 mt-2 block">
            {new Date(message.createdAt).toLocaleString('ar-SA', {
              day: '2-digit',
              month: '2-digit',
            })}
          </span>

          <span className="text-xs opacity-75 mt-2 block">
            {new Date(message.createdAt).toLocaleString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>


      </div>
    </div>
  )
}
