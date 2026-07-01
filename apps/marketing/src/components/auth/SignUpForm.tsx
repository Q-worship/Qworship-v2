import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'wouter'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { signUp } from '@/lib/authApi'

const MIN_PASSWORD_LENGTH = 8

export function SignUpForm() {
  const [, setLocation] = useLocation()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await signUp({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      })

      if (!response.success) {
        setError(response.message ?? 'Sign up failed. Please try again.')
        return
      }

      const verifiedEmail = response.email ?? email.trim().toLowerCase()
      sessionStorage.setItem('verifyEmail', verifiedEmail)
      setLocation(`/verify?email=${encodeURIComponent(verifiedEmail)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-form">
      <h1 className="login-form__title login-form__title--single-line">
        Welcome, lets get you started
      </h1>
      <p className="login-form__subtitle">
        Have an account?{' '}
        <Link href="/login" className="login-form__link">
          Sign in
        </Link>
      </p>

      <form className="login-form__fields" onSubmit={handleSubmit}>
        <div className="login-form__row">
          <div className="login-form__field">
            <label htmlFor="signup-first-name" className="login-form__label">
              First Name
            </label>
            <div className="login-form__input-wrap">
              <MaterialIcon name="person" className="login-form__input-icon" />
              <input
                id="signup-first-name"
                type="text"
                className="login-form__input"
                placeholder="Enter your first name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
              />
            </div>
          </div>

          <div className="login-form__field">
            <label htmlFor="signup-last-name" className="login-form__label">
              Last Name
            </label>
            <div className="login-form__input-wrap">
              <MaterialIcon name="person" className="login-form__input-icon" />
              <input
                id="signup-last-name"
                type="text"
                className="login-form__input"
                placeholder="Enter your last name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
              />
            </div>
          </div>
        </div>

        <div className="login-form__field">
          <label htmlFor="signup-email" className="login-form__label">
            Email
          </label>
          <div className="login-form__input-wrap">
            <MaterialIcon name="mail" className="login-form__input-icon" />
            <input
              id="signup-email"
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
          <label htmlFor="signup-password" className="login-form__label">
            Password
          </label>
          <div className="login-form__input-wrap">
            <MaterialIcon name="lock" className="login-form__input-icon" />
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              className="login-form__input"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
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

        <div className="login-form__field">
          <label htmlFor="signup-confirm-password" className="login-form__label">
            Confirm Password
          </label>
          <div className="login-form__input-wrap">
            <MaterialIcon name="lock" className="login-form__input-icon" />
            <input
              id="signup-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              className="login-form__input"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="login-form__toggle-password"
              onClick={() => setShowConfirmPassword((visible) => !visible)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              <MaterialIcon
                name={showConfirmPassword ? 'visibility_off' : 'visibility'}
              />
            </button>
          </div>
        </div>

        {error ? <p className="login-form__error">{error}</p> : null}

        <button
          type="submit"
          className="login-form__submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Please wait…' : 'Continue'}
        </button>

        <p className="login-form__terms">
          By registering for an account, you agree to Q worship&apos;s{' '}
          <a href="#">terms and conditions</a> and <a href="#">privacy policy</a>.
        </p>
      </form>
    </div>
  )
}
