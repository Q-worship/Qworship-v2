import { Link } from 'wouter'
import { pricingFaqTeaserItems, pricingPageCopy } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { FAQAccordionList } from '@/components/sections/FAQAccordionList'

export function PricingFAQSection() {
  return (
    <section className="pricing-faq-section section-gap reveal">
      <SiteContainer>
        <div className="pricing-faq-header">
          <h2 className="pricing-faq-heading font-headline">{pricingPageCopy.faqHeading}</h2>
          <p className="pricing-faq-body">
            {pricingPageCopy.faqBody}{' '}
            <Link href="/about" className="pricing-faq-link">
              Reach out to our team.
            </Link>
          </p>
        </div>

        <div className="pricing-faq-accordion-wrap">
          <FAQAccordionList
            categoryLabel=""
            items={pricingFaqTeaserItems}
            hideCategoryHeading
            compact
          />
        </div>
      </SiteContainer>
    </section>
  )
}
