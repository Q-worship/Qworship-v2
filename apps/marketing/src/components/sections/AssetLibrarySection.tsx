import { assetLibraryVideos } from '@/lib/theme'

import { SiteContainer } from '@/components/layout/SiteContainer'
import { GlassButton } from '@/components/ui/GlassButton'
import { useMediaInView } from '@/hooks/useMediaInView'

export function AssetLibrarySection() {
  const { ref: videosRef, isInView } = useMediaInView<HTMLDivElement>()

  return (
    <div className="asset-library-section">
      <SiteContainer className="asset-library-section__copy text-center mb-10 lg:mb-12">
        <h2 className="asset-library-section__heading font-headline text-3xl sm:text-4xl md:text-5xl font-bold mb-8 text-primary">
          Extensive Asset Library
        </h2>
        <p className="asset-library-section__body text-on-surface-variant text-lg max-w-3xl mx-auto mb-12">
          Every background, motion graphic, and worship visual your church needs — all in one searchable
          library. Find the perfect backdrop in seconds, not minutes.
        </p>
        <div className="asset-library-actions cta-pair-mobile-inline flex flex-row flex-wrap justify-center gap-4 sm:gap-6">
          <button
            type="button"
            className="asset-library-primary-btn bg-white text-background px-10 py-4 rounded-full font-bold hover:bg-primary hover:text-white transition-all touch-target"
          >
            Start for free today
          </button>
          <GlassButton
            icon="play_circle"
            iconFilled
            className="asset-library-demo-btn px-10 py-4 rounded-full touch-target"
          >
            Book Demo
          </GlassButton>
        </div>
      </SiteContainer>
      <div ref={videosRef} className="asset-library-lower-cards">
        {assetLibraryVideos.map((src) => (
          <div className="asset-library-lower-card" key={src}>
            <video
              src={src}
              className="asset-library-lower-card-img"
              autoPlay
              muted
              loop
              playsInline
              preload={isInView ? 'auto' : 'metadata'}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
