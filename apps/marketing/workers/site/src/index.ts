interface Env {
  ASSETS: Fetcher
  CHAT_API: Fetcher
  AUTH_API_ORIGIN?: string
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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

function isEventStream(response: Response): boolean {
  const contentType = response.headers.get('Content-Type') ?? ''
  return contentType.includes('text/event-stream')
}

async function proxyChatApi(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const response = await env.CHAT_API.fetch(request)

  // SSE must pass through without re-wrapping the body (same-origin proxy).
  if (isEventStream(response)) {
    return response
  }

  return withCors(response)
}

async function proxyAuthApi(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const origin = env.AUTH_API_ORIGIN?.trim().replace(/\/$/, '')
  if (!origin) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Auth API is not configured. Set AUTH_API_ORIGIN on the site Worker.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  }

  const url = new URL(request.url)
  const targetUrl = new URL(`${url.pathname}${url.search}`, origin)

  const headers = new Headers(request.headers)
  headers.delete('host')

  const response = await fetch(
    new Request(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'manual',
    }),
  )

  return withCors(response)
}

function isSpaRoute(pathname: string): boolean {
  if (pathname === '/') return true
  const lastSegment = pathname.split('/').pop() ?? ''
  return !lastSegment.includes('.')
}

async function fetchAsset(request: Request, env: Env): Promise<Response> {
  let response = await env.ASSETS.fetch(request)

  if (response.status !== 404 || request.method !== 'GET') {
    return response
  }

  const url = new URL(request.url)
  if (!isSpaRoute(url.pathname)) {
    return response
  }

  const indexUrl = new URL('/index.html', url.origin)
  return env.ASSETS.fetch(new Request(indexUrl, request))
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/chat')) {
      return proxyChatApi(request, env)
    }

    if (url.pathname.startsWith('/api/auth')) {
      return proxyAuthApi(request, env)
    }

    return fetchAsset(request, env)
  },
}
