import { Link } from 'wouter'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { images } from '@/lib/theme'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-surface-container-lowest/80 border-t border-white/5 pt-24 pb-12">
      <SiteContainer>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-16 mb-20">
          <div className="col-span-2 space-y-8">
            <Link href="/" className="inline-flex items-center" aria-label="Q-Worship home">
              <img src={images.logo} alt="" className="h-10 w-10" />
            </Link>
            <p className="text-on-surface-variant max-w-sm leading-relaxed">
              Professional-grade presentation tools for the modern technical ministry.
            </p>
          </div>

          <div>
            <h5 className="font-bold mb-6">Features</h5>
            <ul className="space-y-4 text-on-surface-variant">
              <li>
                <Link href="/features" className="hover:text-primary transition-colors">
                  Hands-Free Bible
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-primary transition-colors">
                  Canvas Engine
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-primary transition-colors">
                  NDI Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold mb-6">Company</h5>
            <ul className="space-y-4 text-on-surface-variant">
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/resources" className="hover:text-primary transition-colors">
                  Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold mb-6">Legal</h5>
            <ul className="space-y-4 text-on-surface-variant">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-on-surface-variant">
          <p>© {currentYear} Q-Worship. Built for technical precision and cinematic flair.</p>
          <div className="flex gap-10">
            <Link href="/resources" className="hover:text-primary transition-colors">
              Documentation
            </Link>
            <Link href="/resources" className="hover:text-primary transition-colors">
              Support
            </Link>
          </div>
        </div>
      </SiteContainer>
    </footer>
  )
}
