import React from "react";
import type { Granularity, RangePreset } from "@/lib/billingApi";

/**
 * The range and church pickers above the usage chart.
 *
 * Presets rather than a date picker by default: "last 30 days" is what a
 * church actually asks, and making them assemble it from two calendars to get
 * the common case is the wrong trade. Custom is there for the uncommon one.
 */

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom range" },
];

const selectClass =
  "rounded-lg border border-[#2F2845] bg-[#161124] px-3 py-1.5 text-xs text-[#CBCED5] outline-none " +
  "focus:ring-2 focus:ring-[#8356F3]/60";

export interface UsageControlsValue {
  range: RangePreset;
  granularity?: Granularity;
  from?: string;
  to?: string;
  organizationId?: string | null;
}

export const UsageRangeControls: React.FC<{
  value: UsageControlsValue;
  onChange: (next: UsageControlsValue) => void;
  churches: { id: string; name: string }[];
  /** Offered only where it means something — a church with Sundays to compare. */
  allowSundays?: boolean;
}> = ({ value, onChange, churches, allowSundays }) => {
  const set = (patch: Partial<UsageControlsValue>) => onChange({ ...value, ...patch });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="usage-range">Date range</label>
      <select
        id="usage-range"
        className={selectClass}
        value={value.range}
        onChange={(e) => set({ range: e.target.value as RangePreset })}
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      {value.range === "custom" && (
        <>
          <input
            type="date"
            aria-label="From"
            className={selectClass}
            value={value.from ?? ""}
            max={value.to || today}
            onChange={(e) => set({ from: e.target.value })}
          />
          <span className="text-xs text-gray-500">to</span>
          <input
            type="date"
            aria-label="To"
            className={selectClass}
            value={value.to ?? ""}
            min={value.from || undefined}
            max={today}
            onChange={(e) => set({ to: e.target.value })}
          />
        </>
      )}

      {allowSundays && (
        <select
          aria-label="Group by"
          className={selectClass}
          value={value.granularity ?? "auto"}
          onChange={(e) =>
            set({ granularity: e.target.value === "auto" ? undefined : (e.target.value as Granularity) })
          }
        >
          <option value="auto">Group automatically</option>
          <option value="day">By day</option>
          <option value="sunday">Sunday to Sunday</option>
          <option value="month">By month</option>
        </select>
      )}

      {/* Only worth showing to a network: one church has nothing to filter. */}
      {churches.length > 1 && (
        <select
          aria-label="Church"
          className={selectClass}
          value={value.organizationId ?? ""}
          onChange={(e) => set({ organizationId: e.target.value || null })}
        >
          <option value="">All branches</option>
          {churches.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
    </div>
  );
};
