import React, { useState } from "react";
import { formatHours } from "@qworship/shared";
import { useBillingUsage, useBillingOverview } from "@/hooks/useBilling";
import { Panel, TabSkeleton, EmptyState } from "./BillingPrimitives";
import { BranchConsumptionTable } from "./BranchConsumptionTable";
import { UsageStatTiles } from "./UsageStatTiles";
import { HfbHoursGuardrails, EmergencySundayBuffer } from "./UsageGuardrails";
import { UsageChart } from "./UsageChart";
import { UsageItemisedTable } from "./UsageItemisedTable";
import { UsageRangeControls, type UsageControlsValue } from "./UsageRangeControls";

/**
 * What the network actually consumed, over a range the church chooses.
 *
 * Figures come from transcription sessions rather than the monthly counter,
 * which holds one number per month and cannot be cut into days or weeks. A
 * session counts in the bucket it BEGAN in, so a service running past midnight
 * is not split in half.
 *
 * The lower panel changes shape with the account. A network compares its
 * churches; a single church has nothing to compare, so it gets its own usage
 * itemised day by day or Sunday by Sunday instead of a one-row table.
 */
export const BillingUsageTab: React.FC = () => {
  const [controls, setControls] = useState<UsageControlsValue>({
    range: "weekly",
    organizationId: null,
  });

  const { overview } = useBillingOverview();
  const { series, health, churches, branches, isLoading, isError, error, isFetching } = useBillingUsage({
    range: controls.range,
    granularity: controls.granularity,
    from: controls.from,
    to: controls.to,
    organizationId: controls.organizationId,
  });

  if (isLoading) return <TabSkeleton />;
  if (isError) {
    return (
      <EmptyState
        title="Could not load usage"
        body={error instanceof Error ? error.message : "Please refresh and try again."}
      />
    );
  }

  // One church is the common case, and the whole lower half of this screen
  // depends on which it is.
  const isSingleChurch = churches.length <= 1;
  const selected = controls.organizationId
    ? branches.find((b) => b.organizationId === controls.organizationId)
    : undefined;
  const itemisedFor = isSingleChurch ? branches[0] : selected;

  return (
    <div className="space-y-6">
      <UsageStatTiles branches={branches} slots={overview?.slotsTotal ?? branches.length} health={health} />

      <Panel
        title="Hands Free Usage Analytics"
        description="Automated Scripture recognition & audio-to-text hours consumption"
        action={
          <UsageRangeControls
            value={controls}
            onChange={setControls}
            churches={churches}
            allowSundays
          />
        }
      >
        <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {!series || series.totalHours === 0 ? (
            <EmptyState
              title="Nothing recorded in this range"
              body="Try a wider range, or start a hands-free Bible session to see it here."
            />
          ) : (
            <>
              <UsageChart series={series} />
              <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-4 text-xs text-gray-500">
                <span>
                  {formatHours(series.totalHours)} in this range
                  {!controls.organizationId && !isSingleChurch && ", every church combined"}.
                  {!controls.organizationId && !isSingleChurch && (
                    <> Allowances are still per church — this total spends nothing.</>
                  )}
                </span>
                {series.sundaysWithUsage > 0 && (
                  <span>
                    Average Sunday run: {formatHours(series.averageSundayHours)} per service
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </Panel>

      {/* The design's pair, side by side on a wide screen. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <HfbHoursGuardrails />
        <EmergencySundayBuffer
          church={itemisedFor ?? (isSingleChurch ? branches[0] : undefined)}
          isNetwork={!isSingleChurch}
        />
      </div>

      {isSingleChurch ? (
        <Panel
          title={controls.granularity === "sunday" ? "Sunday by Sunday" : "Day by day"}
          description={
            itemisedFor
              ? `Every session ${itemisedFor.name} recorded in this range.`
              : "Every session recorded in this range."
          }
        >
          {series ? (
            <UsageItemisedTable series={series} allowanceHours={itemisedFor?.allowance} />
          ) : null}
        </Panel>
      ) : (
        <Panel
          title="Per-church consumption"
          description="Each church against its own allowance."
        >
          <BranchConsumptionTable branches={branches} />
        </Panel>
      )}
    </div>
  );
};
