import { useState } from "react";
import { useLocation } from "wouter";
import { FEATURES, YEARLY_DISCOUNT, type FeatureId } from "@qworship/shared";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PlanOptionCards } from "@/components/plans/PlanOptionCards";
import { useCapabilities } from "@/hooks/useCapabilities";

/**
 * The plan chooser, opened from wherever a locked control was pressed.
 *
 * The same cards the billing screen shows, so a person who compares plans
 * here and then goes to billing is not shown two different products.
 *
 * It does NOT take payment. Choosing Standard sends them to the billing
 * screen, which owns the Stripe checkout — entitlements move only on the
 * signed webhook, and a second checkout entry point is a second place for
 * that to go wrong.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the person just tried to do, when we know. */
  reason: FeatureId | null;
}

export function PlanSelectionModal({ open, onOpenChange, reason }: Props) {
  const [, navigate] = useLocation();
  const { capabilities, isTrialing, trialDaysLeft } = useCapabilities();
  const [interval, setInterval] = useState<"month" | "year">("year");

  const goToBilling = () => {
    onOpenChange(false);
    navigate("/dashboard-subscription/plans");
  };

  const feature = reason ? FEATURES[reason] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl border-white/10 bg-account-bg p-0 text-white">
        <div className="max-h-[85vh] overflow-y-auto px-6 py-8 sm:px-10">
          <header className="mx-auto max-w-2xl text-center">
            {/*
              Lead with the thing they just wanted, when we know it. A generic
              "choose a plan" wastes the one moment the person has a concrete
              reason to care.
            */}
            {feature ? (
              <>
                <h2 className="text-2xl font-bold sm:text-3xl">{feature.label}</h2>
                <p className="mt-3 text-sm text-gray-300">{feature.blurb}</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Select a plan for{" "}
                  <span className="text-[#ff2d8a]">Q-worship Cloud</span>
                </h2>
                <p className="mt-3 text-sm text-gray-400">
                  Choose the plan that's right for your church.
                </p>
              </>
            )}

            {isTrialing && (
              <p className="mt-4 text-[13px] text-[#00d2b4]">
                You're on the free trial — {trialDaysLeft}{" "}
                {trialDaysLeft === 1 ? "day" : "days"} left.
              </p>
            )}

            <IntervalToggle interval={interval} onChange={setInterval} />
          </header>

          <div className="mt-10">
            <PlanOptionCards
              interval={interval}
              currentPlanId={capabilities.planId}
              // Anyone may look; only billing decides who may buy, and it
              // re-checks the role server-side when they get there.
              canManage
              busy={false}
              onChoosePaid={goToBilling}
              onChooseFree={() => onOpenChange(false)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Monthly or yearly, with the saving stated rather than implied. */
function IntervalToggle({
  interval,
  onChange,
}: {
  interval: "month" | "year";
  onChange: (next: "month" | "year") => void;
}) {
  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <div className="inline-flex rounded-lg bg-account-field p-1">
        {(["month", "year"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={
              option === interval
                ? "rounded-md bg-[#00d2b4] px-4 py-1.5 text-xs font-semibold text-[#06231f]"
                : "rounded-md px-4 py-1.5 text-xs font-medium text-gray-400 hover:text-white"
            }
          >
            {option === "month" ? "Monthly" : "Yearly"}
          </button>
        ))}
      </div>
      <span className="text-xs font-semibold text-[#ffb020]">
        {Math.round(YEARLY_DISCOUNT * 100)}% Discount
      </span>
    </div>
  );
}
