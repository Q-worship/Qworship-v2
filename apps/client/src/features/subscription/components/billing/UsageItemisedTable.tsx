import React from "react";
import { formatHours } from "@qworship/shared";
import type { UsageSeries } from "@/lib/billingApi";
import { TableScroll, EmptyState, Meter } from "./BillingPrimitives";

/**
 * Usage itemised by day, or Sunday by Sunday.
 *
 * What a church WITHOUT branches sees in place of the per-branch table. That
 * table is built to compare churches, so on a single-church account it renders
 * exactly one row and answers nothing. The same space spent on "which days did
 * we actually use this, and for how long" is worth something.
 *
 * Newest first: the question is almost always about the service just gone.
 */
export const UsageItemisedTable: React.FC<{ series: UsageSeries; allowanceHours?: number }> = ({
  series,
  allowanceHours,
}) => {
  const rows = [...series.buckets].reverse();
  const used = rows.filter((r) => r.hours > 0);

  if (used.length === 0) {
    return (
      <EmptyState
        title="Nothing in this range"
        body="Pick a wider range, or start a hands-free Bible session to see it itemised here."
      />
    );
  }

  const peak = Math.max(...rows.map((r) => r.hours));
  const quiet = rows.length - used.length;

  return (
    <>
      <TableScroll>
        <table className="w-full min-w-[420px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-gray-500">
              <th className="pb-3 pr-4 font-medium">
                {series.granularity === "sunday" ? "Sunday" : series.granularity === "month" ? "Month" : "Day"}
              </th>
              <th className="pb-3 pr-4 font-medium">Hours</th>
              <th className="pb-3 font-medium">Share of the range</th>
            </tr>
          </thead>
          <tbody>
            {/* Only the buckets with something in them: a month of empty rows
                buries the four that matter. The quiet count is stated below. */}
            {used.map((row) => (
              <tr key={row.startsAt} className="border-b border-white/5 last:border-0">
                <td className="py-3 pr-4 text-sm text-gray-200">{row.label}</td>
                <td className="py-3 pr-4 text-sm tabular-nums text-gray-300">
                  {formatHours(row.hours)}
                </td>
                <td className="w-1/2 py-3">
                  <Meter percent={Math.round((row.hours / peak) * 100)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>

      <p className="mt-4 border-t border-white/10 pt-4 text-xs text-gray-500">
        {formatHours(series.totalHours)} across {used.length}{" "}
        {series.granularity === "sunday" ? "Sundays" : series.granularity === "month" ? "months" : "days"} with usage
        {quiet > 0 && `, and ${quiet} with none`}.
        {series.sundaysWithUsage > 0 && (
          <> Average Sunday run: {formatHours(series.averageSundayHours)} per service.</>
        )}
        {typeof allowanceHours === "number" && (
          <> This church's allowance is {formatHours(allowanceHours)} a month.</>
        )}
      </p>
    </>
  );
};
