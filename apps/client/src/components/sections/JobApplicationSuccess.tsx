import { Link } from 'wouter'
import { images } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'

interface JobApplicationSuccessProps {
  firstName: string
  jobTitle: string
}

export function JobApplicationSuccess({ firstName, jobTitle }: JobApplicationSuccessProps) {
  return (
    <section className="careers-success-section reveal">
      <SiteContainer>
        <div className="careers-success-grid">
          <div className="careers-success-copy">
            <img src={images.logo} alt="Q-worship" className="careers-success-logo" />

            <h1 className="careers-success-heading font-headline font-bold">
              We have recieved your application
            </h1>

            <p className="careers-success-body">
              Hi {firstName}, Thank you for submitting your application for the role of {jobTitle}{' '}
              at Q-worship. Someone from our team will check if you&apos;re a fit and be in touch to
              discus next steps.
            </p>

            <div className="careers-success-actions">
              <Link href="/about" className="careers-success-primary-btn">
                Browse more jobs
              </Link>
              <Link href="/features" className="careers-success-secondary-btn">
                Explore features
              </Link>
            </div>
          </div>

          <div className="careers-success-media">
            <img
              src={images.handsFreeFrame}
              alt="Q-worship presentation software interface"
              className="careers-success-image"
            />
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
