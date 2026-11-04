import React, { useState } from "react";
import { Network, Minus, Plus } from "lucide-react";
import { HOURS_PER_SLOT, SLOT_PRICE_USD, formatUsd } from "@qworship/shared";
import { Button } from "@/components/ui/button";

/**
 * Buying more church slots.
 *
 * Priced from the catalog at {SLOT_PRICE_USD} a month per church. The design
 * quoted ₦15,000 per node, which is neither the currency we settle in nor a
 * conversion of our price — everything here is billed in USD through Stripe,
 * with the customer's own currency presented at checkout by Adaptive Pricing.
 *
 * The line about hours is the important one: each new church brings its own
 * {HOURS_PER_SLOT}, rather than enlarging a shared pool.
 */
export const AddBranchCard: React.FC<{
  currentSlots: number;
  minimumSlots: number;
  canManage: boolean;
  busy: boolean;
  onAdd: (totalSlots: number) => void;
}> = ({ currentSlots, minimumSlots, canManage, busy, onAdd }) => {
  // The stepper counts TOTAL churches, not churches added. It used to count
  // additions and could only go up, so a church that removed a branch had no
  // way to stop paying for the slot it had freed.
  const [total, setTotal] = useState(currentSlots);
  const change = total - currentSlots;

  return (
    <section className="rounded-xl bg-account-card p-6 lg:max-w-[560px]">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#8356F3]/20 text-[#a98bff]">
        <Network className="h-[18px] w-[18px]" aria-hidden />
      </span>

      <h3 className="mt-6 text-xl font-semibold text-white">Church slots</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-400">
        Add another campus or branch to your subscription with the same privileges — and its own{" "}
        {HOURS_PER_SLOT} hands-free Bible hours a month, which no other branch can spend.
      </p>

      <div className="mt-6 flex items-baseline gap-2">
        <span className="text-[28px] font-semibold leading-none text-white">
          +{formatUsd(SLOT_PRICE_USD)}
        </span>
        <span className="text-sm text-gray-500">/ church / month</span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-account-field p-1">
          <StepButton
            label="One fewer church"
            onClick={() => setTotal((n) => Math.max(minimumSlots, n - 1))}
            disabled={busy || total <= minimumSlots}
          >
            <Minus className="h-4 w-4" />
          </StepButton>
          <span className="w-10 text-center text-sm font-medium tabular-nums text-white">
            {total}
          </span>
          <StepButton
            label="One more church"
            onClick={() => setTotal((n) => Math.min(100, n + 1))}
            disabled={busy || total >= 100}
          >
            <Plus className="h-4 w-4" />
          </StepButton>
        </div>

        <Button
          className="bg-[#8356F3] text-white hover:bg-[#7245e2] disabled:opacity-40"
          disabled={busy || !canManage || change === 0}
          onClick={() => onAdd(Math.max(minimumSlots, total))}
        >
          {busy
            ? "Working…"
            : change > 0
              ? `Add ${change} ${change === 1 ? "church" : "churches"}`
              : `Remove ${-change} ${-change === 1 ? "church" : "churches"}`}
        </Button>
      </div>

      {/* Both the before and the after, because the charge is for the whole
          subscription rather than the change. */}
      <p className="mt-4 text-xs text-gray-500">
        {currentSlots} {currentSlots === 1 ? "slot" : "slots"} today → {total} after this,{" "}
        {formatUsd(SLOT_PRICE_USD * currentSlots)} → {formatUsd(SLOT_PRICE_USD * total)} a month.
        {change < 0 && " You are credited for the part of the month you have already paid for."}
      </p>

      {total === minimumSlots && minimumSlots > 1 && (
        // Explain the floor rather than just greying the button out.
        <p className="mt-2 text-xs text-gray-500">
          You cannot go below {minimumSlots} while that many churches and open invitations need a
          slot. Remove one first.
        </p>
      )}

      {!canManage && (
        <p className="mt-2 text-xs text-gray-500">Only an owner or admin can add churches.</p>
      )}
    </section>
  );
};

const StepButton: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, disabled, children }) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className="flex h-8 w-8 items-center justify-center rounded-md text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
  >
    {children}
  </button>
);
