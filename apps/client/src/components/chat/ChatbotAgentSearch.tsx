import { useEffect, useRef, useState } from 'react'
import { agentSearchDurationMs } from '@/lib/chatbot'

interface ChatbotAgentSearchProps {
  durationMs?: number
  onComplete: () => void
}

export function ChatbotAgentSearch({
  durationMs = agentSearchDurationMs,
  onComplete,
}: ChatbotAgentSearchProps) {
  const [progress, setProgress] = useState(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)

  onCompleteRef.current = onComplete

  useEffect(() => {
    const start = performance.now()
    let frameId = 0

    const tick = (now: number) => {
      const elapsed = now - start
      const pct = Math.min(100, (elapsed / durationMs) * 100)
      setProgress(pct)

      if (pct >= 100) {
        if (!completedRef.current) {
          completedRef.current = true
          onCompleteRef.current()
        }
        return
      }

      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [durationMs])

  return (
    <div className="chatbot-agent-search" role="status" aria-live="polite">
      <div className="chatbot-agent-search-track" aria-hidden>
        <div className="chatbot-agent-search-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="chatbot-agent-search-label">
        Please wait while we find the next available agent
      </p>
    </div>
  )
}
