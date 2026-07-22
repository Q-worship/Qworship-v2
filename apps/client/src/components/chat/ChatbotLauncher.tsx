import { chatbotConfig } from '@/lib/chatbot'

interface ChatbotLauncherProps {
  onClick: () => void
}

export function ChatbotLauncher({ onClick }: ChatbotLauncherProps) {
  return (
    <button
      type="button"
      className="chatbot-launcher"
      onClick={onClick}
      aria-label="Open chat with Qworship"
    >
      <img src={chatbotConfig.fabLogo} alt="" className="chatbot-launcher-logo" />
    </button>
  )
}
