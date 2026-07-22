import { Redirect, useLocation } from 'wouter'
import { useAuthStore } from '@/features/auth/auth.store'
import { setAuthToken } from '@/lib/authApi'

export default function TrialExpiredPage() {
  const [, navigate] = useLocation()
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)
  if (!localStorage.getItem('token')) return <Redirect to="/login" />

  const handleLogout = () => {
    setAuthToken(null)
    logout()
    navigate('/login')
  }

  return (
    <main className="min-h-screen bg-[#0d071d] text-white flex items-center justify-center p-6">
      <section className="max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <h1 className="text-3xl font-bold">Your free trial has ended</h1>
        <p className="mt-4 text-white/70">
          {user?.firstName ? `${user.firstName}, your` : 'Your'} Q-Worship projects remain safe. Paid subscriptions will be available here when payments launch.
        </p>
        <button type="button" className="mt-8 rounded-lg bg-purple-600 px-6 py-3 font-semibold" onClick={handleLogout}>Sign out</button>
      </section>
    </main>
  )
}
