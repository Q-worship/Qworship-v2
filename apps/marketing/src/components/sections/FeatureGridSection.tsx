import { featureGridCards, featureGridHighlight } from '@/lib/theme'

import { SiteContainer } from '@/components/layout/SiteContainer'

export function FeatureGridSection() {
  return (
    <section className="feature-grid-section section-gap reveal">
      <SiteContainer>
        <div className="feature-grid-panel">
          <div className="feature-grid-top">
            {featureGridCards.map((card) => (
              <div key={card.title} className="feature-grid-cell">
                <h3 className="feature-grid-cell__title build-section-entire-gradient">
                  {card.title}
                </h3>
                <p className="feature-grid-cell__description">{card.description}</p>
                {card.image && (
                  <img
                    alt={card.title}
                    className="feature-grid-cell__image"
                    src={card.image}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="feature-grid-highlight">
            <div className="feature-grid-highlight__header">
              <h3 className="feature-grid-highlight__title build-section-entire-gradient">
                {featureGridHighlight.title}
              </h3>
              <p className="feature-grid-highlight__description">
                {featureGridHighlight.description}
              </p>
            </div>
            {featureGridHighlight.image && (
              <img
                alt={featureGridHighlight.title}
                className="feature-grid-highlight__image"
                src={featureGridHighlight.image}
              />
            )}
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
