export interface ChatMessageRecord {
  id: string
  role: 'visitor' | 'agent'
  text: string
  createdAt: string
}

interface SessionMeta {
  sessionId: string
  email: string | null
  query: string
  createdAt: string
}

type Subscriber = {
  enqueue: (chunk: Uint8Array) => void
  close: () => void
}

export class ChatSession implements DurableObject {
  private messages: ChatMessageRecord[] = []
  private meta: SessionMeta | null = null
  private subscribers = new Set<Subscriber>()

  constructor(private state: DurableObjectState) {
    this.state.blockConcurrencyWhile(async () => {
      const storedMessages = await this.state.storage.get<ChatMessageRecord[]>('messages')
      const storedMeta = await this.state.storage.get<SessionMeta>('meta')
      if (storedMessages) this.messages = storedMessages
      if (storedMeta) this.meta = storedMeta
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/init' && request.method === 'POST') {
      const body = (await request.json()) as {
        sessionId: string
        email: string | null
        query: string
      }
      this.meta = {
        sessionId: body.sessionId,
        email: body.email,
        query: body.query,
        createdAt: new Date().toISOString(),
      }
      await this.state.storage.put('meta', this.meta)
      return Response.json({ ok: true })
    }

    if (url.pathname === '/subscribe' && request.method === 'GET') {
      const encoder = new TextEncoder()
      let cleanup: (() => void) | null = null

      const stream = new ReadableStream({
        start: (controller) => {
          const subscriber: Subscriber = {
            enqueue: (chunk) => controller.enqueue(chunk),
            close: () => controller.close(),
          }
          this.subscribers.add(subscriber)

          for (const message of this.messages) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(message)}\n\n`),
            )
          }

          cleanup = () => {
            this.subscribers.delete(subscriber)
          }
        },
        cancel: () => {
          cleanup?.()
        },
      })

      request.signal.addEventListener('abort', () => cleanup?.())

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    if (url.pathname === '/messages' && request.method === 'GET') {
      return Response.json({ messages: this.messages })
    }

    if (url.pathname === '/messages' && request.method === 'POST') {
      const body = (await request.json()) as { role: 'visitor' | 'agent'; text: string }
      const message = await this.addMessage(body.role, body.text)
      return Response.json({ message })
    }

    if (url.pathname === '/meta' && request.method === 'GET') {
      return Response.json({ meta: this.meta })
    }

    return new Response('Not found', { status: 404 })
  }

  async addMessage(role: 'visitor' | 'agent', text: string): Promise<ChatMessageRecord> {
    const message: ChatMessageRecord = {
      id: crypto.randomUUID(),
      role,
      text,
      createdAt: new Date().toISOString(),
    }

    this.messages.push(message)
    await this.state.storage.put('messages', this.messages)
    this.broadcast(message)
    return message
  }

  private broadcast(message: ChatMessageRecord) {
    const payload = new TextEncoder().encode(`data: ${JSON.stringify(message)}\n\n`)
    for (const subscriber of this.subscribers) {
      try {
        subscriber.enqueue(payload)
      } catch {
        this.subscribers.delete(subscriber)
      }
    }
  }
}
