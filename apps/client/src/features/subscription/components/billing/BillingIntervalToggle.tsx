import React from "react";
import { YEARLY_DISCOUNT, formatUsd, yearlySavingUsd } from "@qworship/shared";

/**
 * Monthly or yearly, with the saving stated in money rather than a percentage.
 *
 * "Save 10%" is what the design says, and it is true, but a church deciding
 * whether to commit for a year wants the figure it would keep. The percentage
 * stays beside it because that is the number people compare offers on.
 *
 * The saving scales with the slot count, so a network of six is told what six
 * churches save, not what one does.
 */
export const BillingIntervalToggle: React.FC<{
  interval: "month" | "year";
  slots: number;
  onChange: (interval: "month" | "year") => void;
  disabled?: boolean;
}> = ({ interval, slots, onChange, disabled }) => (
  <div className="flex flex-wrap items-center gap-5">
    <div
      role="radiogroup"
      aria-label="Billing period"
      className="inline-flex rounded-full border border-white/15 bg-account-field p-1"
    >
      {(["month", "year"] as const).map((value) => {
        const active = interval === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(value)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              active ? "bg-emerald-400 text-[#10231c]" : "text-gray-300 hover:text-white"
            }`}
          >
            {value === "month" ? "Monthly" : "Yearly"}
          </button>
        );
      })}
    </div>

    <p className="text-[15px] font-semibold text-white">
      Save {formatUsd(yearlySavingUsd(slots))} a year
      <span className="ml-2 font-normal text-gray-400">
        ({Math.round(YEARLY_DISCOUNT * 100)}% off{slots > 1 ? ` on ${slots} churches` : ""})
      </span>
    </p>
  </div>
);
