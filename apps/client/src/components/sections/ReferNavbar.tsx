import { useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { images, REFER_JOIN_PATH } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

export function ReferNavbar() {
  const [isSolid, setIsSolid] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [location] = useLocation()

  useEffect(() => {
    const onScroll = () => setIsSolid(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location])

  useEffect(() => {
    if (!menuOpen) {
      document.body.classList.remove('refer-mobile-nav-open')
      return
    }

    document.body.classList.add('refer-mobile-nav-open')

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      document.body.classList.remove('refer-mobile-nav-open')
      window.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <nav className={`refer-navbar${isSolid || menuOpen ? ' refer-navbar--solid' : ''}`}>
        <SiteContainer className="refer-navbar-inner">
          <div className="refer-navbar-left">
            <button
              type="button"
              className="refer-navbar-toggle"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MaterialIcon name={menuOpen ? 'close' : 'menu'} />
            </button>

            <Link href="/refer-and-earn" className="refer-navbar-brand" aria-label="Q-Worship Referrer home">
              <img src={images.logo} alt="" className="refer-navbar-logo" />
              <span className="refer-navbar-brand-name">Q-Worship</span>
              <span className="refer-navbar-brand-divider" aria-hidden>
                |
              </span>
              <span className="refer-navbar-brand-label">Referrer</span>
            </Link>
          </div>

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

      {menuOpen ? (
        <>
          <button
            type="button"
            className="refer-mobile-nav-overlay"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div className="refer-mobile-nav-drawer" role="dialog" aria-modal="true" aria-label="Referral navigation">
            <Link
              href={REFER_JOIN_PATH}
              onClick={closeMenu}
              className="refer-navbar-btn refer-navbar-btn--outline refer-mobile-nav-link"
            >
              Get Started
            </Link>
            <Link
              href="/refer-and-earn/login"
              onClick={closeMenu}
              className="refer-navbar-btn refer-navbar-btn--solid refer-mobile-nav-link"
            >
              Login
            </Link>
          </div>
        </>
      ) : null}
    </>
  )
}
