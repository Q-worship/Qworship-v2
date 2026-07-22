import { buildAgentHandoffMessage } from '@/lib/chatbot'

export interface ChatMessageRecord {
  id: string
  role: 'visitor' | 'agent'
  text: string
  createdAt: string
}

const SESSION_STORAGE_KEY = 'qworship-chat-session-id'
const FETCH_TIMEOUT_MS = 8000
const HEALTH_CHECK_TIMEOUT_MS = 3000

const PLACEHOLDER_HOST_PATTERNS = [
  /your[-_]account[-_]subdomain/i,
  /your[-_]subdomain/i,
]

export function isValidChatApiUrl(url: string): boolean {
  if (!url || url !== url.trim() || url.includes('<') || url.includes('>')) {
    return false
  }

  try {
    const parsed = new URL(url)
    const host = parsed.hostname

    if (PLACEHOLDER_HOST_PATTERNS.some((pattern) => pattern.test(host) || pattern.test(url))) {
      return false
    }

    if (parsed.protocol === 'http:') {
      return host === 'localhost' || host === '127.0.0.1'
    }

    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function getChatApiUrl(): string {
  const raw = import.meta.env.VITE_CHAT_API_URL?.trim().replace(/\/$/, '') ?? ''
  if (!raw) {
    return ''
  }
  return isValidChatApiUrl(raw) ? raw : ''
}

export function isWhatsAppChatConfigured(): boolean {
  const raw = import.meta.env.VITE_CHAT_API_URL?.trim() ?? ''
  if (!raw) {
    return true
  }
  return isValidChatApiUrl(raw)
}

function chatApiPath(path: string): string {
  const base = getChatApiUrl()
  return `${base}${path}`
}

export function loadStoredSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY)
  } catch {
    return null
  }
}

export function storeSessionId(sessionId: string) {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId)
  } catch {
    // ignore storage errors
  }
}

export function clearStoredSessionId() {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // ignore storage errors
  }
}

export type FaqResolveResponse =
  | { type: 'faq'; faqId: string; answer: string }
  | { type: 'handoff' }

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function checkChatApiHealth(): Promise<boolean> {
  if (!isWhatsAppChatConfigured()) {
    return false
  }

  try {
    const response = await fetchWithTimeout(
      chatApiPath('/api/chat/health'),
      { method: 'GET' },
      HEALTH_CHECK_TIMEOUT_MS,
    )

    if (!response.ok) {
      return false
    }

    const data = (await response.json()) as { ok?: boolean }
    return data.ok === true
  } catch {
    return false
  }
}

export async function resolveFaqWithAi(query: string): Promise<FaqResolveResponse | null> {
  if (!isWhatsAppChatConfigured()) {
    return null
  }

  try {
    const response = await fetchWithTimeout(chatApiPath('/api/chat/faq-resolve'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) return null

    return (await response.json()) as FaqResolveResponse
  } catch {
    return null
  }
}

export async function createChatSession(
  email: string | null,
  query: string,
): Promise<string | null> {
  if (!isWhatsAppChatConfigured()) {
    return null
  }

  try {
    const response = await fetchWithTimeout(chatApiPath('/api/chat/sessions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, query }),
    })

    if (!response.ok) return null

    const data = (await response.json()) as { sessionId: string }
    storeSessionId(data.sessionId)
    return data.sessionId
  } catch {
    return null
  }
}

export async function sendVisitorMessage(sessionId: string, text: string): Promise<boolean> {
  if (!isWhatsAppChatConfigured()) {
    return false
  }

  try {
    const response = await fetch(chatApiPath(`/api/chat/sessions/${sessionId}/messages`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    return response.ok
  } catch {
    return false
  }
}

export function subscribeToSession(
  sessionId: string,
  onAgentMessage: (message: ChatMessageRecord) => void,
): () => void {
  if (!isWhatsAppChatConfigured()) {
    return () => undefined
  }

  const seenIds = new Set<string>()
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let stopped = false

  const deliverAgentMessage = (message: ChatMessageRecord) => {
    if (message.role !== 'agent' || seenIds.has(message.id)) {
      return
    }
    seenIds.add(message.id)
    onAgentMessage(message)
  }

  const pollMessages = async () => {
    if (stopped) return
    try {
      const response = await fetch(
        chatApiPath(`/api/chat/sessions/${sessionId}/messages`),
      )
      if (!response.ok) return
      const data = (await response.json()) as { messages: ChatMessageRecord[] }
      for (const message of data.messages) {
        deliverAgentMessage(message)
      }
    } catch {
      // ignore transient poll errors
    }
  }

  const startPolling = () => {
    if (pollTimer) return
    void pollMessages()
    pollTimer = setInterval(() => {
      void pollMessages()
    }, 3000)
  }

  const stop = () => {
    stopped = true
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  try {
    const source = new EventSource(chatApiPath(`/api/chat/sessions/${sessionId}/events`))

    source.onmessage = (event) => {
      try {
        deliverAgentMessage(JSON.parse(event.data) as ChatMessageRecord)
      } catch {
        // ignore malformed events
      }
    }

    source.onerror = () => {
      source.close()
      startPolling()
    }

    return () => {
      source.close()
      stop()
    }
  } catch {
    startPolling()
    return stop
  }
}

export async function initWhatsAppChatHandoff({
  email,
  query,
}: {
  email: string | null
  query: string
}): Promise<{ connected: boolean; sessionId: string | null }> {
  if (!isWhatsAppChatConfigured()) {
    return { connected: false, sessionId: null }
  }

  const sessionId = await createChatSession(email, query)
  if (!sessionId) {
    return { connected: false, sessionId: null }
  }

  return { connected: true, sessionId }
}

export { buildAgentHandoffMessage }
