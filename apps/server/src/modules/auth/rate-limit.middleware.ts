import { NextFunction, Request, Response } from 'express';

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(name: string, limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const identity = `${name}:${req.ip}:${String(req.body?.email || req.body?.username || '').trim().toLowerCase()}`;
    const now = Date.now();
    const bucket = buckets.get(identity);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(identity, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.', retryAfter });
    }
    return next();
  };
}
