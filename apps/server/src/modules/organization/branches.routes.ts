import { Router } from 'express';
import mongoose from 'mongoose';
import { PLAN_LIST, entitlementsFor, PlanId } from '@qworship/shared';
import { protect, authorizeAdmin } from '../auth/auth.middleware.js';
import { Organization } from './organization.model.js';
import { Account } from './account.model.js';
import { BranchInvite, INVITE_TTL_DAYS, generateInviteCode } from './branch-invite.model.js';
import { Membership } from './membership.model.js';
import { canWrite, resolveActiveOrganization, grantMembership } from './organization.service.js';
import { ensureAccountFor, slotUsage, hourUsage, setPlan } from './account.service.js';
import { UsageCounter, usagePeriod } from '../usage/usage.model.js';

export const branchesRouter = Router();

/** Resolves the caller's church and its account, or sends the right error. */
async function requireChurch(req: any, res: any, needsWrite = false) {
  const resolved = await resolveActiveOrganization(req);
  if (!resolved) {
    res.status(400).json({ success: false, message: 'No church resolved for this request' });
    return null;
  }
  if (needsWrite && !canWrite(resolved.role)) {
    res.status(403).json({ success: false, message: 'Only an owner or admin can do that' });
    return null;
  }
  const account = await ensureAccountFor(resolved.organization._id as any, resolved.organization.ownerId);
  return { ...resolved, account };
}

/** The plan catalog. Public so the marketing pricing page can read it too. */
branchesRouter.get('/plans', (_req, res) => {
  res.json({ success: true, plans: PLAN_LIST });
});

/** The caller's subscription: plan, slot usage, pooled hours. */
branchesRouter.get('/subscription', protect, async (req: any, res: any) => {
  try {
    const ctx = await requireChurch(req, res);
    if (!ctx) return;
    const [slots, hours] = await Promise.all([slotUsage(ctx.account), hourUsage(ctx.account)]);
    res.json({
      success: true,
      subscription: {
        planId: ctx.account.planId,
        packs: ctx.account.packs,
        monthlyPrice: ctx.account.monthlyPrice,
        status: ctx.account.status,
        slots,
        hours,
        role: ctx.role,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/** Change plan or pack count. Refuses a downgrade that would strand churches. */
branchesRouter.post('/subscription/plan', protect, async (req: any, res: any) => {
  try {
    const ctx = await requireChurch(req, res, true);
    if (!ctx) return;
    const { planId, packs } = req.body as { planId: PlanId; packs?: number };
    if (!planId || !['free', 'standard'].includes(planId)) {
      return res.status(400).json({ success: false, message: 'A valid planId is required' });
    }
    const result = await setPlan(ctx.account, planId, Number(packs) || 1);
    if (!result.ok) {
      return res.status(409).json({ success: false, message: result.reason, slots: result.usage });
    }
    const [slots, hours] = await Promise.all([slotUsage(result.account), hourUsage(result.account)]);
    res.json({
      success: true,
      subscription: {
        planId: result.account.planId,
        packs: result.account.packs,
        monthlyPrice: result.account.monthlyPrice,
        status: result.account.status,
        slots,
        hours,
      },
    });
  } catch (error) {
    console.error('Error changing plan:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/** The network: this church, its branches, and any open invitations. */
branchesRouter.get('/branches', protect, async (req: any, res: any) => {
  try {
    const ctx = await requireChurch(req, res);
    if (!ctx) return;
    const churches = await Organization.find({ accountId: ctx.account._id }).lean();
    const invites = await BranchInvite.find({ accountId: ctx.account._id, state: 'pending' }).lean();
    const period = usagePeriod();
    const counters = await UsageCounter.find({
      organizationId: { $in: churches.map((c) => c._id) },
      period,
    }).lean();
    const hoursById = new Map(counters.map((c) => [String(c.organizationId), (c.billableSeconds || 0) / 3600]));

    res.json({
      success: true,
      parentId: ctx.organization._id,
      branches: churches.map((c) => ({
        id: c._id,
        name: c.name,
        city: c.city,
        country: c.country,
        isParent: !c.parentOrganizationId,
        createdAt: c.createdAt,
        hoursThisMonth: Number((hoursById.get(String(c._id)) ?? 0).toFixed(2)),
      })),
      pendingInvites: invites.map((i) => ({
        id: i._id,
        method: i.method,
        code: i.code,
        email: i.email,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
      slots: await slotUsage(ctx.account),
    });
  } catch (error) {
    console.error('Error listing branches:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/** Invite a church to join, by shareable code or by email. */
branchesRouter.post('/branches/invite', protect, async (req: any, res: any) => {
  try {
    const ctx = await requireChurch(req, res, true);
    if (!ctx) return;
    const method = req.body?.method === 'email' ? 'email' : 'code';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (method === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required' });
    }

    // A pending invite holds a slot, so this check counts them too.
    const slots = await slotUsage(ctx.account);
    if (slots.available < 1) {
      return res.status(409).json({
        success: false,
        message: `All ${slots.total} slots are in use. Add a pack or release a branch first.`,
        slots,
      });
    }

    const invite = await BranchInvite.create({
      accountId: ctx.account._id,
      parentOrganizationId: ctx.organization._id,
      method,
      code: method === 'code' ? generateInviteCode() : undefined,
      email: method === 'email' ? email : undefined,
      invitedBy: req.user._id,
      state: 'pending',
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    });

    res.status(201).json({
      success: true,
      invite: {
        id: invite._id, method: invite.method, code: invite.code,
        email: invite.email, expiresAt: invite.expiresAt,
      },
      slots: await slotUsage(ctx.account),
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/** Withdraw an open invitation, releasing the slot it held. */
branchesRouter.post('/branches/invite/:id/revoke', protect, async (req: any, res: any) => {
  try {
    const ctx = await requireChurch(req, res, true);
    if (!ctx) return;
    const invite = await BranchInvite.findOne({
      _id: req.params.id, accountId: ctx.account._id, state: 'pending',
    });
    if (!invite) return res.status(404).json({ success: false, message: 'Invitation not found' });
    invite.state = 'revoked';
    await invite.save();
    res.json({ success: true, slots: await slotUsage(ctx.account) });
  } catch (error) {
    console.error('Error revoking invite:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Accept an invitation, joining the caller's church to the network.
 * Consent is the point: the caller's own church moves under another account's
 * administration, so only they can do this, never the inviter.
 */
branchesRouter.post('/branches/accept', protect, async (req: any, res: any) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    if (!code) return res.status(400).json({ success: false, message: 'An invitation code is required' });

    const invite = await BranchInvite.findOne({ code, state: 'pending' });
    if (!invite) return res.status(404).json({ success: false, message: 'That invitation is not valid' });
    if (invite.expiresAt < new Date()) {
      invite.state = 'expired';
      await invite.save();
      return res.status(410).json({ success: false, message: 'That invitation has expired' });
    }

    const ctx = await requireChurch(req, res, true);
    if (!ctx) return;
    if (String(ctx.organization._id) === String(invite.parentOrganizationId)) {
      return res.status(400).json({ success: false, message: 'A church cannot be a branch of itself' });
    }
    if (String(ctx.organization.accountId) === String(invite.accountId)) {
      return res.status(409).json({ success: false, message: 'This church is already on that account' });
    }

    const account = await Account.findById(invite.accountId);
    if (!account) return res.status(404).json({ success: false, message: 'That account no longer exists' });

    // The accepting church is about to occupy the slot its own invite reserved,
    // so compare against the slots held by everything other than this invite.
    const slots = await slotUsage(account);
    if (slots.churches >= slots.total) {
      return res.status(409).json({ success: false, message: 'That network has no slots left' });
    }

    ctx.organization.accountId = account._id as any;
    ctx.organization.parentOrganizationId = invite.parentOrganizationId;
    await ctx.organization.save();

    invite.state = 'accepted';
    invite.acceptedOrganizationId = ctx.organization._id as any;
    invite.acceptedAt = new Date();
    await invite.save();

    res.json({ success: true, joined: { id: ctx.organization._id, name: ctx.organization.name } });
  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Remove a branch from the network. It reverts to its own free account and
 * keeps its own content, which is already scoped to it by organizationId.
 */
branchesRouter.delete('/branches/:id', protect, async (req: any, res: any) => {
  try {
    const ctx = await requireChurch(req, res, true);
    if (!ctx) return;
    if (String(req.params.id) === String(ctx.organization._id)) {
      return res.status(400).json({ success: false, message: 'A church cannot remove itself from its own account' });
    }
    const branch = await Organization.findOne({ _id: req.params.id, accountId: ctx.account._id });
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });

    const free = entitlementsFor('free');
    const ownAccount = await Account.create({
      ownerId: branch.ownerId, planId: 'free', packs: 0,
      slots: free.slots, monthlyHours: free.hours, monthlyPrice: 0, status: 'active',
    });
    branch.accountId = ownAccount._id as any;
    branch.parentOrganizationId = null;
    await branch.save();

    res.json({ success: true, slots: await slotUsage(ctx.account) });
  } catch (error) {
    console.error('Error removing branch:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/** Every account, for the admin dashboard: plan, slot use and hours consumed. */
branchesRouter.get('/admin/accounts', protect, authorizeAdmin, async (_req: any, res: any) => {
  try {
    const accounts = await Account.find().sort({ createdAt: -1 }).limit(200).lean();
    const period = usagePeriod();
    const rows = await Promise.all(
      accounts.map(async (a) => {
        const churches = await Organization.find({ accountId: a._id }).select('name parentOrganizationId').lean();
        const counters = await UsageCounter.find({
          organizationId: { $in: churches.map((c) => c._id) }, period,
        }).lean();
        const usedHours = counters.reduce((s, c) => s + (c.billableSeconds || 0), 0) / 3600;
        const pending = await BranchInvite.countDocuments({ accountId: a._id, state: 'pending' });
        const allowance = (a.monthlyHours || 0) + (a.bonusHours || 0);
        return {
          id: a._id,
          planId: a.planId,
          packs: a.packs,
          monthlyPrice: a.monthlyPrice,
          status: a.status,
          slotsTotal: (a.slots || 0) + (a.bonusSlots || 0),
          slotsUsed: churches.length + pending,
          churches: churches.length,
          pendingInvites: pending,
          parentName: churches.find((c) => !c.parentOrganizationId)?.name ?? churches[0]?.name ?? 'Unnamed',
          hoursUsed: Number(usedHours.toFixed(2)),
          hoursAllowance: allowance,
          overAllowance: usedHours > allowance,
        };
      }),
    );
    res.json({ success: true, period, accounts: rows });
  } catch (error) {
    console.error('Error listing accounts:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
