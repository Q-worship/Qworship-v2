import React from "react";
import { ShieldCheck, Zap } from "lucide-react";
import { OVERAGE_PRICE_PER_HOUR_USD, formatUsd, formatHours } from "@qworship/shared";
import type { BranchHourUsage } from "@/lib/accountApi";
import { CustomToggle } from "@/components/ui/custom-toggle";
import { usePreferences } from "@/hooks/useCurrentUser";
import { usePurchaseTopUp } from "@/hooks/useBilling";

/**
 * The guardrails pair: warnings on the left, a way out on the right.
 *
 * Both toggles are real preferences that change real behaviour — the 80% one
 * gates the low-hours, storage and payment notices; the peak one gates the
 * warning sent as a network's branches come online together; the buffer one
 * gates the prompt sent the moment a church runs out mid-service.
 *
 * NO CARD IS STORED by this system, so nothing here charges anything on its
 * own. What the buffer actually buys is time: the allowance guard already
 * keeps a running service on air through a grace window, and the buffer puts
 * a one-click top-up in the owner's hand while that window runs. The copy says
 * exactly that rather than implying a card on file.
 */

const EMERGENCY_HOURS = 5;

const Row: React.FC<{
  title: string;
  body: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}> = ({ title, body, checked, disabled, onChange }) => (
  <div className="flex items-start justify-between gap-4 rounded-xl bg-account-well p-4">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-gray-400">{body}</p>
    </div>
    <CustomToggle checked={checked} disabled={disabled} onCheckedChange={onChange} />
  </div>
);

const cardClass = "rounded-xl border border-[#8356F3]/40 bg-account-card p-5 sm:p-6";
const iconClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#8356F3]/25 text-[#c7b2ff]";

export const HfbHoursGuardrails: React.FC = () => {
  const { notifications, setNotification, saving } = usePreferences();

  return (
    <section className={cardClass}>
      <div className="flex items-center gap-2.5">
        <span className={iconClass}><ShieldCheck size={16} /></span>
        <h2 className="text-base font-semibold text-white">HFB Hours Guardrails</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-gray-400">
        Automated alerts dispatched to the account owner when approaching stream limits.
      </p>

      <div className="mt-5 space-y-3">
        <Row
          title="80% Usage Threshold Warning"
          body="Alerts the registered account owner at 80% of a church's hours, when storage is nearly full, and when a payment fails."
          checked={notifications.trial}
          disabled={saving}
          onChange={(v) => setNotification("trial", v)}
        />
        <Row
          title="Simultaneous Feed Peak Warning"
          body="Warn when branches reach 80% of their parallel Sunday streams."
          checked={notifications.streamPeak}
          disabled={saving}
          onChange={(v) => setNotification("streamPeak", v)}
        />
      </div>
    </section>
  );
};

export const EmergencySundayBuffer: React.FC<{
  /** The church the hours would be bought for. Hours are never account-wide. */
  church?: BranchHourUsage;
  isNetwork: boolean;
}> = ({ church, isNetwork }) => {
  const { notifications, setNotification, saving } = usePreferences();
  const purchase = usePurchaseTopUp();
  const price = EMERGENCY_HOURS * OVERAGE_PRICE_PER_HOUR_USD;

  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400">
            <Zap size={16} />
          </span>
          <h2 className="text-base font-semibold text-white">Emergency Sunday Buffer</h2>
        </div>
        <span className="rounded-lg border border-[#8356F3]/50 bg-[#8356F3]/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#c7b2ff]">
          Zero-downtime
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-gray-400">
        If a Sunday service hits 0 hrs mid-broadcast, it keeps running on a grace window while you
        add {EMERGENCY_HOURS} hours.
      </p>

      <div className="mt-5 space-y-3">
        <Row
          title={`Auto-Refill Buffer (${formatUsd(price)})`}
          body="Prompts you the moment a church runs out, while the service stays on air. No card is stored, so nothing is charged without you."
          checked={notifications.autoRefill}
          disabled={saving}
          onChange={(v) => setNotification("autoRefill", v)}
        />

        <button
          type="button"
          disabled={!church || purchase.isPending}
          onClick={() =>
            church && purchase.mutate({ organizationId: church.organizationId, hours: EMERGENCY_HOURS })
          }
          className="w-full rounded-xl bg-[#7C3AED] px-4 py-3.5 text-sm font-bold text-white shadow-lg
                     shadow-[#7C3AED]/30 transition-colors hover:bg-[#8B4DF0]
                     disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {purchase.isPending
            ? "Opening checkout…"
            : `1-Click Emergency Top-Up (+${EMERGENCY_HOURS} hrs / ${formatUsd(price)})`}
        </button>

        <p className="text-center text-[11px] leading-5 text-gray-500">
          {church ? (
            <>
              Billed at {formatUsd(OVERAGE_PRICE_PER_HOUR_USD)}/hr for {church.name} · Hours expire
              with the month and are not transferable
            </>
          ) : isNetwork ? (
            <>Choose a church above — hours are bought for one church, never for the network.</>
          ) : (
            <>No church to buy hours for yet.</>
          )}
        </p>
      </div>
    </section>
  );
};
