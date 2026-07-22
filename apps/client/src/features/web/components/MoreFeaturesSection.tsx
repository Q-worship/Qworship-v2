import { moreFeatures } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface MoreFeaturesSectionProps {
  showViewAllLink?: boolean
}

export function MoreFeaturesSection({ showViewAllLink = true }: MoreFeaturesSectionProps) {
  return (
    <section className="section-gap reveal bg-[#09090B]">
      <SiteContainer>
        <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="text-left">
            <h2 className="font-headline text-3xl sm:text-4xl font-bold mb-4">More features</h2>
            <p className="text-on-surface-variant">
              There&apos;s so much more — see for yourself.
            </p>
          </div>
          {showViewAllLink && (
            <a
              href="/features"
              className="flex items-center gap-2 text-white font-bold shrink-0 group hover:opacity-90 transition-opacity"
            >
              See all Q-worship features
              <MaterialIcon
                name="arrow_forward"
                className="group-hover:translate-x-1 transition-transform"
              />
            </a>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {moreFeatures.map((feature) => (
            <div
              key={feature.title}
              className="more-features-card p-5 md:p-8 rounded-2xl text-left"
            >
              <h4 className="font-bold text-lg mb-4 text-white">{feature.title}</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </SiteContainer>
    </section>
  )
}
