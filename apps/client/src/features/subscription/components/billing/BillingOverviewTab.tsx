import React from "react";
import { Link } from "wouter";
import { Church, Clock, Wallet } from "lucide-react";
import { formatUsd, formatHours } from "@qworship/shared";
import { useBillingOverview, useBillingPortal } from "@/hooks/useBilling";
import { Panel, StatTile, TabSkeleton, EmptyState, StatusPill } from "./BillingPrimitives";
import { BranchHoursTable } from "./BranchHoursTable";

/**
 * What the account is on, and what it has spent.
 *
 * The design's single "Hours used 10 / 30" tile is deliberately not here. One
 * network-wide hours figure is exactly the shared-bucket reading we removed:
 * hours belong to each church, so the honest headline is how many churches are
 * running low, and the detail is a table of them.
 */
export const BillingOverviewTab: React.FC = () => {
  const { overview, canManage, isLoading, isError, error } = useBillingOverview();
  const portal = useBillingPortal();

  if (isLoading) return <TabSkeleton />;
  if (isError || !overview) {
    return (
      <EmptyState
        title="Could not load billing"
        body={error instanceof Error ? error.message : "Please refresh and try again."}
      />
    );
  }

  const runningLow = overview.branches.filter((b) => b.percentUsed >= 80).length;

  return (
    <div className="space-y-[53px]">
      <div className="grid gap-[38px] sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          icon={<Church className="h-[15px] w-[15px]" />}
          label="Churches"
          value={`${overview.churches}`}
          caption={`of ${overview.slotsTotal} ${overview.slotsTotal === 1 ? "slot" : "slots"}`}
        />
        <StatTile
          icon={<Clock className="h-[15px] w-[15px]" />}
          label="Hours each church"
          value={formatHours(overview.hoursPerChurch)}
          caption="per month, kept to itself"
        />
        <StatTile
          icon={<Wallet className="h-[15px] w-[15px]" />}
          label="Monthly plan"
          value={formatUsd(overview.monthlyPrice)}
          caption={
            overview.topUpSpendThisPeriod > 0
              ? `plus ${formatUsd(overview.topUpSpendThisPeriod)} of extra hours this month`
              : "no extra hours bought this month"
          }
        />
      </div>

      <Panel
        title="Your plan"
        description="What this account is on, and what happens next."
        action={<StatusPill status={overview.status} />}
      >
        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Plan</dt>
            <dd className="mt-1 text-sm capitalize text-white">{overview.planId}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Renews</dt>
            <dd className="mt-1 text-sm text-gray-400">
              {overview.nextRenewalAt
                ? `${new Date(overview.nextRenewalAt).toLocaleDateString()}${
                    overview.cancelAtPeriodEnd ? " — then cancels" : ""
                  }`
                : overview.paymentsEnabled
                  ? "Nothing scheduled on the Free plan"
                  : "Card payments are not configured"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Payment method</dt>
            <dd className="mt-1 text-sm capitalize text-gray-400">
              {overview.paymentMethod
                ? `${overview.paymentMethod.brand} ···· ${overview.paymentMethod.last4} (exp ${String(
                    overview.paymentMethod.expMonth,
                  ).padStart(2, "0")}/${String(overview.paymentMethod.expYear).slice(-2)})`
                : "None on file"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Churches low on hours</dt>
            <dd className="mt-1 text-sm text-white">
              {runningLow === 0 ? "None" : `${runningLow} at 80% or more`}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap items-center gap-6">
          <Link
            href="/dashboard-subscription/plans"
            className="text-sm font-medium text-white underline underline-offset-4 transition-colors hover:text-[#a98bff]"
          >
            Change plan or add a church
          </Link>
          {/* Cards, cancellation and receipts live at Stripe rather than being
              rebuilt here: handling a card number would drag this application
              into PCI scope for no benefit. */}
          {canManage && overview.paymentMethod && (
            <button
              type="button"
              onClick={() => portal.mutate()}
              disabled={portal.isPending}
              className="text-sm font-medium text-white underline underline-offset-4 transition-colors hover:text-[#a98bff] disabled:opacity-50"
            >
              {portal.isPending ? "Opening…" : "Manage payment method"}
            </button>
          )}
        </div>

      </Panel>

      <Panel
        title="Hours by church"
        description="Each church spends its own. Nothing is shared between them."
      >
        <BranchHoursTable branches={overview.branches} />
      </Panel>
    </div>
  );
};
