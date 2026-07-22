import { Router } from 'express';
import { protect } from '../auth/auth.middleware.js';
import { completeOnboarding, getOnboarding, saveOrganization, savePreferences } from './onboarding.controller.js';

export const onboardingRouter = Router();
onboardingRouter.get('/onboarding', protect, getOnboarding);
onboardingRouter.put('/onboarding/organization', protect, saveOrganization);
onboardingRouter.put('/onboarding/preferences', protect, savePreferences);
onboardingRouter.post('/onboarding/complete', protect, completeOnboarding);
