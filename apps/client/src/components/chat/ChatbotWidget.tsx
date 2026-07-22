import { ChatbotLauncher } from './ChatbotLauncher'
import { ChatbotPanel } from './ChatbotPanel'
import { useChatbot } from '@/hooks/useChatbot'

export function ChatbotWidget() {
  const chatbot = useChatbot()

  return (
    <>
      {!chatbot.isOpen && (
        <ChatbotLauncher onClick={chatbot.open} />
      )}

      {chatbot.isOpen && (
        <ChatbotPanel
          isMinimized={chatbot.isMinimized}
          isFaqOpen={chatbot.isFaqOpen}
          chatMode={chatbot.chatMode}
          isAgentSearching={chatbot.isAgentSearching}
          isResolving={chatbot.isResolving}
          messages={chatbot.messages}
          onClose={chatbot.close}
          onMinimize={chatbot.minimize}
          onRestore={chatbot.restore}
          onToggleFaq={chatbot.toggleFaq}
          onCloseFaq={chatbot.closeFaq}
          onSendMessage={chatbot.sendMessage}
          onSelectFaq={chatbot.selectFaq}
          onAgentSearchComplete={chatbot.completeAgentHandoff}
          onReturnToBot={chatbot.returnToBot}
          onCancelAgentHandoff={chatbot.cancelAgentHandoff}
        />
      )}
    </>
  )
}
