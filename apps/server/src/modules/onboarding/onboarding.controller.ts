import { Request, Response } from 'express';
import { Organization } from '../organization/organization.model.js';
import { User } from '../auth/auth.model.js';
import { Campaign } from '../referral/campaign.model.js';
import { grantMembership, resolveActiveOrganization } from '../organization/organization.service.js';
import { ensureAccountFor, slotUsage } from '../organization/account.service.js';
import { notifyReferralNewOrganization } from '../notifications/notification.service.js';

const TRIAL_DAYS = 30;

export async function getOnboarding(req: Request, res: Response) {
  const user = (req as any).user;
  const organization = (await resolveActiveOrganization(req))?.organization ?? null;
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
    const details = {
      name: churchName.trim(),
      denomination: denomination.trim(),
      country: country.trim(),
      city: city.trim(),
      zipCode: typeof zip === 'string' ? zip.trim() : '',
    };

    // Onboarding either fills in the church this user already has, or creates
    // their first one. The upsert this replaced keyed on ownerId, which cannot
    // express a user who belongs to several churches.
    const existing = await resolveActiveOrganization(req);
    let organization;
    if (existing) {
      organization = await Organization.findByIdAndUpdate(
        existing.organization._id,
        details,
        { new: true, runValidators: true },
      );
    } else {
      /*
       * A SECOND church costs a slot. The first never does.
       *
       * This path created churches without consulting the plan at all, so an
       * owner could hold more than they were entitled to and the slot model
       * only really applied to the branch-invite flow. It is checked here
       * rather than trusted to the client, which is where the plan modal
       * lives but not where the rule can be enforced.
       *
       * Somebody with no account yet is signing up: let them through. There
       * is nothing to count, and refusing a person their first church
       * because billing has not caught up would be absurd.
       */
      const owned = await Organization.countDocuments({ ownerId: user._id });
      if (owned > 0) {
        const account = await ensureAccountFor(
          (await Organization.findOne({ ownerId: user._id }).select('_id').lean())!._id as any,
          user._id,
        );
        const slots = await slotUsage(account);
        if (slots.available < 1) {
          return res.status(402).json({
            success: false,
            message:
              `Your plan covers ${slots.total} ${slots.total === 1 ? 'church' : 'churches'} and ` +
              `you are using ${slots.used}. Standard adds a slot for every branch you add.`,
            errorType: 'FEATURE_NOT_IN_PLAN',
            feature: 'branches',
            featureLabel: 'Branches and campuses',
            slots,
          });
        }
      }

      organization = await Organization.create({ ...details, ownerId: user._id });
      await grantMembership(user._id, organization._id as any, 'owner');
      user.activeOrganizationId = organization._id;
    }
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
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

  const organization = (await resolveActiveOrganization(req))?.organization ?? null;
  if (organization) {
    const isNewReferral = !!referee && String(organization.referredBy || '') !== String(referee._id);
    if (referee) {
      organization.referredBy = referee._id as any;
      organization.referralCodeUsed = referralCode;
      organization.hearAboutUsSource = [];

      // Campaign attribution is best-effort: an unknown/foreign slug is ignored
      // silently rather than blocking signup over an attribution mismatch.
      const rawCampaign = req.body.campaign;
      const campaignSlug = typeof rawCampaign === 'string' ? rawCampaign.trim().toLowerCase() : '';
      if (campaignSlug) {
        const campaign = await Campaign.findOne({ refereeId: referee._id, slug: campaignSlug });
        organization.campaignId = campaign ? (campaign._id as any) : undefined;
      }
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
    const organization = (await resolveActiveOrganization(req))?.organization ?? null;
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
