import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from './auth.model.js';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error('JWT_SECRET or SESSION_SECRET is required');
  return secret;
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, getJwtSecret()) as any;
      
      const user = await User.findById(decoded.id).select('-password').populate('roleId');
      if (!user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }
      if (!user.isActive || !user.emailVerified) {
        return res.status(403).json({ success: false, message: 'Account is inactive or email is not verified' });
      }

      (req as any).user = user;
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

/**
 * Whether this person may use the paid product at all.
 *
 * TWO SYSTEMS, ONE ANSWER. Entitlements used to live only on the User as
 * `subscriptionStatus` and `trialStatus`. Billing now lives on the Account —
 * plan, slots, hours, Stripe — and the two were never connected: an account
 * could pay for Standard and still be refused here because the person's old
 * trial flag had lapsed. A paying customer locked out of the product.
 *
 * So the ACCOUNT is asked first and the legacy user flags are kept as a
 * fallback. The order matters: this must only ever widen access during the
 * transition, never narrow it, or a release turns into an outage for everyone
 * whose account row has not caught up.
 */
export const requireProductAccess = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ success: false, message: 'Not authorized' });

  // Staff always pass.
  if (user.role === 'admin' || user.role === 'superadmin') return next();

  // The account is the source of truth for anything paid for.
  if (await accountGrantsAccess(req)) return next();

  // Legacy flags, for accounts that predate billing or could not be resolved.
  if (user.subscriptionStatus === 'active' || user.trialStatus === 'converted') return next();
  if (user.trialStatus === 'active' && user.trialEndDate && user.trialEndDate > new Date()) return next();
  if (user.trialStatus === 'active') {
    user.trialStatus = 'expired';
    user.subscriptionStatus = 'inactive';
    await user.save();
  }
  return res.status(402).json({ success: false, message: 'Your free trial has expired', errorType: 'TRIAL_EXPIRED' });
};

/**
 * Does the caller's church sit on an account that is paid for?
 *
 * Imported lazily so this middleware — which every protected route loads —
 * does not drag the whole organization and billing graph into its import
 * chain. Any failure resolving the account returns false rather than throwing,
 * because the legacy check below it is a safe place to land.
 *
 * `past_due` counts as access on purpose. A card that failed on a Saturday
 * must not take a church off the air on Sunday; Stripe retries, and only a
 * cancelled subscription actually revokes.
 *
 * FREE COUNTS AS ACCESS TOO, and that is a change. This used to return true
 * only for `standard`, which made the free plan a synonym for locked out —
 * a free account fell through to the legacy trial flags and ended on
 * `402 TRIAL_EXPIRED`, so "continue with the free plan" led to a wall rather
 * than to a working app. Free is now a real plan that people stay on, and
 * what it withholds is decided per feature in capability.service.ts, not by
 * refusing the product wholesale here.
 *
 * Note what this means: an account that EXISTS grants access, full stop.
 * Not even `cancelled` refuses, and that resolves a contradiction rather
 * than inventing a policy — `onSubscriptionEnded` already drops a cancelled
 * subscription to `planId: "free"` and says in as many words that the free
 * allowance applies immediately. Reading its `status: "cancelled"` as a
 * lock-out would have made that comment a lie and left a church that simply
 * stopped paying with less than a church that never started.
 *
 * `status` describes the SUBSCRIPTION, not the person's right to open the
 * app. What a cancelled account loses is its premium capabilities, which
 * capability.service.ts withholds by reading exactly this status.
 *
 * Genuine suspension is a different thing entirely and is handled upstream
 * in `protect`, which refuses an inactive or unverified user outright.
 */
async function accountGrantsAccess(req: Request): Promise<boolean> {
  try {
    const { resolveActiveOrganization } = await import('../organization/organization.service.js');
    const { Account } = await import('../organization/account.model.js');

    const resolved = await resolveActiveOrganization(req as any);
    const accountId = (resolved?.organization as any)?.accountId;
    if (!accountId) return false;

    const account = await Account.findById(accountId).select('planId status').lean();
    return Boolean(account);
  } catch {
    return false;
  }
}

export const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  // Standard JWT Bearer token check
  if (user && (user.role === 'admin' || user.role === 'superadmin')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as an admin' });
  }
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (user && user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'This action requires superadmin privileges' });
  }
};

// Not yet wired onto any existing per-section admin routes (bible management, media
// assets, etc.) - those remain gated by the binary authorizeAdmin above. This only
// enforces section-level visibility for routes that opt into it going forward.
export const requirePermission = (sectionId: string) => (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ success: false, message: 'Not authorized' });
  if (user.role === 'superadmin') return next();
  if (user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized as an admin' });
  const permissions: string[] = (user.roleId && (user.roleId as any).permissions) || [];
  if (permissions.includes(sectionId)) return next();
  return res.status(403).json({ success: false, message: 'You do not have permission to access this section', errorType: 'PERMISSION_DENIED' });
};
