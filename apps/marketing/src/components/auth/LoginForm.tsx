import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'wouter'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { persistAuthSession, signIn, getPostAuthPath } from '@/lib/authApi'

export function LoginForm() {
  const [, setLocation] = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await signIn({
        email: email.trim(),
        password,
      })

      if (!response.success || !response.token) {
        setError(response.message ?? 'Sign in failed. Please try again.')
        return
      }

      persistAuthSession(response.token, response.user)

      if (rememberMe) {
        localStorage.setItem('qworship_remember_email', email.trim().toLowerCase())
      } else {
        localStorage.removeItem('qworship_remember_email')
      }

      setLocation(response.nextStep ?? getPostAuthPath())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-form">
      <h1 className="login-form__title">Sign in</h1>
      <p className="login-form__subtitle">
        New to Q-worship?{' '}
        <Link href="/signup" className="login-form__link">
          Sign up
        </Link>
      </p>

      <form className="login-form__fields" onSubmit={handleSubmit}>
        <div className="login-form__field">
          <label htmlFor="login-email" className="login-form__label">
            Email
          </label>
          <div className="login-form__input-wrap">
            <MaterialIcon name="mail" className="login-form__input-icon" />
            <input
              id="login-email"
              type="email"
              className="login-form__input"
              placeholder="Enter your email account"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="login-form__field">
          <label htmlFor="login-password" className="login-form__label">
            Password
          </label>
          <div className="login-form__input-wrap">
            <MaterialIcon name="lock" className="login-form__input-icon" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="login-form__input"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="login-form__toggle-password"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <MaterialIcon name={showPassword ? 'visibility_off' : 'visibility'} />
            </button>
          </div>
        </div>

        <div className="login-form__options">
          <label className="login-form__remember">
            <input
              type="checkbox"
              className="login-form__checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <Link href="#" className="login-form__link">
            Forgot Password
          </Link>
        </div>

        {error ? <p className="login-form__error">{error}</p> : null}

        <button type="submit" className="login-form__submit" disabled={isSubmitting}>
          {isSubmitting ? 'Please wait…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
