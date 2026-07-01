import type { ReactNode } from 'react'
import { Link } from 'wouter'
import { images } from '@/lib/theme'

interface AuthPageShellProps {
  children: ReactNode
}

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <div className="login-page">
      <header className="login-page__header">
        <Link href="/" className="login-page__logo" aria-label="Q-Worship home">
          <img src={images.logo} alt="" className="login-page__logo-image" />
          <span className="login-page__logo-text">Q-Worship</span>
        </Link>
      </header>

      <main className="login-page__main">
        <div className="login-page__grid">{children}</div>
      </main>
    </div>
  )
}
