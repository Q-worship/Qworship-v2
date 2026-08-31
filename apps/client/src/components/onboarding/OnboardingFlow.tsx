import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import {
  completeOnboarding,
  getOnboardingState,
  getAuthToken,
  getStoredAuthUser,
  saveOnboardingOrganization,
  saveOnboardingPreferences,
} from '@/lib/authApi'
import { onboardingSlides } from '@/lib/onboardingSlides'
import type { OnboardingFeatureId } from '@/lib/onboardingFeatures'
import { DashboardBackdrop } from './DashboardBackdrop'
import { OnboardingOverlay } from './OnboardingOverlay'
import { OnboardingModal } from './OnboardingModal'
import { PlanSelectionOverlay } from './PlanSelectionOverlay'
import { TrialWelcomeModal } from './TrialWelcomeModal'
import { ProjectSelectionView } from './ProjectSelectionView'
import { WelcomeStep } from './steps/WelcomeStep'
import { ChurchInfoStep, type ChurchInfoData } from './steps/ChurchInfoStep'
import { FeatureInterestsStep } from './steps/FeatureInterestsStep'
import { ReferralSourceStep } from './steps/ReferralSourceStep'

type OnboardingWelcomeStep = 1 | 2 | 3 | 4

type OnboardingPhase =
  | 'welcome'
  | 'plans'
  | 'trialWelcome'
  | 'complete'

const initialChurchInfo: ChurchInfoData = {
  churchName: '',
  denomination: '',
  country: '',
  city: '',
  zip: '',
}

function readInitialPhase(): OnboardingPhase {
  const user = getStoredAuthUser()
  if (user?.onboardingStatus === 'completed') {
    return 'complete'
  }
  return 'welcome'
}

export function OnboardingFlow() {
  const [, setLocation] = useLocation()
  const [phase, setPhase] = useState<OnboardingPhase>(readInitialPhase)
  const [step, setStep] = useState<OnboardingWelcomeStep>(1)
  const [churchInfo, setChurchInfo] = useState<ChurchInfoData>(initialChurchInfo)
  const [selectedFeatures, setSelectedFeatures] = useState<OnboardingFeatureId[]>([])
  const [referralCode, setReferralCode] = useState('')
  const [hearAboutUsSource, setHearAboutUsSource] = useState<string[]>([])
  const [referralError, setReferralError] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!getAuthToken()) {
      setLocation('/login')
    }
  }, [setLocation])

  useEffect(() => {
    if (!getAuthToken()) return
    getOnboardingState().then(({ onboarding }) => {
      if (onboarding.status === 'completed') {
        setLocation('/project-selection')
        return
      }
      if (onboarding.organization) {
        setChurchInfo({ churchName: onboarding.organization.name, denomination: onboarding.organization.denomination || '', country: onboarding.organization.country || '', city: onboarding.organization.city || '', zip: onboarding.organization.zipCode || '' })
      }
      setSelectedFeatures((onboarding.selectedFeatures || []) as OnboardingFeatureId[])
      if (onboarding.status === 'organization') setStep(3)
      if (onboarding.status === 'preferences') setPhase('plans')
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load onboarding'))
  }, [setLocation])

  const handleSaveOrganization = async () => {
    setIsSaving(true)
    setError('')
    try {
      await saveOnboardingOrganization(churchInfo)
      setStep(3)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save church information')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReachPlans = async () => {
    setIsSaving(true)
    setError('')
    setReferralError('')
    try {
      const trimmedCode = referralCode.trim()
      await saveOnboardingPreferences(selectedFeatures, trimmedCode ? { referralCode: trimmedCode } : { hearAboutUsSource })
      setPhase('plans')
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to save preferences'
      if (referralCode.trim()) {
        setReferralError(message)
      } else {
        setError(message)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleReachTrialWelcome = () => {
    setPhase('trialWelcome')
  }

  const handleCompleteOnboarding = async () => {
    setIsSaving(true)
    setError('')
    try {
      await completeOnboarding()
      const user = getStoredAuthUser()
      if (user) {
        user.onboardingStatus = 'completed'
        user.trialStatus = 'active'
        localStorage.setItem('qworship_user', JSON.stringify(user))
      }
      setLocation('/project-selection')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start trial')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleFeature = (feature: OnboardingFeatureId) => {
    setSelectedFeatures((current) =>
      current.includes(feature)
        ? current.filter((item) => item !== feature)
        : [...current, feature],
    )
  }

  const toggleSource = (source: string) => {
    setHearAboutUsSource((current) =>
      current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source],
    )
  }

  const handleReferralCodeChange = (value: string) => {
    setReferralCode(value)
    setReferralError('')
    if (value.trim()) {
      setHearAboutUsSource([])
    }
  }

  if (phase === 'complete') {
    return <ProjectSelectionView />
  }

  const slide = onboardingSlides[Math.min(step, 3) - 1]

  const renderWelcomeStep = () => {
    switch (step) {
      case 1:
        return <WelcomeStep onNext={() => setStep(2)} />
      case 2:
        return (
          <ChurchInfoStep
            data={churchInfo}
            onChange={setChurchInfo}
            onNext={handleSaveOrganization}
            onBack={() => setStep(1)}
          />
        )
      case 3:
        return (
          <FeatureInterestsStep
            selectedFeatures={selectedFeatures}
            onToggleFeature={toggleFeature}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )
      case 4:
        return (
          <ReferralSourceStep
            referralCode={referralCode}
            onReferralCodeChange={handleReferralCodeChange}
            hearAboutUsSource={hearAboutUsSource}
            onToggleSource={toggleSource}
            onNext={() => void handleReachPlans()}
            onBack={() => setStep(3)}
            error={referralError}
            isSaving={isSaving}
          />
        )
      default:
        return null
    }
  }

  const skipButton =
    step === 4 && phase === 'welcome' ? (
      <button
        type="button"
        className="onboarding-step__skip onboarding-step__skip--inline"
        onClick={() => void handleReachPlans()}
      >
        Skip
      </button>
    ) : null

  return (
    <div className="onboarding-page">
      <DashboardBackdrop />
      {error ? <div className="onboarding-api-error" role="alert">{error}</div> : null}
      {isSaving ? <div className="onboarding-saving" role="status">Saving…</div> : null}

      {phase === 'welcome' ? (
        <OnboardingOverlay visible>
          <OnboardingModal slide={slide} topRight={skipButton}>
            {renderWelcomeStep()}
          </OnboardingModal>
        </OnboardingOverlay>
      ) : null}

      {phase === 'plans' ? (
        <OnboardingOverlay visible>
          <div className="onboarding-wide-modal">
            <PlanSelectionOverlay
              onProceedToCheckout={handleReachTrialWelcome}
              onStartFreeTrial={handleReachTrialWelcome}
            />
          </div>
        </OnboardingOverlay>
      ) : null}

      {phase === 'trialWelcome' ? (
        <OnboardingOverlay visible>
          <div className="onboarding-wide-modal onboarding-wide-modal--trial">
            <TrialWelcomeModal onStartTrial={() => void handleCompleteOnboarding()} />
          </div>
        </OnboardingOverlay>
      ) : null}
    </div>
  )
}
