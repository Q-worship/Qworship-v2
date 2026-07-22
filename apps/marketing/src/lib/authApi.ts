const AUTH_TOKEN_KEY = 'authToken'
/** v2 product SPA session key */
const V2_TOKEN_KEY = 'token'
const V2_USER_KEY = 'qworship_user'
const FETCH_TIMEOUT_MS = 15000
const MOCK_DELAY_MS = 400

/** UI preview mode — bypasses real /api/auth calls. Set to false when auth API is live. */
export const MOCK_AUTH = true

export const MOCK_SIGNUP_USER_KEY = 'mock_signup_user'
export const ONBOARDING_COMPLETE_KEY = 'onboarding_complete'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function onboardingCompleteKey(email: string): string {
  return `${ONBOARDING_COMPLETE_KEY}:${normalizeEmail(email)}`
}

export function isOnboardingComplete(email?: string | null): boolean {
  if (email) {
    return sessionStorage.getItem(onboardingCompleteKey(email)) === 'true'
  }
  return sessionStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true'
}

export function setOnboardingComplete(email: string): void {
  sessionStorage.setItem(onboardingCompleteKey(email), 'true')
  sessionStorage.removeItem(ONBOARDING_COMPLETE_KEY)
}

export function resetOnboardingForUser(email: string): void {
  sessionStorage.removeItem(onboardingCompleteKey(email))
  sessionStorage.removeItem(ONBOARDING_COMPLETE_KEY)
}

const NETWORK_ERROR_MESSAGE = 'Unable to reach the server. Please try again.'

export interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role?: string
  organizationName?: string
}

export interface SignUpPayload {
  firstName: string
  lastName: string
  email: string
  password: string
}

export interface SignUpResponse {
  success: boolean
  email?: string
  message?: string
  errorType?: string
}

export interface VerifyEmailPayload {
  email: string
  code: string
}

export interface VerifyEmailResponse {
  success: boolean
  token?: string
  user?: AuthUser
  message?: string
  nextStep?: string
}

export interface ResendVerificationResponse {
  success: boolean
  message?: string
}

export interface SignInPayload {
  email: string
  password: string
}

export interface SignInResponse {
  success: boolean
  token?: string
  user?: AuthUser
  message?: string
  nextStep?: string
}

export function getAuthApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '') ?? ''
  return raw || '/api'
}

function authPath(path: string): string {
  return `${getAuthApiUrl()}${path}`
}

function toAuthError(error: unknown): Error {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new Error(NETWORK_ERROR_MESSAGE)
  }
  if (error instanceof TypeError) {
    return new Error(NETWORK_ERROR_MESSAGE)
  }
  if (error instanceof Error) {
    return error
  }
  return new Error(NETWORK_ERROR_MESSAGE)
}

function mockDelay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), MOCK_DELAY_MS)
  })
}

function readMockSignupUser(email: string): AuthUser {
  try {
    const raw = sessionStorage.getItem(MOCK_SIGNUP_USER_KEY)
    if (raw) {
      const draft = JSON.parse(raw) as {
        firstName?: string
        lastName?: string
        email?: string
      }
      return {
        id: 'mock-user-1',
        email: draft.email ?? email,
        firstName: draft.firstName ?? 'John',
        lastName: draft.lastName ?? 'Doe',
      }
    }
  } catch {
    // ignore parse errors
  }

  return {
    id: 'mock-user-1',
    email,
    firstName: 'John',
    lastName: 'Doe',
  }
}

async function authFetch<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(authPath(path), {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    })

    let data: T & { message?: string }
    try {
      data = (await response.json()) as T & { message?: string }
    } catch {
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`)
      }
      throw new Error(NETWORK_ERROR_MESSAGE)
    }

    if (!response.ok) {
      throw new Error(
        (data as { message?: string }).message ?? `Request failed (${response.status})`,
      )
    }

    return data
  } catch (error) {
    throw toAuthError(error)
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    localStorage.setItem(V2_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(V2_TOKEN_KEY)
  }
}

/** Persist session for marketing site and v2 product app handoff. */
export function persistAuthSession(token: string, user?: AuthUser): void {
  setAuthToken(token)
  if (!user) return

  const userId = String(user.id)
  sessionStorage.setItem('qworship_user_id', userId)
  sessionStorage.setItem('qworship_user_data', JSON.stringify(user))
  localStorage.setItem(V2_USER_KEY, JSON.stringify(user))
}

export function getStoredAuthUser(): AuthUser | null {
  try {
    const raw =
      sessionStorage.getItem('qworship_user_data') ??
      localStorage.getItem(V2_USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function getPostAuthPath(): string {
  const user = getStoredAuthUser()
  if (isOnboardingComplete(user?.email)) {
    return '/account'
  }
  return '/onboarding'
}

export async function signUp(payload: SignUpPayload): Promise<SignUpResponse> {
  if (MOCK_AUTH) {
    return mockDelay({
      success: true,
      email: payload.email.trim().toLowerCase(),
      message: 'Verification code sent.',
    })
  }

  return authFetch<SignUpResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function verifyEmail(
  payload: VerifyEmailPayload,
): Promise<VerifyEmailResponse> {
  if (MOCK_AUTH) {
    const email = payload.email.trim().toLowerCase()
    return mockDelay({
      success: true,
      token: `mock-token-${Date.now()}`,
      user: readMockSignupUser(email),
      nextStep: '/onboarding',
    })
  }

  return authFetch<VerifyEmailResponse>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function resendVerification(
  email: string,
): Promise<ResendVerificationResponse> {
  if (MOCK_AUTH) {
    return mockDelay({
      success: true,
      message: 'Verification code resent.',
    })
  }

  return authFetch<ResendVerificationResponse>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function signIn(payload: SignInPayload): Promise<SignInResponse> {
  const email = payload.email.trim().toLowerCase()

  if (MOCK_AUTH) {
    return mockDelay({
      success: true,
      token: `mock-token-${Date.now()}`,
      user: readMockSignupUser(email),
      nextStep: getPostAuthPath(),
    })
  }

  return authFetch<SignInResponse>('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: payload.password,
    }),
  })
}
