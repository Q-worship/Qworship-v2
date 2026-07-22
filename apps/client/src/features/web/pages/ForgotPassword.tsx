import { FormEvent, useState } from 'react'
import { Link } from 'wouter'
import { AuthPageShell } from '@/components/auth/AuthPageShell'
import { AuthShowcase } from '@/components/auth/AuthShowcase'
import { requestPasswordReset } from '@/lib/authApi'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('')
    try { setMessage((await requestPasswordReset(email)).message) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to send reset link') }
    finally { setBusy(false) }
  }
  return <AuthPageShell><div className="login-form"><h1 className="login-form__title">Reset password</h1><p className="login-form__subtitle">Enter your account email and we’ll send you a secure reset link.</p><form className="login-form__fields" onSubmit={submit}><div className="login-form__field"><label className="login-form__label" htmlFor="reset-email">Email</label><input id="reset-email" className="login-form__input" type="email" required value={email} onChange={event => setEmail(event.target.value)} /></div>{message ? <p className="login-form__success" role="status">{message}</p> : null}<button className="login-form__submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button><Link className="login-form__link" href="/login">Back to sign in</Link></form></div><AuthShowcase variant="plain" /></AuthPageShell>
}
