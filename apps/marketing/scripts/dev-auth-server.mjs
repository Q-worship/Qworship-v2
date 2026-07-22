/**
 * Local in-memory auth API fallback (port 5000).
 * Prefer `npm run dev:auth-api` (real Qworship v2 + MongoDB).
 * Use this only when MongoDB is unavailable: `npm run dev:auth-api:mock`
 */
import http from 'node:http'
import crypto from 'node:crypto'

const PORT = Number(process.env.AUTH_DEV_PORT || 5000)
const OTP_TTL_MS = 10 * 60 * 1000

/** @type {Map<string, { code: string, expiresAt: number }>} */
const verificationCodes = new Map()

/** @type {Map<string, { data: Record<string, unknown>; expiresAt: number }>} */
const pendingSignups = new Map()

/** @type {Map<string, { id: string; email: string; firstName?: string; lastName?: string }>} */
const registeredUsers = new Map()

function normalizeEmail(email) {
  return String(email).trim().toLowerCase()
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function storeVerificationCode(email, code) {
  verificationCodes.set(normalizeEmail(email), {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
  })
}

function verifyStoredCode(email, code) {
  const key = normalizeEmail(email)
  const entry = verificationCodes.get(key)
  if (!entry || Date.now() > entry.expiresAt) {
    verificationCodes.delete(key)
    return false
  }
  if (entry.code !== String(code).trim()) {
    return false
  }
  verificationCodes.delete(key)
  return true
}

function storePendingSignup(email, data) {
  pendingSignups.set(normalizeEmail(email), {
    data,
    expiresAt: Date.now() + OTP_TTL_MS,
  })
}

function getPendingSignup(email) {
  const key = normalizeEmail(email)
  const entry = pendingSignups.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    pendingSignups.delete(key)
    return null
  }
  return entry.data
}

function clearPendingSignup(email) {
  pendingSignups.delete(normalizeEmail(email))
}

function sendVerificationCode(email, code) {
  console.log(`[dev-auth] Verification code for ${email}: ${code}`)
}

function makeToken(user) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, role: 'user' })).toString('base64url')
  return `dev.${payload}.${crypto.randomBytes(16).toString('hex')}`
}

function json(res, status, body) {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  res.end(data)
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return null
  }
}

async function handleSignUp(body, res) {
  const { email, password, firstName, lastName } = body ?? {}
  if (!email || !password) {
    return json(res, 400, { success: false, message: 'Email and password are required' })
  }

  const normalizedEmail = normalizeEmail(email)
  if (registeredUsers.has(normalizedEmail)) {
    return json(res, 400, {
      success: false,
      message: 'Email already in use',
      errorType: 'DUPLICATE_EMAIL',
    })
  }

  storePendingSignup(normalizedEmail, {
    firstName,
    lastName,
    email: normalizedEmail,
    password,
  })

  const code = generateVerificationCode()
  storeVerificationCode(normalizedEmail, code)
  sendVerificationCode(normalizedEmail, code)

  return json(res, 201, {
    success: true,
    email: normalizedEmail,
    message: 'Verification code sent to your email.',
    nextStep: '/verify',
  })
}

async function handleVerifyEmail(body, res) {
  const { email, code } = body ?? {}
  if (!email || !code) {
    return json(res, 400, {
      success: false,
      message: 'Email and verification code are required',
    })
  }

  const normalizedEmail = normalizeEmail(email)
  const pending = getPendingSignup(normalizedEmail)
  if (!pending) {
    return json(res, 404, {
      success: false,
      message: 'No pending sign-up found for this email. Please sign up again.',
    })
  }

  if (!verifyStoredCode(normalizedEmail, code)) {
    return json(res, 400, {
      success: false,
      message: 'Invalid or expired verification code',
    })
  }

  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    firstName: pending.firstName,
    lastName: pending.lastName,
  }

  registeredUsers.set(normalizedEmail, user)
  clearPendingSignup(normalizedEmail)

  return json(res, 200, {
    success: true,
    token: makeToken(user),
    user,
    nextStep: '/dashboard',
  })
}

async function handleResendVerification(body, res) {
  const { email } = body ?? {}
  if (!email) {
    return json(res, 400, { success: false, message: 'Email is required' })
  }

  const normalizedEmail = normalizeEmail(email)
  if (!getPendingSignup(normalizedEmail)) {
    return json(res, 404, {
      success: false,
      message: 'No pending sign-up found for this email. Please sign up again.',
    })
  }

  const code = generateVerificationCode()
  storeVerificationCode(normalizedEmail, code)
  sendVerificationCode(normalizedEmail, code)

  return json(res, 200, { success: true, message: 'Verification code resent.' })
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })
    return res.end()
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  const { pathname } = url

  if (req.method === 'POST' && pathname === '/api/auth/signup') {
    const body = await readBody(req)
    if (body === null) return json(res, 400, { success: false, message: 'Invalid JSON body' })
    return handleSignUp(body, res)
  }

  if (req.method === 'POST' && pathname === '/api/auth/verify-email') {
    const body = await readBody(req)
    if (body === null) return json(res, 400, { success: false, message: 'Invalid JSON body' })
    return handleVerifyEmail(body, res)
  }

  if (req.method === 'POST' && pathname === '/api/auth/resend-verification') {
    const body = await readBody(req)
    if (body === null) return json(res, 400, { success: false, message: 'Invalid JSON body' })
    return handleResendVerification(body, res)
  }

  return json(res, 404, { success: false, message: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`[dev-auth] Auth API listening on http://localhost:${PORT}`)
  console.log('[dev-auth] Routes: POST /api/auth/signup, /api/auth/verify-email, /api/auth/resend-verification')
})
