import React from "react";
import { Mic, Church, Cloud, BarChart3 } from "lucide-react";
import { formatHours } from "@qworship/shared";
import type { BranchHourUsage } from "@/lib/accountApi";
import type { StreamHealth } from "@/lib/billingApi";

/**
 * The KPI row above the usage chart.
 *
 * One bordered strip with dividers rather than four separate cards — that
 * grouping is the design's, and it reads as a single instrument panel. The
 * violet edge is an accent, NOT the `border-white/10` that account cards are
 * forbidden from carrying.
 *
 * Each tile ends in a meter and a two-ended caption: what the number is on the
 * left, how full it is on the right. The bar is coloured by STATE, not for
 * decoration — it goes amber past 80% and red when full, so the row can be
 * read at a glance without looking at any number.
 *
 * "Peak Sunday Streams" is MEASURED, not estimated — `usage.health.ts` sweeps
 * session start and end times for the high-water mark of overlapping streams.
 * The ceiling it is shown against is the number of churches on the account:
 * each church is one service, so that is the realistic number of simultaneous
 * feeds, and it is derived rather than a figure someone typed.
 *
 * A NETWORK NEVER GETS ONE HOURS FIGURE OVER ONE ALLOWANCE. Hours are per
 * church and none may spend another's, so "10 / 30 hours" across five churches
 * would describe a pool that does not exist. One church shows its own
 * allowance; a network shows a total with no denominator.
 */

const toneFor = (percent: number): string =>
  percent >= 100 ? "bg-red-400" : percent >= 80 ? "bg-amber-400" : "bg-[#8356F3]";

const Tile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  percent?: number;
  barColor?: string;
  footLeft?: string;
  footRight?: string;
}> = ({ icon, label, value, suffix, percent, barColor, footLeft, footRight }) => (
  <div className="flex-1 border-b border-[#373243] p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#373243] bg-[#221D2D] text-[#C9BEFF]">
      {icon}
    </span>
    <div className="mt-3 text-sm font-semibold text-white">{label}</div>
    <div className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
      <span className="text-[32px] font-bold leading-none tabular-nums text-white">{value}</span>
      {suffix && <span className="text-sm text-[#C9C4D9]">{suffix}</span>}
    </div>
    {typeof percent === "number" && (
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#151120]">
        <div
          className={`h-full rounded-full transition-all ${barColor || toneFor(percent)}`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    )}
    {(footLeft || footRight) && (
      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="text-[#768092]">{footLeft}</span>
        <span className="font-medium text-[#C9C4D9]">{footRight}</span>
      </div>
    )}
  </div>
);

export const UsageStatTiles: React.FC<{
  branches: BranchHourUsage[];
  slots: number;
  health?: StreamHealth;
}> = ({ branches, slots, health }) => {
  const single = branches.length === 1 ? branches[0] : null;

  const usedHours = branches.reduce((sum, b) => sum + b.usedHours, 0);
  const storageUsed = branches.reduce((sum, b) => sum + b.storageUsedGb, 0);
  const storageLimit = branches.reduce((sum, b) => sum + b.storageLimitGb, 0);

  const hoursPercent = single ? single.percentUsed : 0;
  const storagePercent = single
    ? single.storagePercentUsed
    : storageLimit > 0
      ? Math.round((storageUsed / storageLimit) * 100)
      : 0;
  const slotPercent = slots > 0 ? Math.round((branches.length / slots) * 100) : 0;
  // One church is one service, so the number of churches is the realistic
  // ceiling on simultaneous feeds. Never zero, or the meter divides by it.
  const feedCeiling = Math.max(1, branches.length);
  const peak = health?.peakSundayConcurrent ?? 0;
  const feedPercent = Math.min(100, Math.round((peak / feedCeiling) * 100));

  const storageFree = Math.max(0, (single ? single.storageLimitGb : storageLimit) - (single ? single.storageUsedGb : storageUsed));

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[#373243] bg-account-card sm:flex-row">
      <Tile
        icon={<Mic size={16} />}
        label="Transcription & HFB hours"
        value={formatHours(single ? single.usedHours : usedHours)}
        suffix={single ? `/ ${formatHours(single.allowance)}` : `across ${branches.length} churches`}
        percent={single ? hoursPercent : undefined}
        footLeft="Consumed"
        footRight={single ? `${hoursPercent}% utilised` : "Allowances are per church"}
      />
      <Tile
        icon={<Church size={16} />}
        label="Active church branches"
        value={String(branches.length)}
        suffix={`/ ${slots} ${slots === 1 ? "slot" : "slots"}`}
        percent={slotPercent}
        footLeft="Allocation"
        footRight={`${slotPercent}% capacity`}
      />
      <Tile
        icon={<Cloud size={16} />}
        label="Cloud storage"
        value={(single ? single.storageUsedGb : storageUsed).toFixed(2)}
        suffix={`/ ${single ? single.storageLimitGb : storageLimit} GB`}
        percent={storagePercent}
        footLeft={`Free: ${storageFree.toFixed(2)} GB`}
        footRight={`${storagePercent}% used`}
      />
      <Tile
        icon={<BarChart3 size={16} />}
        label="Peak Sunday streams"
        value={String(health?.peakSundayConcurrent ?? 0)}
        suffix={`/ ${feedCeiling} concurrent`}
        percent={feedPercent}
        footLeft={`Limit: ${feedCeiling} ${feedCeiling === 1 ? "feed" : "feeds"}`}
        footRight={`${feedPercent}% utilised`}
      />
    </div>
  );
};
