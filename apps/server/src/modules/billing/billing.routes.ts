import { Router } from "express";
import { GIFT_DURATIONS, OVERAGE_PRICE_PER_HOUR_USD, giftPriceUsd } from "@qworship/shared";
import { protect } from "../auth/auth.middleware.js";
import { canWrite, resolveActiveOrganization } from "../organization/organization.service.js";
import { ensureAccountFor } from "../organization/account.service.js";
import { capabilitiesForAccount } from "./capability.service.js";
import { settleToFree } from "./trial.service.js";
import { billingOverview, listInvoices, topUpPriceUsd, usageTrend } from "./billing.service.js";
import { isTestMode, stripeConfigured } from "./stripe.client.js";
import {
  billingPortalUrl, cancelSubscription, changeSubscriptionSlots,
  startSubscriptionCheckout, startTopUpCheckout,
} from "./stripe.service.js";
import { usagePeriod } from "../usage/usage.model.js";
import { usageSeries, resolveRange, type Granularity, type RangePreset } from "../usage/usage.series.js";
import { streamHealth, streamHealthByOrganization } from "../usage/usage.health.js";
import { Organization } from "../organization/organization.model.js";
import {
  listSponsoredGifts, previewGift, redeemGift, startGiftCheckout,
} from "./gift.service.js";

export const billingRouter = Router();

/**
 * Billing reads, plus the one write head office makes.
 *
 * Thin by design: every route resolves the caller's account, calls one service
 * function and returns it. Anything that looks like a calculation belongs in
 * billing.service.ts, so the numbers on screen cannot diverge from the numbers
 * in a report.
 */

/** Resolves the caller's account, or sends the right error. */
async function requireAccount(req: any, res: any, needsWrite = false) {
  const resolved = await resolveActiveOrganization(req);
  if (!resolved) {
    res.status(400).json({ success: false, message: "No church resolved for this request" });
    return null;
  }
  if (needsWrite && !canWrite(resolved.role)) {
    res.status(403).json({ success: false, message: "Only an owner or admin can do that" });
    return null;
  }
  const account = await ensureAccountFor(
    resolved.organization._id as any,
    resolved.organization.ownerId,
  );
  return { ...resolved, account };
}

billingRouter.get("/billing/overview", protect, async (req: any, res: any) => {
  try {
    const ctx = await requireAccount(req, res);
    if (!ctx) return;
    res.json({ success: true, overview: await billingOverview(ctx.account), role: ctx.role });
  } catch (error) {
    console.error("Error building billing overview:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * What this church's plan lets it do, for greying out controls.
 *
 * Readable by any member, not just an owner — every person using the Live
 * Console needs to know which buttons to lock, and a volunteer who cannot
 * read this would be shown a full product that then refuses them.
 *
 * It goes through `requireAccount`, which creates the account if there is
 * none yet, so a brand-new church's trial starts on whichever screen it
 * first opens rather than waiting for somebody to visit billing.
 */
billingRouter.get("/billing/capabilities", protect, async (req: any, res: any) => {
  try {
    const ctx = await requireAccount(req, res);
    if (!ctx) return;
    res.json({ success: true, capabilities: capabilitiesForAccount(ctx.account) });
  } catch (error) {
    console.error("Error reading capabilities:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * "Continue with the free plan" — the choice offered when a trial ends.
 *
 * Settles the account onto free immediately rather than waiting for the
 * hourly sweep to notice, so the screen that says the free plan is in place
 * is telling the truth by the time it renders.
 *
 * Idempotent, and needs to be: this is a button somebody may press twice.
 * It also grants nothing — it only ever moves an account DOWN to free, so it
 * is safe for any member to call even though choosing a paid plan is not.
 */
billingRouter.post("/billing/continue-free", protect, async (req: any, res: any) => {
  try {
    const ctx = await requireAccount(req, res);
    if (!ctx) return;
    await settleToFree(ctx.account);
    res.json({ success: true, capabilities: capabilitiesForAccount(ctx.account) });
  } catch (error) {
    console.error("Error settling account onto free:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const RANGE_PRESETS: RangePreset[] = ["7d", "30d", "90d", "weekly", "monthly", "custom"];
const GRANULARITIES: Granularity[] = ["day", "week", "sunday", "month"];

billingRouter.get("/billing/usage", protect, async (req: any, res: any) => {
  try {
    const ctx = await requireAccount(req, res);
    if (!ctx) return;
    // Bounded: an unbounded week count is an unbounded scan of sessions.
    const weeks = Math.min(26, Math.max(1, Number(req.query.weeks) || 4));
    const overview = await billingOverview(ctx.account);

    // Only values this server recognises reach the series builder; anything
    // else falls back to the default rather than being trusted into a query.
    const preset = RANGE_PRESETS.includes(req.query.range) ? req.query.range : undefined;
    const granularity = GRANULARITIES.includes(req.query.granularity)
      ? req.query.granularity
      : undefined;

    const churches = await Organization.find({ accountId: ctx.account._id })
      .select("_id name")
      .lean();

    // A church filter must name a church ON THIS ACCOUNT. Taking the id on
    // trust would let anyone read another network's usage.
    const requested = req.query.organizationId ? String(req.query.organizationId) : null;
    const scoped = requested
      ? churches.filter((c) => String(c._id) === requested)
      : churches;
    if (requested && scoped.length === 0) {
      return res.status(404).json({ success: false, message: "No such church on this account" });
    }

    const rangeRequest = {
      preset,
      granularity,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
    };
    // Health is measured over the SAME window as the chart, so the peak on the
    // tile and the bars underneath it always describe one range.
    const { from, to } = resolveRange(rangeRequest);
    const scopedIds = scoped.map((c) => c._id);

    const [series, health, healthByChurch] = await Promise.all([
      usageSeries(scopedIds, rangeRequest),
      streamHealth(scopedIds, from, to),
      streamHealthByOrganization(churches.map((c) => c._id), from, to),
    ]);

    res.json({
      success: true,
      weeks: await usageTrend(ctx.account, weeks),
      series,
      health,
      churches: churches.map((c) => ({ id: String(c._id), name: c.name })),
      branches: overview.branches.map((b: any) => ({
        ...b,
        health: healthByChurch.get(String(b.organizationId)) ?? null,
      })),
      period: overview.period,
    });
  } catch (error) {
    console.error("Error building usage report:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

billingRouter.get("/billing/invoices", protect, async (req: any, res: any) => {
  try {
    const ctx = await requireAccount(req, res);
    if (!ctx) return;
    res.json({
      success: true,
      invoices: await listInvoices(ctx.account),
      subscriptionInvoicesAvailable: stripeConfigured(),
      testMode: isTestMode(),
    });
  } catch (error) {
    console.error("Error listing invoices:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/** What top-up hours cost, so the client never multiplies a price itself. */
billingRouter.get("/billing/topup/quote", protect, async (req: any, res: any) => {
  const hours = Math.min(100, Math.max(1, Number(req.query.hours) || 5));
  res.json({
    success: true,
    hours,
    amountUsd: topUpPriceUsd(hours),
    pricePerHourUsd: OVERAGE_PRICE_PER_HOUR_USD,
  });
});

/**
 * Head office buys hours for one of its churches.
 *
 * Returns a Checkout URL rather than charging here. The hours are not granted
 * by this call and are not granted when the browser comes back — only the
 * signed webhook moves them, so a closed tab or a replayed redirect cannot
 * conjure transcription time.
 */
billingRouter.post("/billing/topup", protect, async (req: any, res: any) => {
  try {
    const ctx = await requireAccount(req, res, true);
    if (!ctx) return;
    if (!stripeConfigured()) {
      return res.status(503).json({ success: false, message: "Card payments are not configured yet" });
    }

    const { organizationId, hours } = req.body as { organizationId?: string; hours?: number };
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Choose a church to buy hours for" });
    }
    const requested = Math.round(Number(hours));
    if (!Number.isFinite(requested) || requested < 1 || requested > 100) {
      return res.status(400).json({ success: false, message: "Buy between 1 and 100 hours" });
    }

    const result = await startTopUpCheckout({
      account: ctx.account,
      owner: req.user,
      purchasedBy: req.user._id,
      organizationId,
      hours: requested,
      period: usagePeriod(),
      // Priced server-side from the catalog; the request never names an amount.
      amountUsd: topUpPriceUsd(requested),
    });
    if (!result.ok) return res.status(400).json({ success: false, message: result.reason });

    res.json({ success: true, checkoutUrl: result.result.url });
  } catch (error) {
    console.error("Error starting top-up checkout:", error);
    res.status(500).json({ success: false, message: "Could not start checkout" });
  }
});

/**
 * Subscribe, or change how many churches the plan covers.
 *
 * A first subscription needs a card, so it goes through Checkout. Changing the
 * count on a live subscription does not — it is billed as a proration against
 * the card already on file, which is why this can answer two different shapes.
 */
billingRouter.post("/billing/subscription", protect, async (req: any, res: any) => {
  try {
    const ctx = await requireAccount(req, res, true);
    if (!ctx) return;
    if (!stripeConfigured()) {
      return res.status(503).json({ success: false, message: "Card payments are not configured yet" });
    }

    const slots = Math.round(Number((req.body as any)?.slots));
    if (!Number.isFinite(slots) || slots < 1 || slots > 500) {
      return res.status(400).json({ success: false, message: "Choose between 1 and 500 churches" });
    }
    const interval = (req.body as any)?.interval === "year" ? "year" : "month";

    if (ctx.account.stripeSubscriptionId) {
      const changed = await changeSubscriptionSlots(ctx.account, slots);
      if (!changed.ok) return res.status(409).json({ success: false, message: changed.reason });
      // The webhook writes the new entitlements; the client refetches.
      return res.json({ success: true, updated: true });
    }

    const checkout = await startSubscriptionCheckout({ account: ctx.account, owner: req.user, slots, interval });
    res.json({ success: true, checkoutUrl: checkout.url });
  } catch (error) {
    console.error("Error starting subscription checkout:", error);
    res.status(500).json({ success: false, message: "Could not start checkout" });
  }
});

/** Ends the plan at the period end. Paid-for time is not taken back. */
billingRouter.post("/billing/subscription/cancel", protect, async (req: any, res: any) => {
  try {
    const ctx = await requireAccount(req, res, true);
    if (!ctx) return;
    await cancelSubscription(ctx.account);
    res.json({ success: true });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ success: false, message: "Could not cancel" });
  }
});

/** A link into Stripe's portal for cards, cancellation and past invoices. */
billingRouter.post("/billing/portal", protect, async (req: any, res: any) => {
  try {
    const ctx = await requireAccount(req, res, true);
    if (!ctx) return;
    const url = await billingPortalUrl(ctx.account);
    if (!url) return res.status(400).json({ success: false, message: "No billing account yet" });
    res.json({ success: true, portalUrl: url });
  } catch (error) {
    console.error("Error opening billing portal:", error);
    res.status(500).json({ success: false, message: "Could not open the billing portal" });
  }
});

/**
 * Gifting: sponsoring Standard for another church.
 *
 * A gift is paid for once and up front and produces a code, so the sponsor
 * does not need to know which account the recipient will use — often they have
 * not signed up yet.
 */

/** What the durations cost, so the client never multiplies a price itself. */
billingRouter.get("/billing/gift/options", protect, (_req: any, res: any) => {
  res.json({
    success: true,
    options: GIFT_DURATIONS.map((months) => ({
      months,
      amountUsd: giftPriceUsd(months, 1),
    })),
  });
});

billingRouter.get("/billing/gifts", protect, async (req: any, res: any) => {
  try {
    const ctx = await requireAccount(req, res);
    if (!ctx) return;
    res.json({ success: true, gifts: await listSponsoredGifts(ctx.account) });
  } catch (error) {
    console.error("Error listing gifts:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

billingRouter.post("/billing/gift", protect, async (req: any, res: any) => {
  try {
    const ctx = await requireAccount(req, res, true);
    if (!ctx) return;
    if (!stripeConfigured()) {
      return res.status(503).json({ success: false, message: "Card payments are not configured yet" });
    }

    const body = req.body as {
      months?: number; slots?: number;
      recipientName?: string; recipientEmail?: string; message?: string;
    };
    const months = Math.round(Number(body.months));
    if (!GIFT_DURATIONS.includes(months as any)) {
      return res.status(400).json({
        success: false,
        message: `Choose ${GIFT_DURATIONS.join(", ")} months`,
      });
    }
    const slots = Math.min(50, Math.max(1, Math.round(Number(body.slots) || 1)));

    // An address is optional — a sponsor may be handing the code over in
    // person — but a malformed one would silently never deliver.
    const email = body.recipientEmail?.trim();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "That email address does not look right" });
    }

    const result = await startGiftCheckout({
      account: ctx.account,
      sponsor: req.user,
      months,
      slots,
      recipientName: body.recipientName?.trim()?.slice(0, 120),
      recipientEmail: email?.toLowerCase(),
      message: body.message?.trim()?.slice(0, 500),
    });

    res.json({ success: true, checkoutUrl: result.url });
  } catch (error) {
    console.error("Error starting gift checkout:", error);
    res.status(500).json({ success: false, message: "Could not start checkout" });
  }
});

/** Looks a code up without claiming it, so the screen can describe the gift. */
billingRouter.get("/billing/gift/:code", protect, async (req: any, res: any) => {
  try {
    const preview = await previewGift(String(req.params.code));
    if (!preview.ok) return res.status(404).json({ success: false, message: preview.reason });
    res.json({ success: true, gift: preview.gift });
  } catch (error) {
    console.error("Error previewing gift:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

billingRouter.post("/billing/gift/redeem", protect, async (req: any, res: any) => {
  try {
    const ctx = await requireAccount(req, res, true);
    if (!ctx) return;
    const code = String((req.body as any)?.code ?? "");
    if (!code.trim()) return res.status(400).json({ success: false, message: "Enter your gift code" });

    const result = await redeemGift(code, ctx.account);
    if (!result.ok) return res.status(400).json({ success: false, message: result.reason });

    res.json({
      success: true,
      months: result.months,
      expiresAt: result.expiresAt.toISOString(),
      message: `Standard is active for ${result.months} ${result.months === 1 ? "month" : "months"}. Nothing to pay.`,
    });
  } catch (error) {
    console.error("Error redeeming gift:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
