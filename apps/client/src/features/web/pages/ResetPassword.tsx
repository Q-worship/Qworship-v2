import { FormEvent, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { AuthPageShell } from '@/components/auth/AuthPageShell'
import { AuthShowcase } from '@/components/auth/AuthShowcase'
import { resetPassword } from '@/lib/authApi'

export function ResetPassword() {
  const [, navigate] = useLocation()
  const params = new URLSearchParams(window.location.search)
  const email = params.get('email') || ''
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password !== confirm) { setMessage('Passwords do not match.'); return }
    setBusy(true); setMessage('')
    try { await resetPassword(email, token, password); navigate('/login') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to reset password') }
    finally { setBusy(false) }
  }
  if (!email || !token) return <AuthPageShell><div className="login-form"><h1 className="login-form__title">Invalid reset link</h1><Link href="/forgot-password">Request a new link</Link></div><AuthShowcase variant="plain" /></AuthPageShell>
  return <AuthPageShell><div className="login-form"><h1 className="login-form__title">Choose a new password</h1><form className="login-form__fields" onSubmit={submit}><div className="login-form__field"><label className="login-form__label" htmlFor="new-password">New password</label><input id="new-password" className="login-form__input" type="password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></div><div className="login-form__field"><label className="login-form__label" htmlFor="confirm-password">Confirm password</label><input id="confirm-password" className="login-form__input" type="password" minLength={8} required value={confirm} onChange={event => setConfirm(event.target.value)} /></div>{message ? <p className="login-form__error" role="alert">{message}</p> : null}<button className="login-form__submit" disabled={busy}>{busy ? 'Saving…' : 'Reset password'}</button></form></div><AuthShowcase variant="plain" /></AuthPageShell>
}
