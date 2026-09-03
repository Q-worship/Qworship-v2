import { Request, Response } from 'express';
import { Organization } from '../organization/organization.model.js';
import { User } from '../auth/auth.model.js';
import { notifyReferralNewOrganization } from '../notifications/notification.service.js';

const TRIAL_DAYS = 30;

export async function getOnboarding(req: Request, res: Response) {
  const user = (req as any).user;
  const organization = await Organization.findOne({ ownerId: user._id });
  return res.json({
    success: true,
    onboarding: {
      status: user.onboardingStatus,
      selectedFeatures: user.selectedFeatures || [],
      organization,
      planType: user.planType,
      trialStatus: user.trialStatus,
      trialStartDate: user.trialStartDate,
      trialEndDate: user.trialEndDate,
    },
  });
}

export async function saveOrganization(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { churchName, denomination, country, city, zip } = req.body;
    if (![churchName, denomination, country, city].every(value => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ success: false, message: 'Church name, denomination, country, and city are required' });
    }
    const organization = await Organization.findOneAndUpdate(
      { ownerId: user._id },
      { name: churchName.trim(), denomination: denomination.trim(), country: country.trim(), city: city.trim(), zipCode: typeof zip === 'string' ? zip.trim() : '', ownerId: user._id },
      { new: true, upsert: true, runValidators: true },
    );
    user.organizationName = organization.name;
    if (user.onboardingStatus === 'pending') user.onboardingStatus = 'organization';
    await user.save();
    return res.json({ success: true, organization, onboardingStatus: user.onboardingStatus });
  } catch (error) {
    console.error('Save onboarding organization error:', error);
    return res.status(500).json({ success: false, message: 'Unable to save organization' });
  }
}

export async function savePreferences(req: Request, res: Response) {
  const user = (req as any).user;
  const selectedFeatures = req.body.selectedFeatures;
  if (!Array.isArray(selectedFeatures) || !selectedFeatures.every(value => typeof value === 'string') || selectedFeatures.length > 30) {
    return res.status(400).json({ success: false, message: 'Selected features must be a valid list' });
  }

  const rawReferralCode = req.body.referralCode;
  const referralCode = typeof rawReferralCode === 'string' ? rawReferralCode.trim().toUpperCase() : '';
  const hearAboutUsSource = req.body.hearAboutUsSource;

  let referee = null;
  if (referralCode) {
    referee = await User.findOne({ referralCode, role: 'referee' });
    if (!referee) {
      return res.status(400).json({ success: false, message: "We couldn't find that referral code. Check it and try again, or leave it blank." });
    }
  } else if (hearAboutUsSource !== undefined) {
    if (!Array.isArray(hearAboutUsSource) || !hearAboutUsSource.every(value => typeof value === 'string') || hearAboutUsSource.length > 10) {
      return res.status(400).json({ success: false, message: 'How you heard about us must be a valid list' });
    }
  }

  const organization = await Organization.findOne({ ownerId: user._id });
  if (organization) {
    const isNewReferral = !!referee && String(organization.referredBy || '') !== String(referee._id);
    if (referee) {
      organization.referredBy = referee._id as any;
      organization.referralCodeUsed = referralCode;
      organization.hearAboutUsSource = [];
    } else if (Array.isArray(hearAboutUsSource)) {
      organization.hearAboutUsSource = [...new Set(hearAboutUsSource.map((value: string) => value.trim()).filter(Boolean))];
      organization.referredBy = undefined;
      organization.referralCodeUsed = undefined;
    }
    await organization.save();
    if (isNewReferral && referee) {
      notifyReferralNewOrganization(referee._id as any, organization.name).catch(() => {});
    }
  }

  user.selectedFeatures = [...new Set(selectedFeatures.map(value => value.trim()).filter(Boolean))];
  user.onboardingStatus = 'preferences';
  await user.save();
  return res.json({ success: true, selectedFeatures: user.selectedFeatures, onboardingStatus: user.onboardingStatus });
}

export async function completeOnboarding(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const organization = await Organization.findOne({ ownerId: user._id });
    if (!organization) return res.status(400).json({ success: false, message: 'Complete organization setup first' });
    if (user.onboardingStatus !== 'preferences') return res.status(400).json({ success: false, message: 'Complete onboarding preferences first' });
    if (user.trialActivatedAt || user.trialStatus !== 'not_started') {
      return res.status(409).json({ success: false, message: 'The free trial has already been activated', errorType: 'TRIAL_ALREADY_USED' });
    }
    const now = new Date();
    const endsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const activatedUser = await User.findOneAndUpdate(
      { _id: user._id, trialStatus: 'not_started', trialActivatedAt: { $exists: false } },
      { $set: { onboardingStatus: 'completed', onboardingCompletedAt: now, planType: 'cloud_pro', accountType: 'premium', trialStatus: 'active', subscriptionStatus: 'trial', trialStartDate: now, trialEndDate: endsAt, trialActivatedAt: now } },
      { new: true },
    );
    if (!activatedUser) return res.status(409).json({ success: false, message: 'The free trial has already been activated', errorType: 'TRIAL_ALREADY_USED' });
    organization.subscriptionType = 'premium';
    organization.subscriptionStatus = 'trial';
    await organization.save();
    return res.json({ success: true, nextStep: '/project-selection', trial: { status: 'active', startedAt: now, endsAt, daysRemaining: TRIAL_DAYS } });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    return res.status(500).json({ success: false, message: 'Unable to complete onboarding' });
  }
}
