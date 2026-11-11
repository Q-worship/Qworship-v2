import { Router, raw } from "express";
import type Stripe from "stripe";
import { entitlementsFor } from "@qworship/shared";
import { Account } from "../organization/account.model.js";
import { Gift } from "./gift.model.js";
import { syncLegacyEntitlement } from "./entitlement.service.js";
import {
  notifyPaymentFailed,
  notifyPaymentRecovered,
  notifyPlanEnded,
  notifyPaymentDisputed,
  notifyTopUpRefunded,
} from "./billing.notify.js";
import { HourTopUp, topUpExpiryFrom } from "../organization/hour-topup.model.js";
import { Organization } from "../organization/organization.model.js";
import { stripe, stripeConfigured } from "./stripe.client.js";

export const stripeWebhookRouter = Router();

/**
 * The only place entitlements change.
 *
 * Checkout tells the browser a payment succeeded, but a browser can be closed,
 * replayed or lied to. Slots and hours therefore move here and nowhere else,
 * driven by signed events from Stripe.
 *
 * RAW BODY: signature verification hashes the exact bytes Stripe sent, so this
 * route is mounted with express.raw BEFORE the global express.json in
 * index.ts. Parsing and re-serialising the body reorders keys and the
 * signature stops matching — the classic reason a Stripe webhook returns 400
 * in production and nowhere else.
 */

/** Every event this handler acts on. Anything else is acknowledged and dropped. */
const HANDLED = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
  "invoice.paid",
  "charge.refunded",
  "charge.dispute.created",
]);

stripeWebhookRouter.post(
  "/stripe",
  raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
      // 503, not 200: an unconfigured endpoint must not look to Stripe like a
      // delivered event, or it will never be retried once configured.
      return res.status(503).json({ received: false, message: "Stripe webhooks are not configured" });
    }

    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string") {
      return res.status(400).json({ received: false, message: "Missing stripe-signature" });
    }

    let event: Stripe.Event;
    try {
      event = stripe().webhooks.constructEvent(
        req.body as Buffer,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error) {
      // An unverified body is not ours to act on and never will be, so this is
      // a permanent 400 rather than something Stripe should retry.
      console.error("Stripe webhook signature verification failed:", (error as Error).message);
      return res.status(400).json({ received: false, message: "Invalid signature" });
    }

    if (!HANDLED.has(event.type)) return res.json({ received: true, ignored: event.type });

    try {
      await handleEvent(event);
      return res.json({ received: true });
    } catch (error) {
      // 500 asks Stripe to retry. Every handler below is written so a retry is
      // harmless, which is what makes that safe.
      console.error(`Stripe webhook ${event.type} failed:`, error);
      return res.status(500).json({ received: false });
    }
  },
);

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);

    case "checkout.session.async_payment_failed":
      return onCheckoutFailed(event.data.object as Stripe.Checkout.Session);

    case "customer.subscription.updated":
      return onSubscriptionChanged(event.data.object as Stripe.Subscription);

    case "customer.subscription.deleted":
      return onSubscriptionEnded(event.data.object as Stripe.Subscription);

    case "invoice.payment_failed":
      return onInvoiceFailed(event.data.object as Stripe.Invoice);

    case "invoice.paid":
      return onInvoicePaid(event.data.object as Stripe.Invoice);

    case "charge.refunded":
      return onChargeRefunded(event.data.object as Stripe.Charge);

    case "charge.dispute.created":
      return onDisputeOpened(event.data.object as Stripe.Dispute);
  }
}

/**
 * A completed Checkout: either a new subscription or a pack of hours.
 *
 * `payment_status` is checked rather than assumed — a session can complete
 * while a delayed payment method is still pending, and granting hours at that
 * point hands out transcription that may never be paid for.
 */
async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status === "unpaid") return;

  const kind = session.metadata?.kind;
  if (kind === "topup") return creditTopUp(session, "paid");
  if (kind === "gift") return releaseGift(session, "unclaimed");
  if (kind === "subscription") return activateSubscription(session);
}

async function onCheckoutFailed(session: Stripe.Checkout.Session): Promise<void> {
  if (session.metadata?.kind === "topup") return creditTopUp(session, "failed");
  if (session.metadata?.kind === "gift") return releaseGift(session, "failed");
}

/**
 * Makes a paid gift claimable. Idempotent, like every handler here.
 *
 * The code exists from the moment checkout opens but grants nothing until this
 * runs — `redeemGift` only accepts a gift in `unclaimed`, so a code read off a
 * success page before payment confirmed is worth nothing.
 */
async function releaseGift(
  session: Stripe.Checkout.Session,
  status: "unclaimed" | "failed",
): Promise<void> {
  const giftId = session.metadata?.giftId;
  if (!giftId) return;
  await Gift.updateOne(
    { _id: giftId, status: "pending" },
    {
      $set: {
        status,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      },
    },
  );
}

/**
 * Marks a top-up paid. Idempotent: replaying the event is a no-op.
 *
 * The update is conditional on the row still being `pending`, so a retry
 * cannot double-credit, and `purchasedHoursFor` counts only `paid` rows.
 */
async function creditTopUp(
  session: Stripe.Checkout.Session,
  status: "paid" | "failed",
): Promise<void> {
  const topUpId = session.metadata?.topUpId;
  if (!topUpId) return;

  await HourTopUp.updateOne(
    { _id: topUpId, status: "pending" },
    {
      $set: {
        status,
        // The clock starts when the money lands, not when checkout opened.
        // Only on success: a failed row has no hours to run out.
        ...(status === "paid" ? { expiresAt: topUpExpiryFrom() } : {}),
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : undefined,
        invoiceRef: typeof session.invoice === "string" ? session.invoice : undefined,
      },
    },
  );
}

/**
 * Turns a paid subscription Checkout into slots on the account.
 *
 * The slot count is re-read from the subscription rather than taken from the
 * session metadata: the subscription is what Stripe will keep billing, so it
 * is the number that has to match what we grant.
 */
async function activateSubscription(session: Stripe.Checkout.Session): Promise<void> {
  const accountId = session.metadata?.accountId;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!accountId || !subscriptionId) return;

  const account = await Account.findById(accountId);
  if (!account) return;

  const subscription = await stripe().subscriptions.retrieve(subscriptionId);
  await applySubscription(account, subscription);
}

async function onSubscriptionChanged(subscription: Stripe.Subscription): Promise<void> {
  const account = await findAccountForSubscription(subscription);
  if (!account) return;
  await applySubscription(account, subscription);
}

/**
 * Writes a Stripe subscription onto the account.
 *
 * Shared by activation and every later change, so adding a branch in our UI
 * and adding one through Stripe's portal land in exactly the same state.
 * Entitlements come from the catalog, keyed by the quantity Stripe is billing.
 */
async function applySubscription(
  account: InstanceType<typeof Account>,
  subscription: Stripe.Subscription,
): Promise<void> {
  const quantity = subscription.items.data[0]?.quantity ?? 1;
  const entitlements = entitlementsFor("standard", quantity);

  account.planId = "standard";
  account.stripeSubscriptionId = subscription.id;
  account.purchasedSlots = entitlements.slots;
  account.slots = entitlements.slots;
  account.hoursPerChurch = entitlements.hoursPerChurch;
  account.monthlyPrice = entitlements.monthlyPrice;
  // Read from the subscription item, not our metadata: Stripe is what will
  // actually bill, so its interval is the one that governs.
  account.billingInterval =
    subscription.items.data[0]?.price?.recurring?.interval === "year" ? "year" : "month";
  account.status = mapStatus(subscription.status);
  await account.save();
  await syncLegacyEntitlement(account);
}

/**
 * Stripe's lifecycle, reduced to the four states this application acts on.
 *
 * `past_due` deliberately does NOT drop the account to Free: a card that
 * failed on a Saturday must not take a church off the air on Sunday. Stripe
 * retries, and `customer.subscription.deleted` is what finally revokes.
 */
function mapStatus(status: Stripe.Subscription.Status): "active" | "trialing" | "past_due" | "cancelled" {
  switch (status) {
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "cancelled";
    default:
      return "active";
  }
}

/**
 * The end of a subscription: back to Free, keeping every church.
 *
 * Slots are NOT reduced to one here. Deleting churches because a card expired
 * is not a billing decision, and the owner may be about to re-subscribe. The
 * free allowance applies immediately; tidying up excess churches is a
 * conversation, not a webhook.
 */
async function onSubscriptionEnded(subscription: Stripe.Subscription): Promise<void> {
  const account = await findAccountForSubscription(subscription);
  if (!account) return;

  const free = entitlementsFor("free");
  account.planId = "free";
  account.purchasedSlots = 0;
  account.hoursPerChurch = free.hoursPerChurch;
  account.monthlyPrice = 0;
  account.status = "cancelled";
  account.stripeSubscriptionId = undefined;
  await account.save();
  await syncLegacyEntitlement(account);
  await notifyPlanEnded(account);
}

async function onInvoiceFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const account = await Account.findOne({ stripeCustomerId: customerId });
  if (!account) return;
  // Only tell them the first time. Stripe retries a declined card several
  // times, and one failure should not become four identical notices.
  const wasHealthy = account.status !== "past_due";
  account.status = "past_due";
  await account.save();
  if (wasHealthy) await notifyPaymentFailed(account);
}

/** A recovered payment clears past_due without waiting for the next change. */
async function onInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const account = await Account.findOne({ stripeCustomerId: customerId, status: "past_due" });
  if (!account) return;
  account.status = "active";
  await account.save();
  await notifyPaymentRecovered(account);
}

/**
 * Money has gone back. Whatever it bought has to go back with it.
 *
 * Without this, refunding a pack of hours in the Stripe dashboard left the
 * `HourTopUp` row sitting at `paid`, so the church kept spending hours it had
 * been reimbursed for — the refund cost us twice.
 *
 * PARTIAL refunds are deliberately not acted on. A row is a whole purchase of
 * N hours at one price; there is no way to express "3.4 of these hours were
 * returned", and guessing in either direction is worse than leaving the row
 * alone and saying so in the log for a human to settle.
 */
async function onChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  if (!charge.refunded) {
    console.warn(
      `[Billing] Partial refund on ${paymentIntentId} (${charge.amount_refunded} of ${charge.amount}) — nothing reversed automatically.`,
    );
    return;
  }

  await reverseTopUp(paymentIntentId);
  await voidRefundedGift(paymentIntentId);
}

/**
 * Takes refunded hours back off the church.
 *
 * Idempotent through the `status: "paid"` guard: a replayed event matches
 * nothing the second time. `purchasedHoursFor` counts only `paid` rows, so the
 * hours stop being spendable the moment this lands — including mid-month, which
 * is the point.
 */
async function reverseTopUp(paymentIntentId: string): Promise<void> {
  const topUp = await HourTopUp.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntentId, status: "paid" },
    { $set: { status: "refunded" } },
  );
  if (!topUp) return;

  const account = await Account.findById(topUp.accountId);
  if (!account) return;
  const church = await Organization.findById(topUp.organizationId).select("name").lean();
  await notifyTopUpRefunded(account, topUp.hours, church?.name);
}

/**
 * A refunded gift code must stop being redeemable.
 *
 * Only an `unclaimed` code is touched. One already redeemed has become
 * somebody's live plan, and clawing that back from a church that did nothing
 * wrong is a support conversation, not a webhook — so it is logged instead.
 */
async function voidRefundedGift(paymentIntentId: string): Promise<void> {
  const voided = await Gift.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntentId, status: "unclaimed" },
    { $set: { status: "failed" } },
  );
  if (voided) return;

  const redeemed = await Gift.findOne({
    stripePaymentIntentId: paymentIntentId,
    status: "redeemed",
  }).select("_id");
  if (redeemed) {
    console.warn(
      `[Billing] Refunded gift ${redeemed._id} was already redeemed — entitlements left in place for review.`,
    );
  }
}

/**
 * A disputed charge: the owner is told, and nothing else changes.
 *
 * Access is NOT withdrawn, for the same reason `past_due` does not withdraw it.
 * A dispute is frequently opened in error — an unrecognised card descriptor,
 * a treasurer who did not know a volunteer had subscribed — and it takes weeks
 * to close. Pulling a church off the air on an accusation, days before it is
 * resolved, is the worse failure. If the dispute is ultimately lost, Stripe
 * cancels for non-payment and `customer.subscription.deleted` revokes properly.
 *
 * Top-up hours are left in place too: the money may still come back.
 */
async function onDisputeOpened(dispute: Stripe.Dispute): Promise<void> {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  const customerId = await customerForDispute(dispute);
  if (!customerId) {
    console.warn(`[Billing] Dispute on charge ${chargeId} has no customer — not attributable.`);
    return;
  }

  const account = await Account.findOne({ stripeCustomerId: customerId });
  if (!account) return;
  await notifyPaymentDisputed(account, dispute.amount / 100);
}

/** The customer behind a dispute, from the event or by fetching the charge. */
async function customerForDispute(dispute: Stripe.Dispute): Promise<string | undefined> {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  if (typeof dispute.charge !== "string" && dispute.charge?.customer) {
    const customer = dispute.charge.customer;
    return typeof customer === "string" ? customer : customer.id;
  }
  if (!chargeId) return undefined;
  const charge = await stripe().charges.retrieve(chargeId);
  return typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
}

/**
 * Finds the account a subscription belongs to.
 *
 * By subscription id first, then by customer, then by the metadata stamped at
 * creation — a subscription started in Stripe's portal rather than our UI has
 * no stored id yet, and would otherwise be silently ignored.
 */
async function findAccountForSubscription(subscription: Stripe.Subscription) {
  const byId = await Account.findOne({ stripeSubscriptionId: subscription.id });
  if (byId) return byId;

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (customerId) {
    const byCustomer = await Account.findOne({ stripeCustomerId: customerId });
    if (byCustomer) return byCustomer;
  }

  const accountId = subscription.metadata?.accountId;
  return accountId ? Account.findById(accountId) : null;
}
