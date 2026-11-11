import React from "react";
import { Check } from "lucide-react";
import {
  PLANS, formatUsd, slotPriceFor, yearlySavingUsd,
} from "@qworship/shared";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

/**
 * The three plan columns.
 *
 * Every figure AND every bullet is read from the catalog rather than written
 * here, on the usual rule that `plans.ts` is the only place a price or an
 * allowance is stated. The lists used to be retyped in this file, which is how
 * they came to claim six Bible versions and a storage figure the catalog had
 * since changed.
 *
 * Lives in components/ rather than in the billing feature because the Live
 * Console opens these same cards in a modal when somebody presses a locked
 * control, and a feature may not import from another feature.
 *
 * Enterprise carries no price and no entitlement — it is a contact card, so it
 * can sit here honestly without a plan existing behind it.
 */

interface Props {
  interval: "month" | "year";
  currentPlanId: "free" | "standard";
  canManage: boolean;
  busy: boolean;
  onChoosePaid: () => void;
  onChooseFree: () => void;
}

export const PlanOptionCards: React.FC<Props> = ({
  interval, currentPlanId, canManage, busy, onChoosePaid, onChooseFree,
}) => (
  <div className="grid gap-6 lg:grid-cols-3">
    <PlanColumn
      name="Free"
      blurb={PLANS.free.description}
      price="$0"
      cadence="/ month"
      note="Free forever · no card required"
      features={PLANS.free.features}
      action={
        <Button
          variant="outline"
          className="w-full border-white/15 bg-transparent text-white hover:bg-white/5 disabled:opacity-40"
          disabled={busy || !canManage || currentPlanId === "free"}
          onClick={onChooseFree}
        >
          {currentPlanId === "free" ? "Current plan" : "Downgrade to Free"}
        </Button>
      }
      current={currentPlanId === "free"}
    />

    <PlanColumn
      name="Standard"
      blurb={PLANS.standard.description}
      price={formatUsd(slotPriceFor(interval))}
      cadence={interval === "year" ? "/ church / year" : "/ church / month"}
      note={
        interval === "year"
          ? `Billed yearly · saves ${formatUsd(yearlySavingUsd(1))} a church`
          : "Billed monthly · cancel any time"
      }
      featuresHeading="Everything in Free, plus:"
      features={PLANS.standard.features}
      action={
        <Button
          className="w-full bg-[#8356F3] text-white hover:bg-[#7245e2] disabled:opacity-40"
          disabled={busy || !canManage}
          onClick={onChoosePaid}
        >
          {currentPlanId === "standard" ? "Change churches" : "Choose Standard"}
        </Button>
      }
      current={currentPlanId === "standard"}
    />

    <PlanColumn
      name="Enterprise"
      blurb="Large networks, dioceses, and multi-campus ministries."
      price="Custom"
      cadence=""
      note="Volume terms and tailored support"
      features={[
        "Everything in Standard",
        "Volume pricing across campuses",
        "Tailored onboarding and support",
      ]}
      action={
        <Button
          variant="outline"
          asChild
          className="w-full border-white/15 bg-transparent text-white hover:bg-white/5"
        >
          {/* A form, not a mailto. A mailto assumes a configured mail client,
            loses the enquiry if there is none, and leaves us nothing to
            follow up from. The form records it and books a call. */}
        <Link href="/enterprise-enquiry">Talk to sales</Link>
        </Button>
      }
    />
  </div>
);

const PlanColumn: React.FC<{
  name: string;
  blurb: string;
  price: string;
  cadence: string;
  note: string;
  featuresHeading?: string;
  features: readonly string[];
  action: React.ReactNode;
  current?: boolean;
}> = ({ name, blurb, price, cadence, note, featuresHeading, features, action, current }) => (
  // No border, highlighted or otherwise: the export separates a card from the
  // page by fill alone, and an outline here reads as a frame it does not have.
  // Standard still stands out — by its filled call to action, not a ring.
  <section className="flex flex-col rounded-xl bg-account-card">
    <header className="border-b border-white/10 p-6">
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-semibold text-white">{name}</h3>
        {current && (
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
            Current
          </span>
        )}
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-400">{blurb}</p>
      <div className="mt-6 flex items-baseline gap-2">
        <span className="text-[32px] font-semibold leading-none text-white">{price}</span>
        {cadence && <span className="text-sm text-gray-500">{cadence}</span>}
      </div>
      <p className="mt-2 text-[11px] text-gray-500">{note}</p>
    </header>

    <div className="flex flex-1 flex-col p-6">
      {featuresHeading && <p className="mb-4 text-[13px] text-gray-500">{featuresHeading}</p>}
      <ul className="space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-[13px] text-gray-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#a98bff]" aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 pt-2">{action}</div>
    </div>
  </section>
);
