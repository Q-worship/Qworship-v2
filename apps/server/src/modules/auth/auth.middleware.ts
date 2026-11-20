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
 *
 * WHICH IS WHY THIS NO LONGER REFUSES ANYBODY, and that needs saying plainly
 * rather than being inferred from the absence of a 402.
 *
 * The fallback was still narrowing access in one case, and it was the worst
 * one. A church whose `accountId` was never set cannot be placed, so
 * `accountAccess` could not grant — and the legacy flags then refused it with
 * `402 TRIAL_EXPIRED` on all 33 of these routes. Five owners were in exactly
 * that state in production. Once the client route guard stopped reading the
 * legacy flag they could open the app and every gated call failed underneath
 * them, which is worse than an honest wall.
 *
 * It also contradicted the other half of the same system: capability.service
 * answers UNRESOLVED for a church it cannot place and documents, in as many
 * words, that a gate may not refuse on that basis — the same trade hours and
 * storage already make, where an attribution gap is a reporting problem and
 * not a reason to refuse somebody mid-service. Two entitlement paths giving
 * opposite answers to the same input is the bug this file's own comment says
 * it exists to fix.
 *
 * So what remains here is PASSES only. An account that exists grants access;
 * the legacy flags can still grant it; and a caller nobody can place is let
 * through rather than refused. Nothing is given away by that: being "in" has
 * meant very little since free became a real plan, and what a plan actually
 * withholds is decided per feature in capability.service.ts, which refuses
 * only on a verdict it is confident about. Genuine suspension is upstream in
 * `protect`, which turns away an inactive or unverified user outright.
 */
export const requireProductAccess = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ success: false, message: 'Not authorized' });

  // Nobody is refused here any more, so nothing below needs looking up.
  //
  // What used to run was three database round-trips — membership, church,
  // account — and then a ladder of legacy flags, on every request to all 33
  // of these routes, with every branch arriving at the same answer. Paying
  // for a verdict that cannot change the outcome is worse than not asking.
  //
  // The middleware stays on the routes rather than being stripped from 33
  // route tables in the same change that made it a pass: it is the seam the
  // legacy mirror is deleted along with, and that deletion wants its own
  // review. When it goes, these calls go with it.
  return next();
};

/*
 * `accountGrantsAccess` lived here and is gone with the refusal it fed.
 *
 * Worth keeping the finding it was built on, because it is the rule the rest
 * of billing follows: an account that EXISTS granted access, full stop — not
 * even `cancelled` refused. `onSubscriptionEnded` already drops a cancelled
 * subscription to `planId: "free"` and says the free allowance applies
 * immediately, so reading its status as a lock-out would have left a church
 * that stopped paying with less than one that never started. `status`
 * describes the SUBSCRIPTION, not somebody's right to open the app, and what
 * a cancelled account loses is its premium capabilities — which
 * capability.service.ts withholds by reading exactly that status.
 */

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
