import { Link } from 'wouter'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

const resourceLinks = [
  {
    title: 'FAQs',
    description: 'Quick answers to the most common questions about Q-Worship.',
    href: '/faqs',
    icon: 'help',
  },
  {
    title: 'Guides',
    description: 'Step-by-step tutorials for setting up your first service.',
    href: '/guides',
    icon: 'menu_book',
  },
  {
    title: 'Documentation',
    description: 'Technical reference for integrations, APIs, and advanced workflows.',
    href: '/resources',
    icon: 'description',
  },
  {
    title: 'Support',
    description: 'Connect with our support team for personalized help.',
    href: '/resources',
    icon: 'support_agent',
  },
]

export function Resources() {
  return (
    <section className="section-gap">
      <SiteContainer>
        <SectionHeading
          className="mb-16 reveal"
          title="Resources"
          subtitle="Everything you need to get started and go deeper with Q-Worship."
        />

        <div className="grid md:grid-cols-2 gap-6">
          {resourceLinks.map((resource) => (
            <Link key={resource.title} href={resource.href}>
              <GlassCard className="p-8 rounded-2xl hover:bg-white/5 transition-colors h-full reveal">
                <MaterialIcon name={resource.icon} className="text-primary text-3xl mb-4" />
                <h3 className="font-headline text-2xl font-bold mb-3">{resource.title}</h3>
                <p className="text-on-surface-variant leading-relaxed">{resource.description}</p>
              </GlassCard>
            </Link>
          ))}
        </div>
      </SiteContainer>
    </section>
  )
}
