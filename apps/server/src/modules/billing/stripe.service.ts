import type Stripe from "stripe";
import { entitlementsFor, slotPriceFor, type BillingInterval } from "@qworship/shared";
import { Account, IAccount } from "../organization/account.model.js";
import { HourTopUp } from "../organization/hour-topup.model.js";
import { Organization } from "../organization/organization.model.js";
import { slotUsage } from "../organization/account.service.js";
import { stripe, slotLineItem, topUpLineItem } from "./stripe.client.js";

/**
 * Starting a payment, and reading back what Stripe holds.
 *
 * Nothing here trusts the client for money. Quantities arrive from the request
 * but every price is taken from the catalog, and the destination church is
 * re-checked against the caller's own account before a session is opened —
 * otherwise anyone could buy hours onto someone else's branch.
 *
 * None of these functions grant anything. Entitlements move only in
 * stripe.webhook.ts, once Stripe says the money arrived.
 */

/** Where Checkout returns to. Configured so staging does not bounce to prod. */
function appUrl(): string {
  return (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * The Stripe customer for an account, created once and reused.
 *
 * Stored on the Account rather than looked up by email: a church can change
 * the email it signs in with, and matching on it would silently start a second
 * customer with a second payment method.
 */
export async function ensureCustomer(
  account: IAccount,
  owner: { email?: string; firstName?: string; lastName?: string },
): Promise<string> {
  if (account.stripeCustomerId) return account.stripeCustomerId;

  const customer = await stripe().customers.create({
    email: owner.email,
    name: [owner.firstName, owner.lastName].filter(Boolean).join(" ") || undefined,
    metadata: { accountId: String(account._id) },
  });

  account.stripeCustomerId = customer.id;
  await account.save();
  return customer.id;
}

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

/**
 * Opens Checkout for a new Standard subscription.
 *
 * Only for an account with no live subscription. Changing the slot count on an
 * existing one is `changeSubscriptionSlots` below, which bills the difference
 * immediately rather than sending somebody back through a card form they have
 * already filled in.
 */
export async function startSubscriptionCheckout(input: {
  account: IAccount;
  owner: { email?: string; firstName?: string; lastName?: string };
  slots: number;
  interval?: BillingInterval;
}): Promise<CheckoutResult> {
  const { account, owner } = input;
  const interval: BillingInterval = input.interval === "year" ? "year" : "month";

  // Price and slot floor come from the catalog and the database, never the
  // request: a client asking for 1000 slots at $0 must not be able to.
  const entitlements = entitlementsFor("standard", input.slots);
  const customerId = await ensureCustomer(account, owner);

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [slotLineItem(entitlements.slots, interval)],
    success_url: `${appUrl()}/dashboard-subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/dashboard-subscription/plans?checkout=cancelled`,
    // Read back by the webhook to decide which account to credit.
    metadata: {
      accountId: String(account._id),
      kind: "subscription",
      slots: String(entitlements.slots),
      interval,
    },
    subscription_data: {
      metadata: { accountId: String(account._id), interval },
    },
    // Lets Stripe collect the address it needs for tax and for Adaptive
    // Pricing to pick a presentment currency.
    billing_address_collection: "auto",
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url, sessionId: session.id };
}

/**
 * Changes the slot count on a live subscription, billing the difference now.
 *
 * Refuses to drop below the churches already in use for the same reason
 * `setPlan` does: stranding a church somebody is running services on is worse
 * than refusing the change.
 */
export async function changeSubscriptionSlots(
  account: IAccount,
  slots: number,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!account.stripeSubscriptionId) return { ok: false, reason: "No live subscription" };

  const entitlements = entitlementsFor("standard", slots);
  const usage = await slotUsage(account);
  if (entitlements.slots + (account.bonusSlots || 0) < usage.used) {
    return {
      ok: false,
      reason: `You are using ${usage.used} of your church slots. Release some before reducing the plan.`,
    };
  }

  const subscription = await stripe().subscriptions.retrieve(account.stripeSubscriptionId);
  const item = subscription.items.data[0];
  if (!item) return { ok: false, reason: "That subscription has no billable item" };

  await stripe().subscriptions.update(subscription.id, {
    items: [{ id: item.id, quantity: entitlements.slots }],
    // Charge or credit the unused part of the month now, so adding a branch
    // mid-month costs the part of the month it is actually used for.
    proration_behavior: "always_invoice",
    metadata: { accountId: String(account._id) },
  });

  return { ok: true };
}

/** Ends the subscription at the period end, so paid-for time is not lost. */
export async function cancelSubscription(account: IAccount): Promise<void> {
  if (!account.stripeSubscriptionId) return;
  await stripe().subscriptions.update(account.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Opens Checkout to buy hours for one church.
 *
 * The HourTopUp row is written first, as `pending`, and its id travels in the
 * session metadata. That ordering matters: if the webhook arrives before this
 * function returns, it still finds a row to mark paid.
 */
export async function startTopUpCheckout(input: {
  account: IAccount;
  owner: { email?: string; firstName?: string; lastName?: string };
  purchasedBy: string;
  organizationId: string;
  hours: number;
  period: string;
  amountUsd: number;
}): Promise<{ ok: true; result: CheckoutResult } | { ok: false; reason: string }> {
  const { account, owner, organizationId, hours, period, amountUsd } = input;

  // The church must be on the caller's own account. Without this, the
  // organizationId in the request would be enough to buy onto a stranger's
  // branch — or to read its name off the receipt.
  const church = await Organization.findOne({ _id: organizationId, accountId: account._id })
    .select("_id name")
    .lean();
  if (!church) return { ok: false, reason: "That church is not on your account" };

  const customerId = await ensureCustomer(account, owner);

  const topUp = await HourTopUp.create({
    organizationId: church._id,
    accountId: account._id,
    purchasedBy: input.purchasedBy,
    period,
    hours,
    amountUsd,
    status: "pending",
  });

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [topUpLineItem(hours, church.name)],
      success_url: `${appUrl()}/dashboard-subscription/branches?topup=success`,
      cancel_url: `${appUrl()}/dashboard-subscription/branches?topup=cancelled`,
      metadata: {
        accountId: String(account._id),
        kind: "topup",
        topUpId: String(topUp._id),
        organizationId: String(church._id),
      },
      payment_intent_data: {
        metadata: { topUpId: String(topUp._id) },
      },
      billing_address_collection: "auto",
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");

    topUp.stripePaymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : undefined;
    await topUp.save();

    return { ok: true, result: { url: session.url, sessionId: session.id } };
  } catch (error) {
    // Leaving a pending row behind would show a phantom purchase in the
    // billing history that can never complete.
    await HourTopUp.deleteOne({ _id: topUp._id });
    throw error;
  }
}

/**
 * A link to Stripe's own billing portal.
 *
 * Card details, cancellation and past invoices all live there rather than
 * being rebuilt here: handling a card number ourselves would drag this
 * application into PCI scope for no benefit.
 */
export async function billingPortalUrl(account: IAccount): Promise<string | null> {
  if (!account.stripeCustomerId) return null;
  const session = await stripe().billingPortal.sessions.create({
    customer: account.stripeCustomerId,
    return_url: `${appUrl()}/dashboard-subscription`,
  });
  return session.url;
}

export interface StripeSnapshot {
  nextRenewalAt: string | null;
  cancelAtPeriodEnd: boolean;
  paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null;
}

/**
 * What Stripe knows that we deliberately do not copy into our database:
 * the renewal date and the card on file.
 *
 * Read live rather than mirrored, because a card that expires or a payment
 * that fails changes these without telling us, and a stale copy on a billing
 * screen is worse than a slightly slower one.
 */
export async function stripeSnapshot(account: IAccount): Promise<StripeSnapshot> {
  const empty: StripeSnapshot = { nextRenewalAt: null, cancelAtPeriodEnd: false, paymentMethod: null };
  if (!account.stripeCustomerId) return empty;

  const [subscription, customer] = await Promise.all([
    account.stripeSubscriptionId
      ? stripe().subscriptions.retrieve(account.stripeSubscriptionId).catch(() => null)
      : Promise.resolve(null),
    stripe()
      .customers.retrieve(account.stripeCustomerId, { expand: ["invoice_settings.default_payment_method"] })
      .catch(() => null),
  ]);

  let paymentMethod: StripeSnapshot["paymentMethod"] = null;
  if (customer && !("deleted" in customer && customer.deleted)) {
    const pm = (customer as Stripe.Customer).invoice_settings
      ?.default_payment_method as Stripe.PaymentMethod | null;
    if (pm?.card) {
      paymentMethod = {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      };
    }
  }

  const periodEnd = (subscription as any)?.current_period_end as number | undefined;
  return {
    nextRenewalAt: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
    paymentMethod,
  };
}

/** Subscription invoices, read from Stripe rather than mirrored locally. */
export async function listStripeInvoices(account: IAccount, limit = 24) {
  if (!account.stripeCustomerId) return [];
  const invoices = await stripe().invoices.list({
    customer: account.stripeCustomerId,
    limit,
  });
  return invoices.data.map((invoice) => ({
    id: invoice.id,
    reference: invoice.number || invoice.id,
    description:
      invoice.lines.data[0]?.description ||
      (invoice.billing_reason === "subscription_create" ? "Subscription" : "Plan charge"),
    date: new Date((invoice.created || 0) * 1000).toISOString(),
    // Stripe reports in the settlement currency; the catalog is USD too.
    amountUsd: (invoice.amount_paid ?? invoice.amount_due ?? 0) / 100,
    status: invoice.status === "paid" ? "paid" : invoice.status || "unknown",
    hostedUrl: invoice.hosted_invoice_url || null,
  }));
}

/** Re-reads the account by Stripe customer id, for webhook handlers. */
export function accountByCustomer(customerId: string) {
  return Account.findOne({ stripeCustomerId: customerId });
}
