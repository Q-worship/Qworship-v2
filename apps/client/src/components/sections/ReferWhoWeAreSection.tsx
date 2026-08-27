import { referWhoWeAreCopy } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

export function ReferWhoWeAreSection() {
  return (
    <section className="refer-who-we-are-section section-gap reveal">
      <SiteContainer>
        <div className="refer-who-we-are-grid">
          <div className="refer-who-we-are-copy">
            <div className="refer-who-we-are-badge">{referWhoWeAreCopy.badge}</div>

            <h2 className="refer-who-we-are-heading font-headline font-bold">
              <span className="refer-who-we-are-heading-dark">{referWhoWeAreCopy.heading.before} </span>
              <span className="refer-who-we-are-heading-accent">{referWhoWeAreCopy.heading.accent}</span>
            </h2>

            <p className="refer-who-we-are-body">{referWhoWeAreCopy.body}</p>

            <button type="button" className="refer-who-we-are-btn">
              {referWhoWeAreCopy.cta}
            </button>
          </div>

          <div className="refer-who-we-are-media">
            <div className="refer-image-placeholder" role="img" aria-label={referWhoWeAreCopy.imageAlt}>
              <MaterialIcon name="image" className="refer-image-placeholder-icon" />
              <span>Image coming soon</span>
            </div>
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
