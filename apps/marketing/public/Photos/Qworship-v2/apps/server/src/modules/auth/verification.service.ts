const OTP_TTL_MS = 10 * 60 * 1000

interface VerificationEntry {
  code: string
  expiresAt: number
}

export interface PendingSignup {
  firstName?: string
  lastName?: string
  email: string
  hashedPassword: string
  username?: string
  countryCode?: string
  phoneNumber?: string
  agreeToMarketing?: boolean
  organizationName?: string
  accountType?: string
  isActive?: boolean
  role?: string
  expiresAt: number
}

const verificationCodes = new Map<string, VerificationEntry>()
const pendingSignups = new Map<string, PendingSignup>()

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function storeVerificationCode(email: string, code: string): void {
  const key = normalizeEmail(email)
  verificationCodes.set(key, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
  })
}

export function storePendingSignup(
  email: string,
  data: Omit<PendingSignup, 'email' | 'expiresAt'>,
): void {
  const key = normalizeEmail(email)
  pendingSignups.set(key, {
    ...data,
    email: key,
    expiresAt: Date.now() + OTP_TTL_MS,
  })
}

export function getPendingSignup(email: string): PendingSignup | null {
  const key = normalizeEmail(email)
  const entry = pendingSignups.get(key)

  if (!entry) {
    return null
  }

  if (Date.now() > entry.expiresAt) {
    pendingSignups.delete(key)
    clearVerificationCode(key)
    return null
  }

  return entry
}

export function clearPendingSignup(email: string): void {
  pendingSignups.delete(normalizeEmail(email))
}

export function sendVerificationCode(email: string, code: string): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[dev] Verification code for ${email}: ${code}`)
  }
  // Production email delivery can be wired here when available.
}

export function verifyStoredCode(email: string, code: string): boolean {
  const key = normalizeEmail(email)
  const entry = verificationCodes.get(key)

  if (!entry) {
    return false
  }

  if (Date.now() > entry.expiresAt) {
    verificationCodes.delete(key)
    return false
  }

  if (entry.code !== code.trim()) {
    return false
  }

  verificationCodes.delete(key)
  return true
}

export function clearVerificationCode(email: string): void {
  verificationCodes.delete(normalizeEmail(email))
}
