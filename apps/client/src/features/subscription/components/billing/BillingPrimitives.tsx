import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The small pieces every billing tab repeats: a stat tile, a meter, a table
 * frame, an empty state.
 *
 * Presentational only. They take resolved numbers and strings — no formatting
 * decisions and no data fetching — so the same tile can report hours, money or
 * branches without learning what any of those are.
 */

/**
 * 370x159 in the export: a 28px chip, a 17px label, then a 36px figure with
 * its qualifier set inline beside it rather than stacked beneath. Stacking the
 * caption was what pushed the first build's tiles to 192px.
 */
export const StatTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  caption?: string;
}> = ({ icon, label, value, caption }) => (
  <div className="min-h-[159px] rounded-xl bg-account-card px-6 pb-[21px] pt-[14px]">
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#8356F3]/20 text-[#a98bff]">
      {icon}
    </span>
    <div className="mt-3 text-[17px] font-medium leading-[23px] text-gray-400">{label}</div>
    <div className="mt-6 flex flex-wrap items-baseline gap-x-2">
      <span className="text-[36px] font-semibold leading-none text-white">{value}</span>
      {caption && <span className="text-[13px] text-gray-500">{caption}</span>}
    </div>
  </div>
);

/** A tinted bar. The shared Progress hardcodes bg-primary on its indicator. */
export const Meter: React.FC<{ percent: number; warn?: boolean }> = ({ percent, warn }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
    <div
      className={`h-full rounded-full transition-all ${warn ? "bg-amber-400" : "bg-[#8356F3]"}`}
      style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
    />
  </div>
);

export const Panel: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, action, children }) => (
  <section className="rounded-xl bg-account-card p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
      </div>
      {action}
    </div>
    <div className="mt-5">{children}</div>
  </section>
);

/** Tables stay wide and scroll; the page itself must never scroll sideways. */
export const TableScroll: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">{children}</div>
);

export const EmptyState: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="rounded-lg border border-dashed border-white/15 px-6 py-10 text-center">
    <p className="text-sm font-medium text-white">{title}</p>
    <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">{body}</p>
  </div>
);

export const TabSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-4">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-24 w-full bg-white/5" />
    ))}
  </div>
);

/**
 * A status pill.
 *
 * Unknown statuses fall through to neutral rather than throwing or rendering
 * blank — the processor can introduce one at any time.
 */
export const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const tone =
    status === "paid" || status === "active"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
      : status === "pending" || status === "trialing"
        ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
        : status === "failed" || status === "past_due" || status === "cancelled"
          ? "border-red-400/30 bg-red-400/10 text-red-300"
          : "border-white/15 bg-white/5 text-gray-300";

  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${tone}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
};
