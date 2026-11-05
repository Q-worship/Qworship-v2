import { get, post } from "@/lib/apiResult";
import type { BranchHourUsage } from "@/lib/accountApi";

/**
 * What the billing screens read, and the one thing they write.
 *
 * Deliberately separate from accountApi: that module changes what a network
 * HOLDS (slots, plan, branches), this one reports what it has SPENT. They are
 * read by the same screens but they are different questions, and merging them
 * is how a module ends up with thirty exports and no shape.
 */

export interface BillingOverview {
  planId: "free" | "standard";
  status: "active" | "trialing" | "past_due" | "cancelled";
  monthlyPrice: number;
  churches: number;
  slotsTotal: number;
  hoursPerChurch: number;
  /** Null until a subscription exists at the processor. */
  nextRenewalAt: string | null;
  /** Null until a card is on file. Read live from Stripe. */
  paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null;
  /** True once cancellation is scheduled for the end of the paid period. */
  cancelAtPeriodEnd: boolean;
  /** False when Stripe is not configured, so screens can say so plainly. */
  paymentsEnabled: boolean;
  /** True on Stripe test keys. Shown, so nobody mistakes a test for a charge. */
  testMode: boolean;
  topUpSpendThisPeriod: number;
  /** How the subscription bills. Yearly is twelve months at a tenth off. */
  billingInterval?: "month" | "year";
  branches: BranchHourUsage[];
  period: string;
}

export interface UsageWeek {
  startsAt: string;
  hours: number;
}

export interface InvoiceRecord {
  id: string;
  /** Stripe's hosted receipt, where there is one. */
  hostedUrl?: string | null;
  reference: string;
  description: string;
  churchName?: string;
  date: string;
  amountUsd: number;
  status: string;
}

export const BILLING_OVERVIEW_KEY = ["/api/billing/overview"] as const;
export const BILLING_USAGE_KEY = ["/api/billing/usage"] as const;
export const BILLING_INVOICES_KEY = ["/api/billing/invoices"] as const;

export function fetchBillingOverview(): Promise<{
  overview: BillingOverview;
  role: "owner" | "admin" | "member";
}> {
  return get("/api/billing/overview");
}

/** How a range is cut up. `sunday` is week-long but anchored to Sundays. */
export type Granularity = "day" | "week" | "sunday" | "month";

/** The ranges the usage screen offers. */
export type RangePreset = "7d" | "30d" | "90d" | "weekly" | "monthly" | "custom";

export interface UsageBucket {
  startsAt: string;
  endsAt: string;
  hours: number;
  /** Printed as-is: the server builds it so chart and table cannot disagree. */
  label: string;
}

export interface UsageSeries {
  buckets: UsageBucket[];
  granularity: Granularity;
  from: string;
  to: string;
  totalHours: number;
  averageSundayHours: number;
  sundaysWithUsage: number;
}

export interface StreamHealth {
  peakConcurrent: number;
  peakAt: string | null;
  peakSundayConcurrent: number;
  uptimePercent: number;
  sessionsEnded: number;
  sessionsFailed: number;
}

export interface UsageQuery {
  range?: RangePreset;
  granularity?: Granularity;
  /** Only read when range is "custom". Dates as YYYY-MM-DD. */
  from?: string;
  to?: string;
  /** One church, or every church on the account when absent. */
  organizationId?: string | null;
}

export function fetchBillingUsage(
  query: UsageQuery = {},
  weeks = 4,
): Promise<{
  weeks: UsageWeek[];
  series: UsageSeries;
  health: StreamHealth;
  churches: { id: string; name: string }[];
  branches: (BranchHourUsage & { health: StreamHealth | null })[];
  period: string;
}> {
  const params = new URLSearchParams({ weeks: String(weeks) });
  if (query.range) params.set("range", query.range);
  if (query.granularity) params.set("granularity", query.granularity);
  if (query.range === "custom" && query.from) params.set("from", query.from);
  if (query.range === "custom" && query.to) params.set("to", query.to);
  if (query.organizationId) params.set("organizationId", query.organizationId);
  return get(`/api/billing/usage?${params.toString()}`);
}

export function fetchInvoices(): Promise<{
  invoices: InvoiceRecord[];
  subscriptionInvoicesAvailable: boolean;
  testMode: boolean;
}> {
  return get("/api/billing/invoices");
}

/**
 * Starts Checkout for extra hours on one church.
 *
 * Returns a URL to send the browser to. Nothing is granted by this call and
 * nothing is granted when the browser comes back — only Stripe's signed
 * webhook moves hours, so a replayed redirect buys nobody anything.
 */
export function purchaseTopUp(
  organizationId: string,
  hours: number,
): Promise<{ checkoutUrl: string }> {
  return post("/api/billing/topup", { organizationId, hours });
}

/**
 * Subscribes, or changes how many churches the plan covers.
 *
 * Two shapes on purpose: a first subscription needs a card and comes back with
 * `checkoutUrl`; changing the count on a live subscription is billed against
 * the card on file and comes back `updated`.
 */
export function startSubscription(
  slots: number,
  interval: "month" | "year" = "month",
): Promise<{ checkoutUrl?: string; updated?: boolean }> {
  return post("/api/billing/subscription", { slots, interval });
}

/**
 * Gifting a subscription to another church.
 *
 * A gift is paid once, up front, and produces a code the recipient redeems
 * against their own account — so the sponsor never needs to know which account
 * that will be, and often the recipient has not signed up yet.
 */
export interface GiftRecord {
  id: string;
  /** Present only while unclaimed; a spent code is not worth reprinting. */
  code: string | null;
  recipientName: string | null;
  recipientEmail: string | null;
  months: number;
  slots: number;
  amountUsd: number;
  status: "unclaimed" | "redeemed" | "failed" | "expired";
  createdAt: string;
  redeemedAt: string | null;
  expiresAt: string | null;
}

export interface GiftOption {
  months: number;
  amountUsd: number;
}

export const GIFTS_KEY = ["/api/billing/gifts"] as const;
export const GIFT_OPTIONS_KEY = ["/api/billing/gift/options"] as const;

export function fetchGiftOptions(): Promise<{ options: GiftOption[] }> {
  return get("/api/billing/gift/options");
}

export function fetchGifts(): Promise<{ gifts: GiftRecord[] }> {
  return get("/api/billing/gifts");
}

export function purchaseGift(input: {
  months: number;
  slots?: number;
  recipientName?: string;
  recipientEmail?: string;
  message?: string;
}): Promise<{ checkoutUrl: string }> {
  return post("/api/billing/gift", input);
}

export function previewGift(code: string): Promise<{
  gift: { months: number; slots: number; recipientName: string | null; message: string | null };
}> {
  return get(`/api/billing/gift/${encodeURIComponent(code)}`);
}

export function redeemGift(code: string): Promise<{
  months: number;
  expiresAt: string;
  message: string;
}> {
  return post("/api/billing/gift/redeem", { code });
}

export function cancelSubscription(): Promise<unknown> {
  return post("/api/billing/subscription/cancel");
}

/** A link into Stripe's portal for cards, cancellation and receipts. */
export function openBillingPortal(): Promise<{ portalUrl: string }> {
  return post("/api/billing/portal");
}
