import React from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  <Card className={cn("flex flex-col", isCurrent && "border-primary ring-1 ring-primary")}>
    <CardContent className="flex flex-1 flex-col pt-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
        </div>
        {isCurrent && <Badge className="shrink-0">Current</Badge>}
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tabular-nums">
          ${plan.monthlyPrice.toFixed(2)}
        </span>
        <span className="text-sm text-muted-foreground">
          {plan.monthlyPrice === 0 ? "forever" : "a month"}
        </span>
      </div>

      <ul className="mt-4 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {children && <div className="mt-5">{children}</div>}
    </CardContent>
  </Card>
);
