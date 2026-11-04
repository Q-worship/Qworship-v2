import React from "react";
import { formatHours } from "@qworship/shared";
import { useBillingUsage } from "@/hooks/useBilling";
import { Panel, TabSkeleton, EmptyState } from "./BillingPrimitives";
import { BranchHoursTable } from "./BranchHoursTable";

/**
 * What the network actually consumed, week by week and church by church.
 *
 * The weekly figures come from transcription sessions rather than the monthly
 * counter, which cannot be split into weeks. A session counts in the week it
 * BEGAN, so a service running past midnight is not cut in half.
 */
export const BillingUsageTab: React.FC = () => {
  const { weeks, branches, isLoading, isError, error } = useBillingUsage(4);

  if (isLoading) return <TabSkeleton />;
  if (isError) {
    return (
      <EmptyState
        title="Could not load usage"
        body={error instanceof Error ? error.message : "Please refresh and try again."}
      />
    );
  }

  const total = weeks.reduce((sum, w) => sum + w.hours, 0);
  // Scale to the tallest week actually recorded, not to a fixed hour. A church
  // with minutes of usage would otherwise see four identical flat bars and no
  // way to tell the week it used the product from the three it did not.
  const peak = Math.max(...weeks.map((w) => w.hours), 0) || 1;

  return (
    <div className="space-y-6">
      <Panel
        title="Hands-free Bible usage"
        description="Across every church on the account, by week."
      >
        {total === 0 ? (
          <EmptyState
            title="Nothing recorded yet"
            body="Usage appears here after your first hands-free Bible session."
          />
        ) : (
          <>
            {/* A plain bar chart: four values need axes less than they need
                to be readable at a glance on a phone. */}
            <div className="flex items-end justify-between gap-3 sm:gap-6" style={{ height: 180 }}>
              {weeks.map((week, index) => {
                const isCurrent = index === weeks.length - 1;
                return (
                  <div key={week.startsAt} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-medium tabular-nums text-gray-300">
                      {formatHours(week.hours)}
                    </span>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        isCurrent ? "bg-[#a98bff]" : "bg-[#8356F3]"
                      } ${week.hours === 0 ? "opacity-30" : ""}`}
                      // A week with nothing in it stays a hairline; a week with
                      // anything at all gets enough height to read as a bar.
                      style={{
                        height:
                          week.hours === 0 ? "3px" : `${Math.max(10, (week.hours / peak) * 130)}px`,
                      }}
                      role="img"
                      aria-label={`${formatHours(week.hours)} in the week of ${new Date(week.startsAt).toLocaleDateString()}`}
                    />
                    <span className="text-[11px] text-gray-500">
                      {isCurrent
                        ? "This week"
                        : new Date(week.startsAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-5 border-t border-white/10 pt-4 text-xs text-gray-500">
              {formatHours(total)} across the last {weeks.length} weeks, every church combined.
              Allowances are still per church — this total spends nothing.
            </p>
          </>
        )}
      </Panel>

      <Panel
        title="Per-church consumption"
        description="Each church against its own allowance."
      >
        <BranchHoursTable branches={branches} />
      </Panel>
    </div>
  );
};
