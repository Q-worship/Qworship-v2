import mongoose from "mongoose";
import { entitlementsFor, giftPriceUsd } from "@qworship/shared";
import { Account, IAccount } from "../organization/account.model.js";
import { slotUsage } from "../organization/account.service.js";
import { Gift, generateGiftCode } from "./gift.model.js";
import { giftLineItem, stripe } from "./stripe.client.js";
import { ensureCustomer } from "./stripe.service.js";

/**
 * Buying a subscription for someone else, and claiming one.
 *
 * The sponsor pays once, up front, and gets a code. The recipient redeems the
 * code against their own account and is moved onto Standard for the months
 * bought, with no card of theirs involved at any point.
 *
 * A gift grants entitlements but creates no Stripe subscription, so there is
 * nothing to renew and nothing to cancel. When the months run out the account
 * drops back to Free — which is why `expiresAt` is stamped at redemption
 * rather than at purchase: a code sitting in an inbox should not burn down.
 */

function appUrl(): string {
  return (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Codes are stored and compared uppercase, with spacing ignored. */
export function normaliseCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export interface GiftCheckoutInput {
  account: IAccount;
  sponsor: { _id: any; email?: string; firstName?: string; lastName?: string };
  months: number;
  slots: number;
  recipientName?: string;
  recipientEmail?: string;
  message?: string;
}

/**
 * Opens Checkout for a gift.
 *
 * The row is written first as `pending` with its code already generated, so a
 * webhook arriving before this function returns still finds something to mark
 * paid. The code is not shown to the sponsor until it is.
 */
export async function startGiftCheckout(input: GiftCheckoutInput) {
  const { account, sponsor } = input;

  // Priced from the catalog. The request names months and churches; it never
  // names an amount.
  const amountUsd = giftPriceUsd(input.months, input.slots);
  const customerId = await ensureCustomer(account, sponsor);
  const recipient = input.recipientName || input.recipientEmail || "a church";

  const gift = await Gift.create({
    code: generateGiftCode(),
    sponsorAccountId: account._id,
    sponsorUserId: sponsor._id,
    recipientName: input.recipientName,
    recipientEmail: input.recipientEmail,
    message: input.message,
    months: input.months,
    slots: input.slots,
    amountUsd,
    status: "pending",
  });

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [giftLineItem(input.months, amountUsd, recipient)],
      success_url: `${appUrl()}/dashboard-subscription/gift?gift=success&code=${gift.code}`,
      cancel_url: `${appUrl()}/dashboard-subscription/gift?gift=cancelled`,
      metadata: {
        accountId: String(account._id),
        kind: "gift",
        giftId: String(gift._id),
      },
      payment_intent_data: { metadata: { giftId: String(gift._id) } },
      billing_address_collection: "auto",
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    gift.stripeSessionId = session.id;
    await gift.save();
    return { ok: true as const, url: session.url, code: gift.code, amountUsd };
  } catch (error) {
    // A pending gift nobody can pay for would sit in the sponsor's list
    // forever showing a code that grants nothing.
    await Gift.deleteOne({ _id: gift._id });
    throw error;
  }
}

/** Gifts this account has paid for, newest first. */
export async function listSponsoredGifts(account: IAccount) {
  const rows = await Gift.find({
    sponsorAccountId: account._id,
    status: { $ne: "pending" },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return rows.map((g) => ({
    id: String(g._id),
    // Only an unclaimed code is worth showing: once redeemed it is spent, and
    // printing it again invites somebody to try it a second time.
    code: g.status === "unclaimed" ? g.code : null,
    recipientName: g.recipientName ?? null,
    recipientEmail: g.recipientEmail ?? null,
    months: g.months,
    slots: g.slots,
    amountUsd: g.amountUsd,
    status: g.status,
    createdAt: new Date(g.createdAt).toISOString(),
    redeemedAt: g.redeemedAt ? new Date(g.redeemedAt).toISOString() : null,
    expiresAt: g.expiresAt ? new Date(g.expiresAt).toISOString() : null,
  }));
}

/** What a code is worth, without claiming it. */
export async function previewGift(code: string) {
  const gift = await Gift.findOne({ code: normaliseCode(code) }).lean();
  if (!gift) return { ok: false as const, reason: "That code was not recognised" };
  if (gift.status === "pending") return { ok: false as const, reason: "That gift has not been paid for yet" };
  if (gift.status === "redeemed") return { ok: false as const, reason: "That gift has already been claimed" };
  if (gift.status === "failed" || gift.status === "expired") {
    return { ok: false as const, reason: "That gift is no longer valid" };
  }
  return {
    ok: true as const,
    gift: {
      months: gift.months,
      slots: gift.slots,
      recipientName: gift.recipientName ?? null,
      message: gift.message ?? null,
    },
  };
}

/**
 * Claims a gift against an account.
 *
 * Refuses an account that already has a live Stripe subscription: stacking a
 * gift on top would have the church paying for months somebody else already
 * bought. They are told to cancel first rather than being silently
 * double-charged.
 *
 * The write is conditional on the gift still being `unclaimed`, so two people
 * racing with the same code cannot both redeem it.
 */
export async function redeemGift(
  code: string,
  account: IAccount,
): Promise<{ ok: true; months: number; expiresAt: Date } | { ok: false; reason: string }> {
  if (account.stripeSubscriptionId) {
    return {
      ok: false,
      reason:
        "This account already has a paid subscription. Cancel it first, then claim the gift so you are not paying for months you have been given.",
    };
  }

  const normalised = normaliseCode(code);
  const gift = await Gift.findOne({ code: normalised });
  if (!gift) return { ok: false, reason: "That code was not recognised" };
  if (gift.status !== "unclaimed") {
    return {
      ok: false,
      reason:
        gift.status === "redeemed"
          ? "That gift has already been claimed"
          : "That gift is not available to claim",
    };
  }

  const usage = await slotUsage(account);
  const entitlements = entitlementsFor("standard", gift.slots);
  if (entitlements.slots < usage.used) {
    return {
      ok: false,
      reason: `This gift covers ${entitlements.slots} ${entitlements.slots === 1 ? "church" : "churches"}, but you are using ${usage.used}.`,
    };
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + gift.months);

  // Claim first, and only grant if the claim won the race.
  const claimed = await Gift.findOneAndUpdate(
    { _id: gift._id, status: "unclaimed" },
    {
      $set: {
        status: "redeemed",
        redeemedByAccountId: account._id,
        redeemedAt: new Date(),
        expiresAt,
      },
    },
    { new: true },
  );
  if (!claimed) return { ok: false, reason: "That gift has already been claimed" };

  account.planId = "standard";
  account.purchasedSlots = entitlements.slots;
  account.slots = entitlements.slots;
  account.hoursPerChurch = entitlements.hoursPerChurch;
  // Zero, and deliberately so: the recipient is paying nothing. Recording the
  // list price here would show a charge on a billing screen that nobody made.
  account.monthlyPrice = 0;
  account.status = "active";
  await account.save();

  return { ok: true, months: gift.months, expiresAt };
}

/**
 * Returns accounts whose gifted months have run out to Free.
 *
 * Run from a schedule. Churches are never deleted — only the plan lapses, in
 * exactly the way a cancelled subscription does.
 */
export async function expireFinishedGifts(now = new Date()): Promise<number> {
  const due = await Gift.find({
    status: "redeemed",
    expiresAt: { $ne: null, $lte: now },
  }).select("_id redeemedByAccountId");

  let expired = 0;
  for (const gift of due) {
    if (gift.redeemedByAccountId) {
      const free = entitlementsFor("free");
      await Account.updateOne(
        { _id: gift.redeemedByAccountId, stripeSubscriptionId: { $in: [null, undefined] } },
        {
          $set: {
            planId: "free",
            purchasedSlots: 0,
            hoursPerChurch: free.hoursPerChurch,
            monthlyPrice: 0,
            status: "active",
          },
        },
      );
    }
    await Gift.updateOne({ _id: gift._id }, { $set: { status: "expired" } });
    expired += 1;
  }
  return expired;
}
