import React from "react";
import { Church, Clock, AlertTriangle } from "lucide-react";
import type { SlotUsage, HourUsage } from "@/lib/accountApi";

/**
 * The two limits a church actually runs into: slots across the network, and
 * this church's own transcription hours. Both are shown as what is left rather
 * than what is spent — the question anyone opening this page has is "can I add
 * another church" or "can I get through Sunday", not "what percentage have I
 * consumed".
 *
 * The hours meter is deliberately ONE church's. Hours do not pool: a branch
 * spends what it was bought and nothing else, so a network-wide figure here
 * would tell a branch nothing about whether it can start a service.
 */

interface Props {
  slots: SlotUsage;
  hours: HourUsage;
}

/** A tinted bar. The shared Progress hardcodes bg-primary on its indicator. */
const Meter: React.FC<{ percent: number; warn?: boolean }> = ({ percent, warn }) => (
  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
    <div
      className={`h-full rounded-full transition-all ${warn ? "bg-amber-400" : "bg-[#8356F3]"}`}
      style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
    />
  </div>
);

export const CapacityMeters: React.FC<Props> = ({ slots, hours }) => {
  const slotPercent = slots.total > 0 ? (slots.used / slots.total) * 100 : 0;
  const slotsTight = slots.available === 0;
  const hoursTight = hours.percentUsed >= 80;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl bg-account-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
            <Church className="h-4 w-4" />
            Churches
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold leading-none text-white">{slots.available}</div>
            <div className="mt-1 text-xs text-gray-500">available</div>
          </div>
        </div>
        <Meter percent={slotPercent} warn={slotsTight} />
        <p className="mt-2 text-xs text-gray-400">
          {slots.churches} {slots.churches === 1 ? "church" : "churches"}
          {slots.pendingInvites > 0 && (
            <> and {slots.pendingInvites} pending {slots.pendingInvites === 1 ? "invitation" : "invitations"}</>
          )}{" "}
          of {slots.total}
        </p>
        {slots.pendingInvites > 0 && (
          // Worth saying plainly: people are surprised that an unanswered
          // invitation is still holding a place.
          <p className="mt-1 text-xs text-gray-500">
            A pending invitation holds a slot until it is accepted or withdrawn.
          </p>
        )}
        {slotsTight && (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-300">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            Every slot is in use. Buy another church slot, or remove a branch, to invite another church.
          </p>
        )}
      </div>

      <div className="rounded-xl bg-account-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
            <Clock className="h-4 w-4" />
            Hands-free Bible
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold leading-none text-white">
              {hours.remainingHours < 1
                ? `${Math.round(hours.remainingHours * 60)}m`
                : `${Number(hours.remainingHours.toFixed(1))}h`}
            </div>
            <div className="mt-1 text-xs text-gray-500">left this month</div>
          </div>
        </div>
        <Meter percent={hours.percentUsed} warn={hoursTight} />
        <p className="mt-2 text-xs text-gray-400">
          {Number(hours.usedHours.toFixed(1))} of {hours.allowance} hours used by this church
          {hours.purchasedHours > 0 && (
            <> — {hours.includedHours} included plus {hours.purchasedHours} bought this month</>
          )}
        </p>
        {hoursTight && (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-300">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            {hours.percentUsed >= 100
              ? "This church's hours are used up. Head office can buy more."
              : `${hours.percentUsed}% of this church's hours are used.`}
          </p>
        )}
      </div>
    </div>
  );
};
