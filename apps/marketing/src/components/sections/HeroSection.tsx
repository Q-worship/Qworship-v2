import { heroCopy, images } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

export function HeroSection() {
  return (
    <section className="pt-28 md:pt-40 lg:pt-44 pb-20 relative overflow-x-hidden reveal active isolate">
      <div
        className="pointer-events-none absolute -top-20 inset-x-0 bottom-0 hero-gradient-bg -z-10"
        aria-hidden
      />
      <SiteContainer className="relative z-10">
        <div className="hero-inner mx-auto w-full max-w-5xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full hero-badge hero-badge--desktop mb-10">
              <span className="hero-badge__label">
                {heroCopy.badge.label}
              </span>
              <span className="hero-badge__version">{heroCopy.badge.version}</span>
            </div>
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full hero-badge hero-badge--mobile mb-10">
              <span className="hero-badge__label">
                {heroCopy.badgeMobile.label}
              </span>
              <span className="hero-badge__version">{heroCopy.badgeMobile.version}</span>
            </div>
          </div>

          <h1 className="hero-heading font-body font-bold mb-6 w-full text-center">
            <span className="text-white">{heroCopy.heading.line1} </span>
            <span className="hero-heading-accent">{heroCopy.heading.line2}</span>
          </h1>

          <p className="hero-body text-lg md:text-xl mx-auto mb-10 leading-relaxed max-w-2xl text-center">
            {heroCopy.body}
          </p>

          <div className="flex flex-row flex-wrap justify-center gap-4 cta-pair-mobile-inline">
            <button
              type="button"
              className="hero-download-btn px-10 py-3.5 rounded-xl text-base font-bold"
            >
              Download
            </button>
            <button
              type="button"
              className="hero-demo-btn px-10 py-3.5 rounded-xl text-base font-bold flex items-center gap-2.5"
            >
              <MaterialIcon name="play_circle" filled className="text-xl" />
              Book Demo
            </button>
          </div>

          <img
            src={images.heroFrame}
            alt="Q-Worship hands-free Bible interface preview"
            className="hero-frame block w-full mt-14"
            loading="eager"
          />
        </div>
      </SiteContainer>
    </section>
  )
}
