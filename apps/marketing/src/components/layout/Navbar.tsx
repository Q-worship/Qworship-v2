import { useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { images, navLinks, resourceDropdownItems } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { GlassButton } from '@/components/ui/GlassButton'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useNavbarSolid } from '@/hooks/useNavbarSolid'

export function Navbar() {
  const [location] = useLocation()
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const isSolid = useNavbarSolid(location === '/')

  const isActive = (href: string) => {
    if (href === '/') return location === '/'
    if (href === '/resources') {
      return (
        location.startsWith(href) ||
        location.startsWith('/guides') ||
        location.startsWith('/faqs') ||
        location.startsWith('/downloads')
      )
    }
    return location.startsWith(href)
  }

  useEffect(() => {
    setMobileNavOpen(false)
    setResourcesOpen(false)
  }, [location])

  useEffect(() => {
    if (!mobileNavOpen) {
      document.body.classList.remove('mobile-nav-open')
      return
    }

    document.body.classList.add('mobile-nav-open')

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      document.body.classList.remove('mobile-nav-open')
      window.removeEventListener('keydown', handleEscape)
    }
  }, [mobileNavOpen])

  const closeMobileNav = () => setMobileNavOpen(false)

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
          isSolid || mobileNavOpen
            ? 'bg-background/80 backdrop-blur-md border-b border-white/5'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <SiteContainer className="relative h-20 flex items-center justify-between gap-3">
          <Link href="/" className="relative z-10 flex items-center shrink-0" aria-label="Q-Worship home">
            <img src={images.logo} alt="" className="h-10 w-10" />
          </Link>

          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-14 lg:gap-16 text-base font-medium">
            {navLinks.map((link) =>
              link.label === 'Resources' ? (
                <div
                  key={link.href}
                  className="navbar-dropdown relative"
                  onMouseEnter={() => setResourcesOpen(true)}
                  onMouseLeave={() => setResourcesOpen(false)}
                  onFocus={() => setResourcesOpen(true)}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setResourcesOpen(false)
                    }
                  }}
                >
                  <button
                    type="button"
                    className={`navbar-dropdown__trigger transition-colors ${
                      isActive(link.href) ? 'text-[#A78BFA]' : 'text-on-surface-variant hover:text-white'
                    } ${resourcesOpen ? 'is-open' : ''}`}
                    aria-haspopup="menu"
                    aria-expanded={resourcesOpen}
                    onClick={() => setResourcesOpen((open) => !open)}
                  >
                    Resources
                    <MaterialIcon name="expand_more" className="navbar-dropdown__chevron text-lg" />
                  </button>

                  {resourcesOpen && (
                    <div className="navbar-dropdown__panel" role="menu">
                      {resourceDropdownItems.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          role="menuitem"
                          className="navbar-dropdown__item"
                          onClick={() => setResourcesOpen(false)}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors ${
                    isActive(link.href)
                      ? 'text-[#A78BFA]'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ),
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 relative z-10 shrink-0">
            <Link href="/login" className="hidden md:block">
              <PrimaryButton className="px-4 sm:px-6 py-2.5 rounded-lg text-sm touch-target">
                Sign in
              </PrimaryButton>
            </Link>
            <GlassButton className="px-3 sm:px-6 py-2.5 rounded-lg text-sm border border-white/30 touch-target">
              Get started
            </GlassButton>
            <button
              type="button"
              className="mobile-nav-toggle md:hidden"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <MaterialIcon name={mobileNavOpen ? 'close' : 'menu'} className="text-2xl" />
            </button>
          </div>
        </SiteContainer>
      </nav>

      {mobileNavOpen && (
        <>
          <button
            type="button"
            className="mobile-nav-overlay md:hidden"
            aria-label="Close menu"
            onClick={closeMobileNav}
          />
          <div className="mobile-nav-drawer md:hidden" role="dialog" aria-modal="true" aria-label="Site navigation">
            {navLinks.map((link) =>
              link.label === 'Resources' ? (
                <div key={link.href}>
                  <span className="mobile-nav-group-label">Resources</span>
                  {resourceDropdownItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`mobile-nav-sublink${isActive(item.href) ? ' mobile-nav-sublink--active' : ''}`}
                      onClick={closeMobileNav}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`mobile-nav-link${isActive(link.href) ? ' mobile-nav-link--active' : ''}`}
                  onClick={closeMobileNav}
                >
                  {link.label}
                </Link>
              ),
            )}
            <div className="mobile-nav-actions">
              <Link href="/login" onClick={closeMobileNav} className="mobile-nav-actions__item">
                <PrimaryButton className="w-full py-3 rounded-lg text-sm touch-target">
                  Sign in
                </PrimaryButton>
              </Link>
              <GlassButton className="mobile-nav-actions__item w-full py-3 rounded-lg text-sm border border-white/30 touch-target">
                Get started
              </GlassButton>
            </div>
          </div>
        </>
      )}
    </>
  )
}
