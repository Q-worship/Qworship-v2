import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/accountApi";

/**
 * One plan from the server's catalog. Nothing here is hardcoded: the name,
 * price, limits and feature list all come from the shared catalog, so a price
 * change is one edit rather than five.
 */

interface Props {
  plan: Plan;
  isCurrent: boolean;
  children?: React.ReactNode;
}

export const PlanCard: React.FC<Props> = ({ plan, isCurrent, children }) => (
  <div
    className={cn(
      "flex flex-col rounded-xl border bg-[#2a1f3d] p-5",
      isCurrent ? "border-[#8356F3] ring-1 ring-[#8356F3]/50" : "border-white/10",
    )}
  >
    <div className="flex flex-1 flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
          <p className="mt-1 text-sm text-gray-400">{plan.description}</p>
        </div>
        {isCurrent && (
          <span className="shrink-0 rounded-full bg-[#8356F3] px-2.5 py-0.5 text-[11px] font-medium text-white">
            Current
          </span>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tabular-nums text-white">
          ${plan.monthlyPrice.toFixed(2)}
        </span>
        <span className="text-sm text-gray-400">
          {plan.monthlyPrice === 0 ? "forever" : "a month"}
        </span>
      </div>

      <ul className="mt-4 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8356F3]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {children && <div className="mt-5">{children}</div>}
    </div>
  </div>
);
