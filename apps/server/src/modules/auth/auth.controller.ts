import { randomBytes, randomInt } from 'crypto';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from './auth.model.js';
import { EmailVerification } from './email-verification.model.js';
import { sendPasswordResetEmail, sendVerificationEmail } from './email.service.js';
import { notifyPasswordChange } from '../notifications/notification.service.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function jwtSecret() {
  const value = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!value) throw new Error('JWT_SECRET or SESSION_SECRET is required');
  return value;
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function publicUser(user: any) {
  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    organizationName: user.organizationName,
    emailVerified: user.emailVerified,
    onboardingStatus: user.onboardingStatus,
    trialStatus: user.trialStatus,
    trialStartDate: user.trialStartDate,
    trialEndDate: user.trialEndDate,
    subscriptionStatus: user.subscriptionStatus,
  };
}

function createToken(user: any) {
  return jwt.sign({ id: user._id, role: user.role }, jwtSecret(), { expiresIn: '7d' });
}

async function issueVerification(user: any, enforceCooldown: boolean) {
  const previous = await EmailVerification.findOne({ userId: user._id, purpose: 'verify_email', consumedAt: { $exists: false } }).sort({ lastSentAt: -1 });
  if (enforceCooldown && previous && Date.now() - previous.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - previous.lastSentAt.getTime())) / 1000);
    const error = new Error('Please wait before requesting another code') as Error & { retryAfter?: number };
    error.retryAfter = retryAfter;
    throw error;
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const codeHash = await bcrypt.hash(code, 10);
  await sendVerificationEmail(user.email, user.firstName, code);
  await EmailVerification.deleteMany({ userId: user._id, purpose: 'verify_email' });
  await EmailVerification.create({
    userId: user._id,
    email: user.email,
    codeHash,
    attempts: 0,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    lastSentAt: new Date(),
    purpose: 'verify_email',
  });
}

export const signUp = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { firstName, lastName, password } = req.body;
    if (!email || !firstName?.trim() || !lastName?.trim() || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Valid name, email, and an 8-character password are required', errorType: 'VALIDATION_ERROR' });
    }

    const existing = await User.findOne({ email });
    if (existing?.emailVerified) {
      return res.status(409).json({ success: false, message: 'Email already in use', errorType: 'DUPLICATE_EMAIL' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = existing || await User.create({
      username: email,
      email,
      password: passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: 'user',
      isActive: true,
      emailVerified: false,
    });
    if (existing) {
      existing.firstName = firstName.trim();
      existing.lastName = lastName.trim();
      existing.password = passwordHash;
      await existing.save();
    }

    await issueVerification(user, false);
    return res.status(202).json({ success: true, email, message: 'Verification code sent.' });
  } catch (error) {
    console.error('Sign-up error:', error);
    const configurationError = error instanceof Error && error.message.includes('Brevo SMTP is not configured');
    const message = configurationError ? error.message : 'Unable to create account. Please try again.';
    return res.status(configurationError ? 503 : 500).json({ success: false, message });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    if (!email || !/^\d{6}$/.test(code)) return res.status(400).json({ success: false, message: 'A valid email and 6-digit code are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired verification code', errorType: 'INVALID_CODE' });
    if (user.emailVerified) return res.json({ success: true, token: createToken(user), user: publicUser(user), nextStep: user.onboardingStatus === 'completed' ? '/project-selection' : '/onboarding' });

    const verification = await EmailVerification.findOne({ userId: user._id, purpose: 'verify_email', consumedAt: { $exists: false } }).sort({ lastSentAt: -1 });
    if (!verification || verification.expiresAt <= new Date()) return res.status(400).json({ success: false, message: 'Verification code has expired', errorType: 'CODE_EXPIRED' });
    if (verification.attempts >= MAX_OTP_ATTEMPTS) return res.status(429).json({ success: false, message: 'Too many verification attempts. Request a new code.', errorType: 'TOO_MANY_ATTEMPTS' });

    const valid = await bcrypt.compare(code, verification.codeHash);
    if (!valid) {
      verification.attempts += 1;
      await verification.save();
      return res.status(400).json({ success: false, message: 'Invalid verification code', errorType: 'INVALID_CODE' });
    }

    const now = new Date();
    verification.consumedAt = now;
    user.emailVerified = true;
    user.emailVerifiedAt = now;
    await Promise.all([verification.save(), user.save()]);
    return res.json({ success: true, token: createToken(user), user: publicUser(user), nextStep: '/onboarding' });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify email' });
  }
};

export const resendVerification = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email });
    if (user && !user.emailVerified) await issueVerification(user, true);
    return res.json({ success: true, message: 'If the account is awaiting verification, a new code has been sent.' });
  } catch (error) {
    const retryAfter = (error as Error & { retryAfter?: number }).retryAfter;
    if (retryAfter) return res.status(429).json({ success: false, message: 'Please wait before requesting another code', retryAfter });
    console.error('Resend verification error:', error);
    return res.status(500).json({ success: false, message: 'Unable to resend verification code' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email, emailVerified: true });
    if (user) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(token, 10);
      await EmailVerification.deleteMany({ userId: user._id, purpose: 'reset_password' });
      await EmailVerification.create({ userId: user._id, email, codeHash: tokenHash, attempts: 0, expiresAt: new Date(Date.now() + 30 * 60 * 1000), lastSentAt: new Date(), purpose: 'reset_password' });
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      await sendPasswordResetEmail(email, user.firstName, `${frontendUrl}/reset-password?email=${encodeURIComponent(email)}&token=${token}`);
    }
    return res.json({ success: true, message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (error) {
    console.error('Password reset request error:', error);
    return res.status(500).json({ success: false, message: 'Unable to request a password reset' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { token, password } = req.body;
    if (!email || typeof token !== 'string' || typeof password !== 'string' || password.length < 8) return res.status(400).json({ success: false, message: 'A valid reset link and an 8-character password are required' });
    const user = await User.findOne({ email });
    const record = user ? await EmailVerification.findOne({ userId: user._id, purpose: 'reset_password', consumedAt: { $exists: false } }).sort({ lastSentAt: -1 }) : null;
    if (!user || !record || record.expiresAt <= new Date() || !(await bcrypt.compare(token, record.codeHash))) return res.status(400).json({ success: false, message: 'This password reset link is invalid or expired' });
    record.consumedAt = new Date();
    user.password = await bcrypt.hash(password, 12);
    await Promise.all([record.save(), user.save()]);
    notifyPasswordChange(user._id).catch(() => {});
    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to reset password' });
  }
};

export const signIn = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body.email || req.body.username);
    const password = req.body.password;
    if (!email || typeof password !== 'string') return res.status(400).json({ success: false, message: 'Email and password are required' });
    const user = await User.findOne({ email });
    if (!user?.password || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.emailVerified) return res.status(403).json({ success: false, message: 'Please verify your email before signing in', errorType: 'EMAIL_NOT_VERIFIED', email });

    const nextStep = user.role === 'admin' || user.role === 'superadmin'
      ? '/super-admin' : user.onboardingStatus === 'completed' ? '/project-selection' : '/onboarding';
    return res.json({ success: true, token: createToken(user), user: publicUser(user), admin: user.role !== 'user' ? { adminType: user.role } : undefined, nextStep });
  } catch (error) {
    console.error('Sign-in error:', error);
    return res.status(500).json({ success: false, message: 'Server error during sign in' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const allowed = ['firstName', 'lastName', 'profilePicture', 'phoneNumber', 'bio', 'username'] as const;
    const update: Record<string, unknown> = {};
    for (const field of allowed) if (req.body[field] !== undefined) update[field] = req.body[field];
    const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).user?._id);
    const { currentPassword, newPassword } = req.body;
    if (!user?.password || typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).json({ success: false, message: 'Valid current and new passwords are required' });
    if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(400).json({ success: false, message: 'Incorrect current password' });
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    notifyPasswordChange(user._id).catch(() => {});
    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating password' });
  }
};
