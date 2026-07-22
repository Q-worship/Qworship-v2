import { Link } from 'wouter'
import { aboutFaqTeaserItems } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { FAQAccordionList } from '@/components/sections/FAQAccordionList'

export function AboutFAQSection() {
  return (
    <section className="about-faq-section reveal">
      <SiteContainer>
        <div className="about-faq-grid">
          <div className="about-faq-copy">
            <h2 className="about-faq-heading font-headline font-bold">Questions?</h2>
            <p className="about-faq-body">
              Browse our FAQs or our Knowledge base that we&apos;ve made to answer your questions. Need
              additional help? Connect with a support team agent!
            </p>
            <div className="about-faq-actions">
              <Link href="/guides" className="about-faq-guides-btn">
                Browse our guides
              </Link>
              <Link href="/faqs" className="about-faq-more-link">
                See more FAQs <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          <FAQAccordionList categoryLabel="" items={aboutFaqTeaserItems} hideCategoryHeading compact />
        </div>
      </SiteContainer>
    </section>
  )
}
