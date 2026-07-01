import { downloadsPageCopy } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { PlatformLogo } from '@/components/ui/PlatformLogos'

export function DownloadsConsoleSection() {
  const { product, platforms } = downloadsPageCopy

  return (
    <section className="downloads-console-section section-gap reveal">
      <SiteContainer>
        <div className="downloads-console-grid">
          <div className="downloads-console-copy">
            <h2 className="downloads-product-title font-headline font-bold">{product.title}</h2>
            <p className="downloads-product-subtitle font-headline font-bold">{product.subtitle}</p>

            <div className="downloads-product-meta">
              <p>{product.version}</p>
              <p>{product.highlights}</p>
              <p>{product.date}</p>
            </div>

            <div className="downloads-platform-actions">
              {platforms.map((platform) => (
                <button key={platform.id} type="button" className="downloads-platform-btn">
                  <span>{platform.label}</span>
                  {platform.icon && (
                    <PlatformLogo platform={platform.icon} className="downloads-platform-icon" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="downloads-console-media">
            <img
              src={product.image}
              alt={product.imageAlt}
              className="downloads-console-image"
              loading="eager"
            />
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
