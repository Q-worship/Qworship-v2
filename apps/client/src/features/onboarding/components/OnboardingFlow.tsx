import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import {
  getAuthToken,
  getStoredAuthUser,
  isOnboardingComplete,
  setOnboardingComplete,
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

type OnboardingWelcomeStep = 1 | 2 | 3

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
  if (isOnboardingComplete(user?.email)) {
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

  useEffect(() => {
    if (!getAuthToken()) {
      setLocation('/login')
    }
  }, [setLocation])

  const handleReachPlans = () => {
    setPhase('plans')
  }

  const handleReachTrialWelcome = () => {
    setPhase('trialWelcome')
  }

  const handleCompleteOnboarding = () => {
    const email = getStoredAuthUser()?.email
    if (email) {
      setOnboardingComplete(email)
    }
    setPhase('complete')
  }

  const toggleFeature = (feature: OnboardingFeatureId) => {
    setSelectedFeatures((current) =>
      current.includes(feature)
        ? current.filter((item) => item !== feature)
        : [...current, feature],
    )
  }

  if (phase === 'complete') {
    return <ProjectSelectionView />
  }

  const slide = onboardingSlides[step - 1]

  const renderWelcomeStep = () => {
    switch (step) {
      case 1:
        return <WelcomeStep onNext={() => setStep(2)} />
      case 2:
        return (
          <ChurchInfoStep
            data={churchInfo}
            onChange={setChurchInfo}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )
      case 3:
        return (
          <FeatureInterestsStep
            selectedFeatures={selectedFeatures}
            onToggleFeature={toggleFeature}
            onNext={handleReachPlans}
            onBack={() => setStep(2)}
          />
        )
      default:
        return null
    }
  }

  const skipButton =
    step === 3 && phase === 'welcome' ? (
      <button
        type="button"
        className="onboarding-step__skip onboarding-step__skip--inline"
        onClick={handleReachPlans}
      >
        Skip
      </button>
    ) : null

  return (
    <div className="onboarding-page">
      <DashboardBackdrop />

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
            <TrialWelcomeModal onStartTrial={handleCompleteOnboarding} />
          </div>
        </OnboardingOverlay>
      ) : null}
    </div>
  )
}
