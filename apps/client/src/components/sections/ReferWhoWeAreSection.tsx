import { Link } from 'wouter'
import { images, referWhoWeAreCopy, REFER_JOIN_PATH } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'

export function ReferWhoWeAreSection() {
  return (
    <section className="refer-who-we-are-section section-gap reveal">
      <SiteContainer>
        <div className="refer-who-we-are-grid">
          <div className="refer-who-we-are-intro">
            <div className="refer-who-we-are-badge">{referWhoWeAreCopy.badge}</div>

            <h2 className="refer-who-we-are-heading font-headline font-bold">
              <span className="refer-who-we-are-heading-dark">{referWhoWeAreCopy.heading.before} </span>
              <span className="refer-who-we-are-heading-accent">{referWhoWeAreCopy.heading.accent}</span>
            </h2>

            <Link href={REFER_JOIN_PATH} className="refer-who-we-are-btn">
              {referWhoWeAreCopy.cta}
            </Link>
          </div>

          <p className="refer-who-we-are-body">{referWhoWeAreCopy.body}</p>
        </div>

        <img
          src={images.referPastor}
          alt={referWhoWeAreCopy.imageAlt}
          className="refer-who-we-are-banner"
          loading="lazy"
        />
      </SiteContainer>
    </section>
  )
}
