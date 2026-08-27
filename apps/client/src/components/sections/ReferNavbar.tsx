import { Link } from 'wouter'
import { images } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

export function ReferNavbar() {
  return (
    <nav className="refer-navbar">
      <SiteContainer className="refer-navbar-inner">
        <Link href="/" className="refer-navbar-brand" aria-label="Q-Worship home">
          <img src={images.logo} alt="" className="refer-navbar-logo" />
          <span className="refer-navbar-brand-name">Q-Worship</span>
          <span className="refer-navbar-brand-divider" aria-hidden>
            |
          </span>
          <span className="refer-navbar-brand-label">Referrer</span>
        </Link>

        <div className="refer-navbar-actions">
          <button type="button" className="refer-navbar-btn refer-navbar-btn--outline">
            Get Started
          </button>
          <button type="button" className="refer-navbar-btn refer-navbar-btn--solid">
            Login
          </button>
          <Link href="/" className="refer-navbar-close" aria-label="Close and return to home">
            <MaterialIcon name="close" />
          </Link>
        </div>
      </SiteContainer>
    </nav>
  )
}
