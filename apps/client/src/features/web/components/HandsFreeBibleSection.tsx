import { handsFreeSectionCopy } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { HandsFreeBibleAnimation } from '@/components/sections/HandsFreeBibleAnimation'

export function HandsFreeBibleSection() {
  return (
    <section className="hands-free-section section-gap">
      <SiteContainer>
        <h2 className="hands-free-section__title reveal">{handsFreeSectionCopy.title}</h2>

        <div className="hands-free-bordered-panel reveal">
          <p className="hands-free-section__tagline">
            <span className="block">{handsFreeSectionCopy.tagline.line1}</span>
            <span className="block">{handsFreeSectionCopy.tagline.line2}</span>
          </p>
          <p className="hands-free-section__body">{handsFreeSectionCopy.body}</p>

          <HandsFreeBibleAnimation className="hands-free-section__animation reveal" />
        </div>
      </SiteContainer>
    </section>
  )
}
