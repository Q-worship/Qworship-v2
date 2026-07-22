import { Router } from 'express';
import { signIn, signUp, verifyEmail, resendVerification, requestPasswordReset, resetPassword, updateProfile, updatePassword } from './auth.controller.js';
import { rateLimit } from './rate-limit.middleware.js';

export const authRouter = Router();

// Primary User/Admin Authentication Flows
authRouter.post('/signin', rateLimit('signin', 10, 15 * 60 * 1000), signIn);
authRouter.post('/login', rateLimit('login', 10, 15 * 60 * 1000), signIn);

// Registration flows
authRouter.post('/signup', rateLimit('signup', 5, 60 * 60 * 1000), signUp);
authRouter.post('/register', rateLimit('register', 5, 60 * 60 * 1000), signUp);
authRouter.post('/verify-email', rateLimit('verify', 10, 15 * 60 * 1000), verifyEmail);
authRouter.post('/resend-verification', rateLimit('resend', 5, 60 * 60 * 1000), resendVerification);
authRouter.post('/forgot-password', rateLimit('forgot-password', 5, 60 * 60 * 1000), requestPasswordReset);
authRouter.post('/reset-password', rateLimit('reset-password', 10, 60 * 60 * 1000), resetPassword);

authRouter.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

import { protect } from './auth.middleware.js';

const currentUserHandler = [protect, async (req: any, res: any) => {
  try {
    const { Organization } = await import('../organization/organization.model.js');
    if (req.user.trialStatus === 'active' && req.user.trialEndDate && req.user.trialEndDate <= new Date()) {
      req.user.trialStatus = 'expired';
      req.user.subscriptionStatus = 'inactive';
      await req.user.save();
    }
    const organizations = await Organization.find({ ownerId: req.user._id });
    
    res.status(200).json({ 
      success: true, 
      user: {
        id: req.user._id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        username: req.user.username,
        accountType: req.user.accountType,
        phoneNumber: req.user.phoneNumber,
        bio: req.user.bio,
        profilePicture: req.user.profilePicture,
        planType: req.user.planType,
        trialStartDate: req.user.trialStartDate,
        trialEndDate: req.user.trialEndDate,
        subscriptionStatus: req.user.subscriptionStatus,
        emailVerified: req.user.emailVerified,
        onboardingStatus: req.user.onboardingStatus,
        onboardingCompletedAt: req.user.onboardingCompletedAt,
        selectedFeatures: req.user.selectedFeatures,
        trialStatus: req.user.trialStatus,
        createdAt: req.user.createdAt
      },
      organizations: organizations.map(org => ({ id: org._id, name: org.name }))
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ success: false, message: 'Server error fetching user' });
  }
}];

authRouter.get('/me', ...currentUserHandler as any);
authRouter.get('/user', ...currentUserHandler as any);
authRouter.get('/current', ...currentUserHandler as any);

const protectMiddlewares = [protect] as any;
authRouter.put('/profile', ...protectMiddlewares, updateProfile as any);
authRouter.put('/update-password', ...protectMiddlewares, updatePassword as any);
