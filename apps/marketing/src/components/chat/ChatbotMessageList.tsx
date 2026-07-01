import { useEffect, useRef } from 'react'
import type { ChatMessage } from '@/hooks/useChatbot'
import { chatbotConfig } from '@/lib/chatbot'
import { ChatbotAgentSearch } from './ChatbotAgentSearch'

interface ChatbotMessageListProps {
  messages: ChatMessage[]
  onAgentSearchComplete: (query: string) => void
}

export function ChatbotMessageList({
  messages,
  onAgentSearchComplete,
}: ChatbotMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sessionTimestamp = messages[0]?.timestamp ?? ''

  return (
    <div className="chatbot-messages">
      {sessionTimestamp && (
        <p className="chatbot-messages-timestamp">{sessionTimestamp}</p>
      )}

      {messages.map((message) => {
        if (message.kind === 'agentSearch') {
          return (
            <div key={message.id} className="chatbot-message chatbot-message--system">
              <ChatbotAgentSearch
                onComplete={() => {
                  void Promise.resolve(
                    onAgentSearchComplete(message.handoffQuery ?? ''),
                  ).catch(() => undefined)
                }}
              />
            </div>
          )
        }

        const displayRole = message.role === 'agent' ? 'agent' : message.role

        return (
          <div
            key={message.id}
            className={`chatbot-message chatbot-message--${displayRole}`}
          >
            {(message.role === 'bot' || message.role === 'agent') && (
              <span className="chatbot-message-avatar-wrap">
                <img
                  src={chatbotConfig.botAvatarLogo}
                  alt=""
                  className="chatbot-message-avatar"
                />
              </span>
            )}

            <div className="chatbot-message-content">
              {message.role === 'agent' && (
                <p className="chatbot-message-sender">Customer care</p>
              )}
              <p className="chatbot-message-text">{message.text}</p>
              {message.whatsappUrl && (
                <a
                  href={message.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chatbot-whatsapp-link"
                >
                  Continue on WhatsApp ({chatbotConfig.whatsappDisplayNumber})
                </a>
              )}
            </div>
          </div>
        )
      })}

      <div ref={bottomRef} />
    </div>
  )
}
