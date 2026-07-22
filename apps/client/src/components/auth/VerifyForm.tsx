import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { useLocation } from 'wouter'
import { persistAuthSession, resendVerification, resetOnboardingForUser, verifyEmail } from '@/lib/authApi'

const OTP_LENGTH = 6

function getEmailFromQuery(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('email')?.trim() ?? sessionStorage.getItem('verifyEmail') ?? ''
}

export function VerifyForm() {
  const [, setLocation] = useLocation()
  const [email, setEmail] = useState('')
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const resolvedEmail = getEmailFromQuery()
    if (!resolvedEmail) {
      setLocation('/signup')
      return
    }
    setEmail(resolvedEmail)
    sessionStorage.setItem('verifyEmail', resolvedEmail)
  }, [setLocation])

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus()
  }

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setError('')

    if (digit && index < OTP_LENGTH - 1) {
      focusInput(index + 1)
    }
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      focusInput(index - 1)
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return

    const next = Array(OTP_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i += 1) {
      next[i] = pasted[i]
    }
    setDigits(next)
    focusInput(Math.min(pasted.length, OTP_LENGTH - 1))
  }

  const handleResend = async () => {
    if (!email || isResending) return

    setIsResending(true)
    setError('')
    setSuccess('')

    try {
      const response = await resendVerification(email)
      setSuccess(response.message ?? 'Verification code resent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code.')
    } finally {
      setIsResending(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const code = digits.join('')
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the full 6-digit code.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await verifyEmail({ email, code })

      if (!response.success || !response.token) {
        setError(response.message ?? 'Verification failed. Please try again.')
        return
      }

      persistAuthSession(response.token, response.user)
      resetOnboardingForUser(email)
      sessionStorage.removeItem('verifyEmail')
      setLocation('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!email) {
    return null
  }

  return (
    <div className="login-form login-form--verify">
      <h1 className="login-form__title">Let&apos;s verify account</h1>
      <p className="verify-form__subtitle">
        Please share the 6 digit code sent to{' '}
        <span className="verify-form__email">{email}</span>
      </p>

      <form className="login-form__fields" onSubmit={handleSubmit}>
        <div className="login-form__field">
          <label className="login-form__label">Please enter code</label>
          <div className="verify-form__otp" role="group" aria-label="Verification code">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className="verify-form__otp-input"
                value={digit}
                aria-label={`Digit ${index + 1}`}
                onChange={(event) => handleDigitChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
              />
            ))}
          </div>
        </div>

        <p className="verify-form__resend">
          Didn&apos;t receive the code?{' '}
          <button
            type="button"
            className="verify-form__resend-btn"
            onClick={handleResend}
            disabled={isResending}
          >
            Resend
          </button>
        </p>

        {error ? <p className="login-form__error">{error}</p> : null}
        {success ? <p className="login-form__success">{success}</p> : null}

        <button
          type="submit"
          className="login-form__submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Please wait…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
