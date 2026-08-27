import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from './auth.model.js';

function getJwtSecret() {
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

export const requireProductAccess = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ success: false, message: 'Not authorized' });
  if (user.role === 'admin' || user.role === 'superadmin' || user.subscriptionStatus === 'active' || user.trialStatus === 'converted') return next();
  if (user.trialStatus === 'active' && user.trialEndDate && user.trialEndDate > new Date()) return next();
  if (user.trialStatus === 'active') {
    user.trialStatus = 'expired';
    user.subscriptionStatus = 'inactive';
    await user.save();
  }
  return res.status(402).json({ success: false, message: 'Your free trial has expired', errorType: 'TRIAL_EXPIRED' });
};

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
