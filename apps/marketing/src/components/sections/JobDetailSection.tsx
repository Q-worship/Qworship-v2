import { Link } from 'wouter'
import type { JobOpening } from '@/types/content'
import { images } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface JobDetailSectionProps {
  job: JobOpening
}

function scrollToApply() {
  document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function JobDetailSection({ job }: JobDetailSectionProps) {
  return (
    <section className="careers-page careers-detail-section pt-32 pb-16 reveal">
      <SiteContainer>
        <Link href="/about" className="careers-breadcrumb">
          <img src={images.logo} alt="" className="careers-breadcrumb-logo" />
          <span>Current openings at Q-worship</span>
        </Link>

        <h1 className="careers-title font-headline font-bold">{job.title}</h1>

        <div className="careers-meta">
          <span className="careers-meta-item">
            <MaterialIcon name="public" className="careers-meta-icon" aria-hidden />
            {job.location}
          </span>
          <span className="careers-meta-item">
            <MaterialIcon name="check_circle" className="careers-meta-icon" aria-hidden />
            {job.status}
          </span>
        </div>

        {job.intro && <p className="careers-body">{job.intro}</p>}
        {job.philosophy && <p className="careers-body">{job.philosophy}</p>}

        {job.skillsHeading && job.skills && (
          <div className="careers-list-block">
            <p className="careers-list-heading font-headline font-bold">{job.skillsHeading}</p>
            <div className="careers-list">
              {job.skills.map((item) => (
                <p key={item} className="careers-list-item">
                  {item}
                </p>
              ))}
            </div>
          </div>
        )}

        {job.valuesHeading && job.values && (
          <div className="careers-list-block">
            <p className="careers-list-heading font-headline font-bold">{job.valuesHeading}</p>
            <div className="careers-list">
              {job.values.map((item) => (
                <p key={item} className="careers-list-item">
                  {item}
                </p>
              ))}
            </div>
          </div>
        )}

        {job.idealHeading && job.ideal && (
          <div className="careers-list-block">
            <p className="careers-list-heading font-headline font-bold">{job.idealHeading}</p>
            <div className="careers-list">
              {job.ideal.map((item) => (
                <p key={item} className="careers-list-item">
                  {item}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="careers-detail-actions">
          <button type="button" className="careers-alert-link" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Create a Job Alert
          </button>

          <button type="button" className="careers-apply-btn" onClick={scrollToApply}>
            Apply
          </button>
        </div>
      </SiteContainer>
    </section>
  )
}
