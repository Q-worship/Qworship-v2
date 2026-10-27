import React from "react";
import { Church, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { SlotUsage, HourUsage } from "../api";

/**
 * The two limits a network actually runs into: churches, and pooled
 * transcription hours. Both are shown as what is left rather than what is
 * spent — the question anyone opening this page has is "can I add another
 * church", not "what percentage have I consumed".
 */

interface Props {
  slots: SlotUsage;
  hours: HourUsage;
}

export const CapacityMeters: React.FC<Props> = ({ slots, hours }) => {
  const slotPercent = slots.total > 0 ? Math.min(100, (slots.used / slots.total) * 100) : 0;
  const slotsTight = slots.available === 0;
  const hoursTight = hours.percentUsed >= 80;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Church className="h-4 w-4" />
              Churches
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold leading-none">
                {slots.available}
              </div>
              <div className="text-xs text-muted-foreground mt-1">available</div>
            </div>
          </div>
          <Progress value={slotPercent} className="mt-4 h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {slots.churches} {slots.churches === 1 ? "church" : "churches"}
            {slots.pendingInvites > 0 && (
              <> and {slots.pendingInvites} pending {slots.pendingInvites === 1 ? "invitation" : "invitations"}</>
            )}{" "}
            of {slots.total}
          </p>
          {slots.pendingInvites > 0 && (
            // Worth saying plainly: people are surprised that an unanswered
            // invitation is still holding a place.
            <p className="mt-1 text-xs text-muted-foreground">
              A pending invitation holds a slot until it is accepted or withdrawn.
            </p>
          )}
          {slotsTight && (
            <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
              Every slot is in use. Add a pack or remove a branch to invite another church.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Hands-free Bible
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold leading-none">
                {hours.remainingHours < 1
                  ? `${Math.round(hours.remainingHours * 60)}m`
                  : `${Number(hours.remainingHours.toFixed(1))}h`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">left this month</div>
            </div>
          </div>
          <Progress value={hours.percentUsed} className="mt-4 h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {Number(hours.usedHours.toFixed(1))} of {hours.allowance} hours used, shared across every church
          </p>
          {hoursTight && (
            <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
              {hours.percentUsed >= 100
                ? "This month's hours are used up."
                : `${hours.percentUsed}% of this month's hours are used.`}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
