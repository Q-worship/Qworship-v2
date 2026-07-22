import { Link } from 'wouter'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

export function FAQSection() {
  return (
    <section className="section-gap reveal">
      <SiteContainer>
        <div className="max-w-3xl text-left">
          <h2 className="font-headline text-3xl md:text-5xl font-bold mb-8">Questions ?</h2>
          <p className="text-on-surface-variant text-base md:text-xl mb-12 leading-relaxed">
            Browse our FAQs or our Knowledge base that we&apos;ve made to answer your questions. Need
            additional help? Connect with a support team agent!
          </p>
          <div className="flex items-center justify-start gap-10 flex-wrap">
            <Link
              href="/faqs"
              className="glass-button text-white px-10 py-4 rounded-xl font-bold hover:bg-white hover:text-background transition-all inline-block"
            >
              View FAQs
            </Link>
            <Link
              href="/guides"
              className="flex items-center gap-2 text-on-surface-variant font-bold hover:text-primary group transition-colors"
            >
              Browse Guides{' '}
              <MaterialIcon name="arrow_forward" className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
