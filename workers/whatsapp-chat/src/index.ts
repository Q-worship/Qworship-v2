import { ChatSession } from './chat-session'
import type { Env } from './whatsapp'
import { resolveFaqWithAi } from './faq-ai'
import {
  buildAgentNotification,
  isWhatsAppConfigured,
  parseAgentReply,
  sendWhatsAppText,
  verifyWebhookSignature,
  normalizePhone,
} from './whatsapp'

export { ChatSession }

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function json(data: unknown, status = 200): Response {
  return withCors(Response.json(data, { status }))
}

function getSessionStub(env: Env, sessionId: string) {
  const id = env.CHAT_SESSION.idFromName(sessionId)
  return env.CHAT_SESSION.get(id)
}

async function forwardToSession(
  env: Env,
  sessionId: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const stub = getSessionStub(env, sessionId)
  return stub.fetch(`https://chat-session${path}`, init)
}

async function handleRequest(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/chat')) {
    return new Response(null, { headers: corsHeaders })
  }

  if (url.pathname === '/webhooks/whatsapp' && request.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200 })
    }

    return new Response('Forbidden', { status: 403 })
  }

  if (url.pathname === '/webhooks/whatsapp' && request.method === 'POST') {
    const rawBody = await request.text()
    const signature = request.headers.get('X-Hub-Signature-256')
    const valid = await verifyWebhookSignature(rawBody, signature, env.WHATSAPP_APP_SECRET)

    if (!valid) {
      return new Response('Invalid signature', { status: 401 })
    }

    const payload = JSON.parse(rawBody) as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<{
              from: string
              type: string
              text?: { body: string }
            }>
          }
        }>
      }>
    }

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const message of change.value?.messages ?? []) {
          if (message.type !== 'text' || !message.text?.body) continue

          const agentPhone = normalizePhone(env.WHATSAPP_AGENT_PHONE ?? '')
          if (normalizePhone(message.from) !== agentPhone) continue

          const parsed = parseAgentReply(message.text.body)
          if (!parsed) continue

          await forwardToSession(env, parsed.sessionId, '/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'agent', text: parsed.text }),
          })
        }
      }
    }

    return new Response('OK', { status: 200 })
  }

  if (url.pathname === '/api/chat/health' && request.method === 'GET') {
    return json({ ok: true })
  }

  if (url.pathname === '/api/chat/faq-resolve' && request.method === 'POST') {
    const body = (await request.json()) as { query?: string }
    const query = body.query?.trim()

    if (!query) {
      return json({ error: 'query is required' }, 400)
    }

    const result = await resolveFaqWithAi(query, env.AI)
    return json(result)
  }

  if (url.pathname === '/api/chat/sessions' && request.method === 'POST') {
    const body = (await request.json()) as {
      email?: string | null
      query: string
    }

    if (!body.query?.trim()) {
      return json({ error: 'query is required' }, 400)
    }

    const sessionId = crypto.randomUUID()
    const email = body.email?.trim() || null
    const query = body.query.trim()

    await forwardToSession(env, sessionId, '/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, email, query }),
    })

    await forwardToSession(env, sessionId, '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'visitor', text: query }),
    })

    if (isWhatsAppConfigured(env)) {
      await sendWhatsAppText(
        env,
        env.WHATSAPP_AGENT_PHONE!,
        buildAgentNotification(sessionId, email, query, true),
      )
    }

    await env.CHAT_KV.put(`session:${sessionId}`, JSON.stringify({ email, query }))

    return json({ sessionId })
  }

  const sessionMatch = url.pathname.match(/^\/api\/chat\/sessions\/([^/]+)(\/.*)?$/)
  if (sessionMatch) {
    const sessionId = sessionMatch[1]
    const subPath = sessionMatch[2] ?? ''

    if (subPath === '/events' && request.method === 'GET') {
      const response = await forwardToSession(env, sessionId, '/subscribe')
      return withCors(response)
    }

    if (subPath === '/messages' && request.method === 'GET') {
      const response = await forwardToSession(env, sessionId, '/messages')
      return json(await response.json())
    }

    if (subPath === '/messages' && request.method === 'POST') {
      const body = (await request.json()) as { text: string }
      const text = body.text?.trim()
      if (!text) {
        return json({ error: 'text is required' }, 400)
      }

      const response = await forwardToSession(env, sessionId, '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'visitor', text }),
      })

      const result = (await response.json()) as { message: { text: string } }
      const sessionRaw = await env.CHAT_KV.get(`session:${sessionId}`)
      const session = sessionRaw
        ? (JSON.parse(sessionRaw) as { email: string | null })
        : { email: null }

      if (isWhatsAppConfigured(env)) {
        await sendWhatsAppText(
          env,
          env.WHATSAPP_AGENT_PHONE!,
          buildAgentNotification(sessionId, session.email, text),
        )
      }

      return json(result)
    }

    if (subPath === '/agent-reply' && request.method === 'POST') {
      const auth = request.headers.get('Authorization')
      const apiKey = auth?.startsWith('Bearer ') ? auth.slice(7) : null
      if (!env.AGENT_API_KEY || apiKey !== env.AGENT_API_KEY) {
        return json({ error: 'Unauthorized' }, 401)
      }

      const body = (await request.json()) as { text: string }
      const text = body.text?.trim()
      if (!text) {
        return json({ error: 'text is required' }, 400)
      }

      const response = await forwardToSession(env, sessionId, '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'agent', text }),
      })

      return json(await response.json())
    }
  }

  if (url.pathname.startsWith('/api/chat')) {
    return json({ error: 'Not found' }, 404)
  }

  return new Response('Not found', { status: 404 })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const isApiRoute = url.pathname.startsWith('/api/chat')

    try {
      return await handleRequest(request, env, url)
    } catch (error) {
      console.error('Chat worker error:', error)
      if (isApiRoute) {
        return json({ error: 'Internal error' }, 500)
      }
      return new Response('Internal error', { status: 500 })
    }
  },
}
