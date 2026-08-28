import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { images, REFER_JOIN_PATH } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

export function ReferNavbar() {
  const [isSolid, setIsSolid] = useState(false)

  useEffect(() => {
    const onScroll = () => setIsSolid(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`refer-navbar${isSolid ? ' refer-navbar--solid' : ''}`}>
      <SiteContainer className="refer-navbar-inner">
        <Link href="/refer-and-earn" className="refer-navbar-brand" aria-label="Q-Worship Referrer home">
          <img src={images.logo} alt="" className="refer-navbar-logo" />
          <span className="refer-navbar-brand-name">Q-Worship</span>
          <span className="refer-navbar-brand-divider" aria-hidden>
            |
          </span>
          <span className="refer-navbar-brand-label">Referrer</span>
        </Link>

        <div className="refer-navbar-actions">
          <Link href={REFER_JOIN_PATH} className="refer-navbar-btn refer-navbar-btn--outline">
            Get Started
          </Link>
          <Link href="/refer-and-earn/login" className="refer-navbar-btn refer-navbar-btn--solid">
            Login
          </Link>
          <Link href="/" className="refer-navbar-close" aria-label="Close and return to home">
            <MaterialIcon name="close" />
          </Link>
        </div>
      </SiteContainer>
    </nav>
  )
}
