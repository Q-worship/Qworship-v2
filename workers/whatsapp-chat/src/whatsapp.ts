export interface Env {
  WHATSAPP_TOKEN?: string
  WHATSAPP_PHONE_NUMBER_ID?: string
  WHATSAPP_VERIFY_TOKEN?: string
  WHATSAPP_APP_SECRET?: string
  WHATSAPP_AGENT_PHONE?: string
  AGENT_API_KEY?: string
  CHAT_SESSION: DurableObjectNamespace
  CHAT_KV: KVNamespace
  AI: Ai
}

export function isWhatsAppConfigured(env: Env): boolean {
  return Boolean(
    env.WHATSAPP_TOKEN &&
      env.WHATSAPP_PHONE_NUMBER_ID &&
      env.WHATSAPP_AGENT_PHONE,
  )
}

export async function sendWhatsAppText(
  env: Env,
  to: string,
  body: string,
): Promise<boolean> {
  if (!isWhatsAppConfigured(env)) {
    return false
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizePhone(to),
        type: 'text',
        text: { body },
      }),
    },
  )

  return response.ok
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export async function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  appSecret: string | undefined,
): Promise<boolean> {
  if (!appSecret || !signatureHeader?.startsWith('sha256=')) {
    return !appSecret
  }

  const expected = signatureHeader.slice('sha256='.length)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  )
  const hex = [...new Uint8Array(signed)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return timingSafeEqual(hex, expected)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export function buildAgentNotification(
  sessionId: string,
  email: string | null,
  text: string,
  isInitial = false,
): string {
  const header = isInitial ? 'New Q-worship support request' : 'Q-worship visitor message'
  const lines = [
    header,
    `Session: ${sessionId}`,
    email ? `Email: ${email}` : null,
    '',
    text,
    '',
    `Reply with: /reply ${sessionId} your message`,
  ].filter((line) => line !== null)

  return lines.join('\n')
}

export function parseAgentReply(
  body: string,
): { sessionId: string; text: string } | null {
  const match = body.match(/^\/reply\s+([a-zA-Z0-9-]+)\s+([\s\S]+)$/i)
  if (!match) return null
  return { sessionId: match[1], text: match[2].trim() }
}
