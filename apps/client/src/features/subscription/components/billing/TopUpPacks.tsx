import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  OVERAGE_PRICE_PER_HOUR_USD, TOP_UP_VALID_DAYS, TOP_UP_PACKS, TOP_UP_PRESET_HOURS, formatUsd, topUpPrice,
} from "@qworship/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BranchHourUsage } from "@/lib/accountApi";

/**
 * Pay-as-you-go hour packs.
 *
 * Two departures from the design, both forced by how hours actually work here.
 *
 * Packs are sized in HOURS, not dollars. The design offered $2 / $5 / $10 for
 * 2.5 / 7 / 14 hours — implied rates of $0.71 to $0.80 against a catalog rate
 * of {OVERAGE_PRICE_PER_HOUR_USD}. Honouring the dollar figures would have
 * discounted extra hours by more than half as a side effect of a label.
 *
 * And every pack names a church. Hours are not transferable, so a purchase
 * with no destination is not a thing this system can carry out.
 */
export const TopUpPacks: React.FC<{
  branches: BranchHourUsage[];
  canManage: boolean;
  busy: boolean;
  onBuy: (organizationId: string, hours: number) => void;
}> = ({ branches, canManage, busy, onBuy }) => {
  // Default to whichever church is closest to running out — the one a person
  // opening this section is most likely here to rescue.
  const neediest = branches.reduce(
    (worst, b) => (b.percentUsed > (worst?.percentUsed ?? -1) ? b : worst),
    branches[0],
  );
  const [target, setTarget] = useState<string>(neediest?.organizationId ?? "");
  useEffect(() => {
    if (!target && neediest) setTarget(neediest.organizationId);
  }, [neediest, target]);

  const [customHours, setCustomHours] = useState(5);
  const chosen = branches.find((b) => b.organizationId === target);

  if (branches.length === 0) return null;

  return (
    <div className="space-y-6">
      {branches.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-account-card p-4">
          <label htmlFor="topup-church" className="text-sm text-gray-400">
            Buy hours for
          </label>
          <select
            id="topup-church"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="rounded-lg border border-white/15 bg-account-field px-3 py-2 text-sm text-white"
          >
            {branches.map((b) => (
              <option key={b.organizationId} value={b.organizationId}>
                {b.name} — {b.remainingHours.toFixed(1)} hr left
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {TOP_UP_PACKS.map((pack) => (
          <article key={pack.hours} className="flex flex-col rounded-xl bg-account-card">
            <header className="border-b border-white/10 p-6">
              <h3 className="text-xl font-semibold text-white">{pack.hours} extra hours</h3>
              <p className="mt-2 text-[13px] text-gray-400">{pack.label}</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-[32px] font-semibold leading-none text-white">
                  {formatUsd(topUpPrice(pack.hours))}
                </span>
                <span className="text-sm text-gray-500">one time</span>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                {formatUsd(OVERAGE_PRICE_PER_HOUR_USD)} an hour
              </p>
            </header>
            <div className="flex flex-1 flex-col p-6">
              <ul className="space-y-3">
                <Feature>{pack.hours} hours of transcription and hands-free Bible</Feature>
                <Feature>Goes to {chosen?.name ?? "the church you choose"} alone</Feature>
                <Feature>Valid for {TOP_UP_VALID_DAYS} days from purchase</Feature>
              </ul>
              <Button
                className="mt-8 w-full bg-[#8356F3] text-white hover:bg-[#7245e2] disabled:opacity-40"
                disabled={busy || !canManage || !target}
                onClick={() => onBuy(target, pack.hours)}
              >
                {busy ? "Opening checkout…" : `Buy for ${formatUsd(topUpPrice(pack.hours))}`}
              </Button>
            </div>
          </article>
        ))}
      </div>

      <article className="rounded-xl bg-account-card p-6 lg:max-w-[560px]">
        <h3 className="text-xl font-semibold text-white">Custom top-up</h3>
        <p className="mt-2 text-[13px] text-gray-400">
          Any number of hours, for a conference or an unusually heavy month.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Input
            type="number"
            min={1}
            max={100}
            value={customHours}
            onChange={(e) => setCustomHours(Math.round(Number(e.target.value)))}
            className="w-28 border-white/15 bg-account-field text-white"
            aria-label="Hours to buy"
          />
          <span className="text-sm text-gray-500">hours</span>
          <span className="text-lg font-semibold tabular-nums text-white">
            {customHours >= 1 && customHours <= 100 ? formatUsd(topUpPrice(customHours)) : "—"}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {TOP_UP_PRESET_HOURS.map((hours) => (
            <button
              key={hours}
              type="button"
              onClick={() => setCustomHours(hours)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                customHours === hours
                  ? "border-[#8356F3] bg-[#8356F3]/20 text-white"
                  : "border-white/15 text-gray-300 hover:bg-white/5"
              }`}
            >
              {hours} hr
            </button>
          ))}
        </div>

        <Button
          className="mt-6 w-full bg-[#8356F3] text-white hover:bg-[#7245e2] disabled:opacity-40 sm:w-auto sm:px-10"
          disabled={busy || !canManage || !target || customHours < 1 || customHours > 100}
          onClick={() => onBuy(target, customHours)}
        >
          {busy ? "Opening checkout…" : `Top up ${formatUsd(topUpPrice(customHours || 0))}`}
        </Button>
      </article>
    </div>
  );
};

const Feature: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-2.5 text-[13px] text-gray-300">
    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#a98bff]" aria-hidden />
    <span>{children}</span>
  </li>
);
