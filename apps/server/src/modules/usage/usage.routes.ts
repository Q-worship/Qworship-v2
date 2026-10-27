import { Router } from 'express';
import { protect, authorizeAdmin } from '../auth/auth.middleware.js';
import { TranscriptionSession, UsageCounter, usagePeriod } from './usage.model.js';
import { resolveActiveOrganization } from '../organization/organization.service.js';

export const usageRouter = Router();

/**
 * Shadow metering is only worth running if the numbers can be read back. These
 * two endpoints are what turns the recorded sessions into the figure the
 * subscription allowance has to be set from.
 */

/** This month's transcription usage for the caller's church. */
usageRouter.get('/usage/me', protect, async (req: any, res: any) => {
  try {
    const resolved = await resolveActiveOrganization(req);
    if (!resolved) {
      return res.status(400).json({ success: false, message: 'No church resolved for this request' });
    }
    const period = usagePeriod();
    const counter = await UsageCounter.findOne({
      organizationId: resolved.organization._id,
      period,
    }).lean();
    const seconds = counter?.billableSeconds ?? 0;
    return res.json({
      success: true,
      usage: {
        organizationId: resolved.organization._id,
        organizationName: resolved.organization.name,
        period,
        billableSeconds: Math.round(seconds),
        billableHours: Number((seconds / 3600).toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Platform-wide usage for a month, biggest consumers first. This is the view
 * that answers what a church actually consumes, and therefore what a plan can
 * afford to include.
 */
usageRouter.get('/usage/report', protect, authorizeAdmin, async (req: any, res: any) => {
  try {
    const period = typeof req.query.period === 'string' && /^\d{4}-\d{2}$/.test(req.query.period)
      ? req.query.period
      : usagePeriod();

    const counters = await UsageCounter.find({ period })
      .populate('organizationId', 'name subscriptionType')
      .sort({ billableSeconds: -1 })
      .limit(200)
      .lean();

    const totalSeconds = counters.reduce((sum, c) => sum + (c.billableSeconds || 0), 0);

    // Sessions say how the usage is shaped — a few long services, or many short
    // ones — which a monthly total cannot show.
    const [sessionStats] = await TranscriptionSession.aggregate([
      { $match: { startedAt: { $gte: new Date(`${period}-01T00:00:00Z`) } } },
      {
        $group: {
          _id: null,
          sessions: { $sum: 1 },
          totalSeconds: { $sum: '$billableSeconds' },
          withheldSeconds: { $sum: '$suspendedSeconds' },
          longestSeconds: { $max: '$billableSeconds' },
        },
      },
    ]);

    return res.json({
      success: true,
      period,
      totals: {
        churches: counters.length,
        billableHours: Number((totalSeconds / 3600).toFixed(2)),
        sessions: sessionStats?.sessions ?? 0,
        // What the silence gate kept off the bill.
        withheldHours: Number(((sessionStats?.withheldSeconds ?? 0) / 3600).toFixed(2)),
        longestSessionHours: Number(((sessionStats?.longestSeconds ?? 0) / 3600).toFixed(2)),
      },
      churches: counters.map((c: any) => ({
        organizationId: c.organizationId?._id ?? c.organizationId,
        name: c.organizationId?.name ?? 'Unknown',
        subscriptionType: c.organizationId?.subscriptionType ?? null,
        billableHours: Number((c.billableSeconds / 3600).toFixed(2)),
      })),
    });
  } catch (error) {
    console.error('Error building usage report:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});
