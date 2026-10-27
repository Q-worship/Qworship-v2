import { Request, Response } from 'express';
import { Organization } from './organization.model.js';
import { User } from '../auth/auth.model.js';
import { canWrite, getMembership, grantMembership } from './organization.service.js';
import { notifyReferralOrgActivated } from '../notifications/notification.service.js';

export const getOrganization = async (req: Request, res: Response) => {
  try {
    // Belonging to the church is what grants the read, not having created it.
    const role = await getMembership((req as any).user._id, req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    return res.status(200).json({ success: true, organization });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateOrganization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const allowed = ['name', 'address', 'city', 'state', 'zipCode', 'country', 'phone', 'website', 'denomination', 'size'];
    const updateData = Object.fromEntries(allowed.filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]]));
    
    // Changing a church's settings needs owner or admin there; a plain member
    // can read it but not rename it.
    const role = await getMembership((req as any).user._id, id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    if (!canWrite(role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to update this organization' });
    }

    const organization = await Organization.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    
    return res.status(200).json({ success: true, organization });
  } catch (error) {
    console.error('Error updating organization:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createOrganization = async (req: Request, res: Response) => {
  try {
    const { 
      name, address, city, state, zipCode, country, 
      phone, website, denomination, size
    } = req.body;

    const userId = (req as any).user._id;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    // 1. Create Organization. ownerId records who created it; the membership
    // below is what actually grants access.
    const organization = await Organization.create({
      name, address, city, state, zipCode, country,
      phone, website, denomination, size,
      ownerId: userId
    });

    // 2. The creator becomes its owner.
    await grantMembership(userId, organization._id as any, 'owner');

    // 3. Link the organization back to the user
    await User.findByIdAndUpdate(userId, {
      organizationName: name,
      activeOrganizationId: organization._id
    });

    return res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      organization: {
        id: organization._id, // Map MongoDB _id natively
        name: organization.name
      }
    });

  } catch (error) {
    console.error('Organization creation error:', error);
    res.status(500).json({ success: false, error: 'Organization setup failed' });
  }
};

const SUBSCRIPTION_TYPES = ['free', 'basic', 'premium', 'enterprise'];
const SUBSCRIPTION_STATUSES = ['active', 'inactive', 'trial', 'cancelled'];

export const adminUpdateOrganizationSubscription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subscriptionType, subscriptionStatus } = req.body;

    if (subscriptionType !== undefined && !SUBSCRIPTION_TYPES.includes(subscriptionType)) {
      return res.status(400).json({ success: false, message: 'Invalid subscriptionType' });
    }
    if (subscriptionStatus !== undefined && !SUBSCRIPTION_STATUSES.includes(subscriptionStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid subscriptionStatus' });
    }

    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    if (subscriptionType !== undefined) {
      organization.subscriptionType = subscriptionType;
    }
    let justActivated = false;
    if (subscriptionStatus !== undefined) {
      if (subscriptionStatus === 'active' && organization.subscriptionStatus !== 'active') {
        organization.activatedAt = new Date();
        justActivated = true;
      }
      organization.subscriptionStatus = subscriptionStatus;
    }
    await organization.save();

    if (justActivated && organization.referredBy) {
      notifyReferralOrgActivated(organization.referredBy as any, organization.name).catch(() => {});
    }

    return res.status(200).json({ success: true, organization });
  } catch (error) {
    console.error('Error updating organization subscription:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const selectPlan = async (req: Request, res: Response) => {
  try {
    const { planType } = req.body;
    const userId = (req as any).user._id;

    if (!planType) {
      return res.status(400).json({ success: false, error: 'planType is required' });
    }

    // Convert planType to accountType format
    const accountType = planType === 'trial' ? 'free' : planType;

    // Persist to user model 
    await User.findByIdAndUpdate(userId, {
      accountType,
      isActive: true
    });

    res.json({
      success: true,
      message: 'Plan selected successfully',
      nextStep: '/project-selection',
      planType,
    });
  } catch (error) {
    console.error('Plan selection error:', error);
    res.status(500).json({ success: false, error: 'Plan selection failed' });
  }
};
