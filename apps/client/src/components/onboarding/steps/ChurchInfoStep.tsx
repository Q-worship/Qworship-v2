import { useState } from 'react'
import { COUNTRY_OPTIONS } from '@/lib/countries'
import { OnboardingDropdown } from '../OnboardingDropdown'
import { OnboardingSearchableDropdown } from '../OnboardingSearchableDropdown'
import { OnboardingProgress } from '../OnboardingProgress'

const DENOMINATION_OPTIONS = ['Catholic', 'Baptist', 'Pentecostal', 'Enter yours'] as const
const PRESET_DENOMINATIONS = ['Catholic', 'Baptist', 'Pentecostal'] as const
const CUSTOM_DENOMINATION = 'Enter yours'

export interface ChurchInfoData {
  churchName: string
  denomination: string
  country: string
  city: string
  zip: string
}

interface ChurchInfoStepProps {
  data: ChurchInfoData
  onChange: (data: ChurchInfoData) => void
  onNext: () => void
  onBack: () => void
}

function isPresetDenomination(value: string): value is (typeof PRESET_DENOMINATIONS)[number] {
  return (PRESET_DENOMINATIONS as readonly string[]).includes(value)
}

function isCustomDenominationValue(value: string): boolean {
  return value !== '' && !isPresetDenomination(value) && value !== CUSTOM_DENOMINATION
}

export function ChurchInfoStep({ data, onChange, onNext, onBack }: ChurchInfoStepProps) {
  const [denominationIsCustom, setDenominationIsCustom] = useState(
    () => isCustomDenominationValue(data.denomination),
  )
  const [denominationError, setDenominationError] = useState('')

  const updateField = <K extends keyof ChurchInfoData>(field: K, value: ChurchInfoData[K]) => {
    onChange({ ...data, [field]: value })
  }

  const handleDenominationChange = (value: string) => {
    if (value === CUSTOM_DENOMINATION) {
      setDenominationIsCustom(true)
      updateField('denomination', '')
      setDenominationError('')
      return
    }

    setDenominationIsCustom(false)
    updateField('denomination', value)
    setDenominationError('')
  }

  const handleCustomDenominationChange = (value: string) => {
    updateField('denomination', value)
    if (value.trim()) {
      setDenominationError('')
    }
  }

  const denominationDisplayValue = denominationIsCustom
    ? data.denomination.trim() || CUSTOM_DENOMINATION
    : data.denomination

  const denominationDropdownValue = denominationIsCustom ? CUSTOM_DENOMINATION : data.denomination

  const isFormValid =
    data.churchName.trim() !== '' &&
    data.country.trim() !== '' &&
    data.city.trim() !== '' &&
    (denominationIsCustom ? data.denomination.trim() !== '' : data.denomination !== '')

  const handleContinue = () => {
    if (denominationIsCustom && !data.denomination.trim()) {
      setDenominationError('Please enter your denomination.')
      return
    }

    if (!isFormValid) {
      return
    }

    onNext()
  }

  return (
    <div className="onboarding-step">
      <OnboardingProgress step={2} />

      <div className="onboarding-step__content">
        <h1 className="onboarding-step__heading onboarding-step__heading--small">
          Ready to Elevate your church experience?
        </h1>

        <p className="onboarding-step__description">
          Please answer the questions below and tell us a bit about your church or
          organisation so we can help you elevate your worship experience.
        </p>

        <div className="onboarding-step__form">
          <div className="onboarding-field">
            <label className="onboarding-field__label" htmlFor="church-name">
              What is the name of your church or organisation?
            </label>
            <input
              id="church-name"
              type="text"
              className="onboarding-field__input onboarding-field__input--filled"
              placeholder="Please enter your church name"
              value={data.churchName}
              onChange={(event) => updateField('churchName', event.target.value)}
            />
            <p className="onboarding-field__hint">
              The Q-worship license belongs to the church group. Each church has a
              unique or third license.
            </p>
          </div>

          <OnboardingDropdown
            id="denomination"
            label="Denomination"
            value={denominationDropdownValue}
            displayValue={denominationDisplayValue}
            placeholder="Please select a denomination for your church, e.g Baptist"
            options={DENOMINATION_OPTIONS}
            onChange={handleDenominationChange}
          />

          {denominationIsCustom ? (
            <div className="onboarding-field">
              <label className="onboarding-field__label" htmlFor="custom-denomination">
                Your denomination
              </label>
              <input
                id="custom-denomination"
                type="text"
                className="onboarding-field__input onboarding-field__input--filled"
                placeholder="Enter your denomination"
                value={data.denomination}
                onChange={(event) => handleCustomDenominationChange(event.target.value)}
              />
              {denominationError ? (
                <p className="onboarding-field__error">{denominationError}</p>
              ) : null}
            </div>
          ) : null}

          <OnboardingSearchableDropdown
            id="country"
            label="Please enter your church address"
            value={data.country}
            placeholder="Select the country where your church is located"
            options={COUNTRY_OPTIONS}
            onChange={(value) => updateField('country', value)}
          />

          <div className="onboarding-field__row">
            <div className="onboarding-field">
              <label className="onboarding-field__label" htmlFor="city">
                City
              </label>
              <input
                id="city"
                type="text"
                className="onboarding-field__input onboarding-field__input--filled"
                placeholder="Enter your city"
                value={data.city}
                onChange={(event) => updateField('city', event.target.value)}
              />
            </div>

            <div className="onboarding-field">
              <label className="onboarding-field__label" htmlFor="zip">
                Postal or Zip code
              </label>
              <input
                id="zip"
                type="text"
                className="onboarding-field__input onboarding-field__input--filled"
                placeholder="Enter your postal or zip code"
                value={data.zip}
                onChange={(event) => updateField('zip', event.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="onboarding-step__actions">
        <button
          type="button"
          className="onboarding-step__cta"
          onClick={handleContinue}
          disabled={!isFormValid}
        >
          Continue to preferences
        </button>
        <button type="button" className="onboarding-step__link" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  )
}
