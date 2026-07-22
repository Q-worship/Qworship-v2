import { FormEvent, useRef, useState } from 'react'
import { jobApplicationCountries } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface JobApplicationFormSectionProps {
  onSuccess: (data: { firstName: string }) => void
}

const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.txt,.rtf'

interface FileUploadProps {
  id: string
  label: string
  required?: boolean
  uploadText: string
  file: File | null
  onChange: (file: File | null) => void
}

function FileUpload({ id, label, required, uploadText, file, onChange }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="careers-form-field careers-form-field--upload">
      <label htmlFor={id} className="careers-upload-label font-headline font-bold">
        {label}
        {required && <span className="careers-required">*</span>}
      </label>
      <button
        type="button"
        className="careers-upload-zone"
        onClick={() => inputRef.current?.click()}
      >
        <MaterialIcon name="upload" className="careers-upload-icon" aria-hidden />
        <span className="careers-upload-text">{file ? file.name : uploadText}</span>
        <span className="careers-upload-hint">Accepted file types: pdf, doc, docx, txt, rtf</span>
      </button>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="careers-upload-input"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </div>
  )
}

export function JobApplicationFormSection({ onSuccess }: JobApplicationFormSectionProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [resume, setResume] = useState<File | null>(null)
  const [coverLetter, setCoverLetter] = useState<File | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !country || !phone.trim() || !city.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    if (!resume || !coverLetter) {
      setError('Please upload both your resume and cover letter.')
      return
    }

    onSuccess({ firstName: firstName.trim() })
  }

  return (
    <section id="apply" className="careers-page careers-apply-section pb-24 reveal">
      <SiteContainer>
        <h2 className="careers-apply-heading font-headline font-bold">Apply for this job</h2>
        <p className="careers-apply-note">
          <span className="careers-required">*</span> indicates a required field
        </p>

        <form className="careers-apply-form" onSubmit={handleSubmit} noValidate>
          <div className="careers-form-grid careers-form-grid--two">
            <div className="careers-form-field">
              <label htmlFor="firstName" className="careers-field-label">
                <span className="careers-required">*</span>First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="careers-field-input"
                required
              />
            </div>
            <div className="careers-form-field">
              <label htmlFor="lastName" className="careers-field-label">
                <span className="careers-required">*</span>Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="careers-field-input"
                required
              />
            </div>
          </div>

          <div className="careers-form-field">
            <label htmlFor="email" className="careers-field-label">
              <span className="careers-required">*</span>Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="careers-field-input"
              required
            />
          </div>

          <div className="careers-form-grid careers-form-grid--country">
            <div className="careers-form-field">
              <label htmlFor="country" className="careers-field-label">
                <span className="careers-required">*</span>Country
              </label>
              <div className="careers-select-wrap">
                <select
                  id="country"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="careers-field-input careers-field-select"
                  required
                >
                  <option value="">Select country</option>
                  {jobApplicationCountries.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <MaterialIcon name="expand_more" className="careers-select-icon" aria-hidden />
              </div>
            </div>
            <div className="careers-form-field">
              <label htmlFor="phone" className="careers-field-label">
                <span className="careers-required">*</span>Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="careers-field-input"
                required
              />
            </div>
          </div>

          <div className="careers-form-field">
            <label htmlFor="city" className="careers-field-label">
              <span className="careers-required">*</span>City
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="careers-field-input"
              required
            />
          </div>

          <FileUpload
            id="resume"
            label="Resume/ CV"
            required
            uploadText="Upload your resume or CV"
            file={resume}
            onChange={setResume}
          />

          <FileUpload
            id="coverLetter"
            label="Cover Letter"
            required
            uploadText="Upload your cover letter"
            file={coverLetter}
            onChange={setCoverLetter}
          />

          <div className="careers-form-field">
            <label htmlFor="linkedin" className="careers-upload-label font-headline font-bold">
              LinkedIn Profile
            </label>
            <div className="careers-linkedin-field">
              <span className="careers-linkedin-icon" aria-hidden>
                in
              </span>
              <input
                id="linkedin"
                type="url"
                value={linkedin}
                onChange={(event) => setLinkedin(event.target.value)}
                placeholder="https://linkedin.com/your account"
                className="careers-linkedin-input"
              />
            </div>
          </div>

          {error && <p className="careers-form-error">{error}</p>}

          <button type="submit" className="careers-submit-btn">
            Submit Application
          </button>
        </form>
      </SiteContainer>
    </section>
  )
}
