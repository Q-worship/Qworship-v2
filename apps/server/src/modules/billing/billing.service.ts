import { OVERAGE_PRICE_PER_HOUR_USD } from "@qworship/shared";
import { IAccount, accountSlots, hoursPerChurchOf } from "../organization/account.model.js";
import { HourTopUp } from "../organization/hour-topup.model.js";
import { Organization } from "../organization/organization.model.js";
import { TranscriptionSession, usagePeriod } from "../usage/usage.model.js";
import { networkHourUsage, slotUsage, type BranchHourUsage } from "../organization/account.service.js";
import { isTestMode, stripeConfigured } from "./stripe.client.js";
import { listStripeInvoices, stripeSnapshot } from "./stripe.service.js";

/**
 * Everything the billing screens read.
 *
 * Kept out of the route layer so each endpoint is a lookup and a response.
 * The rule throughout: report what is actually recorded. Figures that live at
 * Stripe — the renewal date, the card — are read from Stripe on request rather
 * than mirrored into our database, because a card that expires or a payment
 * that fails changes them without telling us, and a stale copy on a billing
 * screen is worse than a slightly slower one. When Stripe is unreachable they
 * come back null rather than as a plausible-looking zero.
 */

export interface BillingOverview {
  planId: string;
  status: string;
  /** Per month, in USD, as agreed at purchase. */
  monthlyPrice: number;
  churches: number;
  slotsTotal: number;
  hoursPerChurch: number;
  /** Null until a subscription exists at the processor. */
  nextRenewalAt: string | null;
  /** Null until a card is on file. Read live from Stripe, never mirrored. */
  paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null;
  /** True once cancellation is scheduled for the end of the paid period. */
  cancelAtPeriodEnd: boolean;
  /** Whether card payments can be taken at all, so the UI can say so. */
  paymentsEnabled: boolean;
  /** True while running on Stripe test keys, so the UI can label it. */
  testMode: boolean;
  /** What has been spent on top-ups this period, in USD. */
  topUpSpendThisPeriod: number;
  branches: BranchHourUsage[];
  period: string;
}

export async function billingOverview(account: IAccount): Promise<BillingOverview> {
  const period = usagePeriod();
  const [slots, branches, topUps, snapshot] = await Promise.all([
    slotUsage(account),
    networkHourUsage(account),
    HourTopUp.find({ accountId: account._id, period, status: "paid" }).select("amountUsd").lean(),
    // Never fatal: a Stripe outage should degrade the renewal date, not take
    // the whole billing screen down with it.
    stripeConfigured()
      ? stripeSnapshot(account).catch(() => null)
      : Promise.resolve(null),
  ]);

  return {
    planId: account.planId,
    status: account.status,
    monthlyPrice: account.monthlyPrice || 0,
    churches: slots.churches,
    slotsTotal: accountSlots(account),
    hoursPerChurch: hoursPerChurchOf(account),
    nextRenewalAt: snapshot?.nextRenewalAt ?? null,
    paymentMethod: snapshot?.paymentMethod ?? null,
    cancelAtPeriodEnd: snapshot?.cancelAtPeriodEnd ?? false,
    paymentsEnabled: stripeConfigured(),
    testMode: isTestMode(),
    topUpSpendThisPeriod: Number(
      topUps.reduce((sum, t) => sum + (t.amountUsd || 0), 0).toFixed(2),
    ),
    branches,
    period,
  };
}

export interface UsageWeek {
  /** ISO date of the week's first day, UTC. */
  startsAt: string;
  hours: number;
}

/**
 * Billable hours per week across the network, most recent last.
 *
 * Read from TranscriptionSession rather than UsageCounter because the counter
 * is a monthly total and cannot be split into weeks. Weeks are bucketed from
 * `startedAt`: a session is attributed to the week it began in, so a service
 * that runs past midnight is not cut in half.
 */
export async function usageTrend(account: IAccount, weeks = 4): Promise<UsageWeek[]> {
  const churches = await Organization.find({ accountId: account._id }).select("_id").lean();
  const ids = churches.map((c) => c._id);

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - weeks * 7);
  since.setUTCHours(0, 0, 0, 0);

  const sessions = await TranscriptionSession.find({
    organizationId: { $in: ids },
    startedAt: { $gte: since },
  })
    .select("startedAt billableSeconds")
    .lean();

  // Fixed buckets so a quiet week reports zero rather than vanishing.
  const buckets: UsageWeek[] = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(since);
    start.setUTCDate(start.getUTCDate() + i * 7);
    return { startsAt: start.toISOString(), hours: 0 };
  });

  for (const session of sessions) {
    const offset = Math.floor(
      (new Date(session.startedAt).getTime() - since.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    const bucket = buckets[Math.min(buckets.length - 1, Math.max(0, offset))];
    bucket.hours += (session.billableSeconds || 0) / 3600;
  }

  return buckets.map((b) => ({ ...b, hours: Number(b.hours.toFixed(2)) }));
}

export interface InvoiceRecord {
  id: string;
  /** Stripe's hosted receipt, when the charge came from a Stripe invoice. */
  hostedUrl?: string | null;
  reference: string;
  description: string;
  /** The church it was bought for; absent for account-wide charges. */
  churchName?: string;
  date: string;
  amountUsd: number;
  status: string;
}

/**
 * The billing history: plan invoices from Stripe, plus the top-up ledger.
 *
 * Plan invoices are read from Stripe rather than mirrored, so this list cannot
 * drift from the card statement. Top-ups are ours because they carry the thing
 * Stripe has no concept of — which church the hours belong to.
 */
export async function listInvoices(account: IAccount, limit = 50): Promise<InvoiceRecord[]> {
  const stripeRows = stripeConfigured()
    ? await listStripeInvoices(account).catch(() => [])
    : [];

  const rows = await HourTopUp.find({ accountId: account._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate<{ organizationId: { name?: string } }>("organizationId", "name")
    .lean();

  const topUpRows: InvoiceRecord[] = rows.map((row: any) => ({
    id: String(row._id),
    reference: row.invoiceRef || `TOPUP-${String(row._id).slice(-8).toUpperCase()}`,
    description: `${row.hours} extra ${row.hours === 1 ? "hour" : "hours"}`,
    churchName: row.organizationId?.name,
    date: new Date(row.createdAt).toISOString(),
    amountUsd: row.amountUsd || 0,
    status: row.status,
  }));

  // One list, newest first, so a plan charge and the hours bought the same
  // week read in the order they happened.
  return [...stripeRows, ...topUpRows]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, limit);
}

/** What a given number of top-up hours costs, at the catalog's overage rate. */
export function topUpPriceUsd(hours: number): number {
  return Number((hours * OVERAGE_PRICE_PER_HOUR_USD).toFixed(2));
}
