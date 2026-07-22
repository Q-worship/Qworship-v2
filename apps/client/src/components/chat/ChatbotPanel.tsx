import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ChatMessage, ChatMode } from '@/hooks/useChatbot'
import { ChatbotFaqDrawer } from './ChatbotFaqDrawer'
import { ChatbotMessageList } from './ChatbotMessageList'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { chatbotConfig } from '@/lib/chatbot'

interface ChatbotPanelProps {
  isMinimized: boolean
  isFaqOpen: boolean
  chatMode: ChatMode
  isAgentSearching: boolean
  isResolving: boolean
  messages: ChatMessage[]
  onClose: () => void
  onMinimize: () => void
  onRestore: () => void
  onToggleFaq: () => void
  onCloseFaq: () => void
  onSendMessage: (text: string) => void
  onSelectFaq: (question: string, answer: string) => void
  onAgentSearchComplete: (query: string) => void
  onReturnToBot: () => void
  onCancelAgentHandoff: () => void
}

export function ChatbotPanel({
  isMinimized,
  isFaqOpen,
  chatMode,
  isAgentSearching,
  isResolving,
  messages,
  onClose,
  onMinimize,
  onRestore,
  onToggleFaq,
  onCloseFaq,
  onSendMessage,
  onSelectFaq,
  onAgentSearchComplete,
  onReturnToBot,
  onCancelAgentHandoff,
}: ChatbotPanelProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const hasUserMessage = messages.some((message) => message.role === 'user')
  const faqLocked = chatMode === 'agent' || isAgentSearching || isResolving

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!input.trim() || isAgentSearching || isResolving) return
    onSendMessage(input)
    setInput('')
  }

  useEffect(() => {
    if (!isMinimized && !isFaqOpen && !isAgentSearching && !isResolving) {
      inputRef.current?.focus()
    }
  }, [isAgentSearching, isMinimized, isFaqOpen, isResolving, messages.length])

  return (
    <div className={`chatbot-panel${isMinimized ? ' chatbot-panel--minimized' : ''}`}>
      <header className="chatbot-panel-header">
        <button
          type="button"
          className="chatbot-panel-header-btn"
          onClick={onToggleFaq}
          aria-label="Browse frequently asked questions"
          disabled={faqLocked}
        >
          <MaterialIcon name="menu" className="chatbot-panel-header-icon" />
        </button>

        <h2 className="chatbot-panel-title">Chat with Qworship</h2>

        <div className="chatbot-panel-header-actions">
          <button
            type="button"
            className="chatbot-panel-header-btn"
            onClick={isMinimized ? onRestore : onMinimize}
            aria-label={isMinimized ? 'Restore chat' : 'Minimize chat'}
          >
            <MaterialIcon name="remove" className="chatbot-panel-header-icon" />
          </button>
          <button
            type="button"
            className="chatbot-panel-header-btn"
            onClick={onClose}
            aria-label="Close chat"
          >
            <MaterialIcon name="close" className="chatbot-panel-header-icon" />
          </button>
        </div>
      </header>

      {!isMinimized && (
        <>
          <div className="chatbot-panel-body">
            <ChatbotMessageList
              messages={messages}
              onAgentSearchComplete={onAgentSearchComplete}
            />

            {isFaqOpen && !faqLocked && (
              <ChatbotFaqDrawer onClose={onCloseFaq} onSelectFaq={onSelectFaq} />
            )}
          </div>

          <footer className="chatbot-panel-footer">
            {isAgentSearching ? (
              <div className="chatbot-mode-switch">
                <p className="chatbot-agent-footer-note">
                  Connecting you with the next available agent…
                </p>
                <button
                  type="button"
                  className="chatbot-mode-switch-btn"
                  onClick={onCancelAgentHandoff}
                >
                  Keep chatting with the assistant
                </button>
              </div>
            ) : isResolving ? (
              <p className="chatbot-agent-footer-note">Looking that up…</p>
            ) : (
              <>
                {chatMode === 'agent' && (
                  <div className="chatbot-mode-switch">
                    <p className="chatbot-agent-footer-note">
                      Chatting with customer care — replies appear here.
                    </p>
                    <button
                      type="button"
                      className="chatbot-mode-switch-btn"
                      onClick={onReturnToBot}
                    >
                      Back to Qworship assistant
                    </button>
                  </div>
                )}

                {!hasUserMessage && chatMode === 'bot' && (
                  <p className="chatbot-privacy">
                    By using this chatbot, you agree to your data being processed by third parties as
                    described in our{' '}
                    <a href={chatbotConfig.privacyPolicyHref} className="chatbot-privacy-link">
                      Privacy Policy
                    </a>
                  </p>
                )}

                <form className="chatbot-input-form" onSubmit={handleSubmit}>
                  <div className="chatbot-input-wrap">
                    <MaterialIcon name="attach_file" className="chatbot-input-attach" aria-hidden />
                    <input
                      ref={inputRef}
                      type="text"
                      className="chatbot-input"
                      placeholder={
                        chatMode === 'agent'
                          ? 'Message customer care…'
                          : 'Ask a detailed question'
                      }
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      aria-label="Chat message"
                    />
                  </div>
                </form>
              </>
            )}
          </footer>
        </>
      )}
    </div>
  )
}
