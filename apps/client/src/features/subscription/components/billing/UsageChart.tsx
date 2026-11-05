import React from "react";
import { formatHours } from "@qworship/shared";
import type { UsageSeries } from "@/lib/billingApi";

/**
 * Hands-free hours over the chosen range.
 *
 * One series, so there is no legend — the panel title names it. The hard part
 * is that the bucket count is not fixed: four weeks and ninety days both land
 * here, and what reads well at four is unreadable at ninety.
 *
 * So labels are SELECTIVE. A value sits above the peak and the final bucket
 * only; every other figure is on hover. Axis labels thin out to roughly eight
 * across whatever width is available. Printing all ninety produces a grey
 * smear that communicates nothing.
 */

const BAR = "#8356F3";
const BAR_CURRENT = "#a98bff";

export const UsageChart: React.FC<{ series: UsageSeries }> = ({ series }) => {
  const { buckets } = series;
  if (buckets.length === 0) return null;

  // Scaled to the tallest bucket recorded, not to a fixed hour: a church with
  // minutes of usage would otherwise see flat bars and learn nothing.
  const peak = Math.max(...buckets.map((b) => b.hours), 0) || 1;
  const peakIndex = buckets.findIndex((b) => b.hours === peak && peak > 0);
  const lastIndex = buckets.length - 1;

  // Roughly eight ticks, whatever the bucket count.
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 8));
  const dense = buckets.length > 14;

  return (
    <div>
      <div className="flex items-end gap-[2px]" style={{ height: 190 }} role="img"
           aria-label={`Hands-free hours by ${series.granularity}, ${formatHours(series.totalHours)} in total`}>
        {buckets.map((bucket, index) => {
          const isCurrent = index === lastIndex;
          const labelled = !dense || index === peakIndex || index === lastIndex;
          return (
            <div
              key={bucket.startsAt}
              className="group relative flex flex-1 flex-col items-center justify-end"
              style={{ height: "100%" }}
            >
              {labelled && bucket.hours > 0 && (
                <span className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums text-white">
                  {formatHours(bucket.hours)}
                  {isCurrent && <span className="h-2 w-2 rounded-full bg-[#34D399]" title="Current week" />}
                </span>
              )}
              <div
                className={`w-full max-w-[72px] rounded-t-lg transition-all ${
                  isCurrent
                    ? "bg-gradient-to-t from-[#6C4EFF] to-[#C8BFFF] shadow-[0_0_15px_rgba(108,78,255,0.4)]"
                    : "bg-gradient-to-t from-[#483599] to-[#6C4EFF]"
                } ${bucket.hours === 0 ? "opacity-25" : ""}`}
                style={{
                  height: bucket.hours === 0 ? 3 : Math.max(12, (bucket.hours / peak) * 150),
                }}
              />
              {/* Hover carries every figure the labels had to drop. */}
              <div
                className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md
                           bg-black/90 px-2 py-1 text-[11px] text-gray-100 shadow-lg group-hover:block"
                role="tooltip"
              >
                <span className="font-medium">{bucket.label}</span>
                <span className="text-gray-400"> · </span>
                {formatHours(bucket.hours)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-[2px] border-t border-[#2F2845] pt-3">
        {buckets.map((bucket, index) => (
          <div key={bucket.startsAt} className="flex-1 overflow-hidden text-center">
            {index % labelEvery === 0 && (
              <span className="text-xs font-medium text-[#C9C4D9]">
                {bucket.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
