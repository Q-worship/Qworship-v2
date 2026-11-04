import React from "react";
import { formatHours } from "@qworship/shared";
import type { BillingOverview } from "@/lib/billingApi";
import { Meter } from "./BillingPrimitives";

/**
 * The four-up strip at the top of the Plans tab.
 *
 * Cloud storage is a real measurement, not the design's hardcoded 5 GB: every
 * media row carries the byte count recorded at upload, so the bar is the sum
 * of what a church has actually put there.
 *
 * Hours and storage are both per church rather than the design's single
 * "10 / 30 hours" for the whole network. One figure across branches is the
 * pooled reading we removed everywhere else, and it would tell a branch
 * nothing about whether it can get through Sunday.
 */
export const PlanDetailsStrip: React.FC<{ overview: BillingOverview }> = ({ overview }) => {
  const branchPercent =
    overview.slotsTotal > 0 ? (overview.churches / overview.slotsTotal) * 100 : 0;

  // The busiest church is the one that governs: an average would hide the
  // branch about to run out, which is the only one anybody needs to act on.
  const tightest = overview.branches.reduce(
    (worst, b) => (b.percentUsed > (worst?.percentUsed ?? -1) ? b : worst),
    overview.branches[0],
  );

  return (
    <div className="grid overflow-hidden rounded-xl bg-account-well sm:grid-cols-2 lg:grid-cols-4">
      <Cell label="Your plan">
        <div className="text-xl font-semibold capitalize text-white">{overview.planId}</div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className={overview.status === "active" ? "text-emerald-400" : "text-amber-300"}>
            {overview.status === "trialing" ? "Trial" : overview.status.replace(/_/g, " ")}
          </span>
          <span className="text-gray-500">
            {overview.monthlyPrice > 0 ? `$${overview.monthlyPrice.toFixed(2)} / month` : "No charge"}
          </span>
        </div>
      </Cell>

      <Cell label="Hands-free Bible hours">
        {tightest ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-semibold leading-none text-white">
                {formatHours(tightest.usedHours)}
              </span>
              <span className="text-xs text-gray-500">/ {tightest.allowance} per church</span>
            </div>
            <div className="mt-3">
              <Meter percent={tightest.percentUsed} warn={tightest.percentUsed >= 80} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span className="truncate pr-2">{tightest.name}</span>
              <span>{tightest.percentUsed}% used</span>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-500">No churches yet</div>
        )}
      </Cell>

      <Cell label="Church slots">
        <div className="flex items-baseline gap-2">
          <span className="text-[28px] font-semibold leading-none text-white">
            {overview.churches}
          </span>
          <span className="text-xs text-gray-500">/ {overview.slotsTotal} slots</span>
        </div>
        <div className="mt-3">
          <Meter percent={branchPercent} warn={overview.churches >= overview.slotsTotal} />
        </div>
        <div className="mt-2 text-right text-xs text-gray-500">
          {Math.round(branchPercent)}% used
        </div>
      </Cell>

      <Cell label="Cloud storage" last>
        {tightest ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-semibold leading-none text-white">
                {tightest.storageUsedGb.toFixed(2)}
              </span>
              <span className="text-xs text-gray-500">/ {tightest.storageLimitGb} GB</span>
            </div>
            <div className="mt-3">
              <Meter
                percent={tightest.storagePercentUsed}
                warn={tightest.storagePercentUsed >= 80}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>
                {Math.max(0, tightest.storageLimitGb - tightest.storageUsedGb).toFixed(2)} GB free
              </span>
              <span>{tightest.storagePercentUsed}% used</span>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-500">No churches yet</div>
        )}
      </Cell>
    </div>
  );
};

const Cell: React.FC<{ label: string; last?: boolean; children: React.ReactNode }> = ({
  label,
  last,
  children,
}) => (
  <div className={`p-6 ${last ? "" : "lg:border-r lg:border-white/10"} border-b border-white/10 lg:border-b-0`}>
    <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
    <div className="mt-4">{children}</div>
  </div>
);
