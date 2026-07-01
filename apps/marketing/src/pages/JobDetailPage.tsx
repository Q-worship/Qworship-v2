import { useEffect, useState } from 'react'
import { useLocation, useRoute } from 'wouter'
import { getJobOpeningById } from '@/lib/theme'
import { JobApplicationFormSection } from '@/components/sections/JobApplicationFormSection'
import { JobApplicationSuccess } from '@/components/sections/JobApplicationSuccess'
import { JobDetailSection } from '@/components/sections/JobDetailSection'

export function JobDetailPage() {
  const [, params] = useRoute('/about/careers/:jobId')
  const [, setLocation] = useLocation()
  const [submitted, setSubmitted] = useState(false)
  const [firstName, setFirstName] = useState('')

  const job = params?.jobId ? getJobOpeningById(params.jobId) : undefined

  useEffect(() => {
    if (!job) {
      setLocation('/about')
    }
  }, [job, setLocation])

  useEffect(() => {
    if (window.location.hash === '#apply' && job && !submitted) {
      requestAnimationFrame(() => {
        document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [job, submitted])

  if (!job) {
    return null
  }

  if (submitted) {
    return <JobApplicationSuccess firstName={firstName} jobTitle={job.title} />
  }

  return (
    <>
      <JobDetailSection job={job} />
      <JobApplicationFormSection
        onSuccess={({ firstName: name }) => {
          setFirstName(name)
          setSubmitted(true)
          window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
        }}
      />
    </>
  )
}
