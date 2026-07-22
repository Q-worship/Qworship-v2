import type { TabItem } from '@/types/content'
import { GlassButton } from '@/components/ui/GlassButton'
import { HandsFreeShowcaseVisual } from '@/components/sections/HandsFreeShowcaseVisual'

interface HeroShowcasePanelProps {
  activeTab: TabItem
  idPrefix: string
}

function ShowcaseStaticImage({
  src,
  className,
}: {
  src: string
  className: string
}) {
  return <img src={src} alt="" className={className} />
}

export function HeroShowcasePanel({ activeTab, idPrefix }: HeroShowcasePanelProps) {
  const isHero = idPrefix === 'hero'
  const showAnimation = activeTab.id === 'handsfree'

  if (isHero) {
    return (
      <div className="hero-showcase-split">
        {showAnimation ? (
          <HandsFreeShowcaseVisual variant="split" />
        ) : (
          <div className="hero-showcase-visual">
            <ShowcaseStaticImage
              src={activeTab.image}
              className="hero-showcase-visual__image"
            />
          </div>
        )}
        <div className="hero-showcase-copy">
          <h3 className="hero-showcase-copy__title">{activeTab.title}</h3>
          <p className="hero-showcase-copy__description">{activeTab.description}</p>
          <GlassButton icon="play_circle" iconFilled className="hero-showcase-copy__cta">
            Book Demo
          </GlassButton>
        </div>
      </div>
    )
  }

  if (showAnimation) {
    return (
      <div className="hero-showcase-panel hero-showcase-panel--animated">
        <HandsFreeShowcaseVisual variant="full" />
      </div>
    )
  }

  return (
    <div className="hero-showcase-panel">
      <ShowcaseStaticImage src={activeTab.image} className="hero-showcase-panel__image" />
    </div>
  )
}
