import React, { useState } from "react";
import { Link } from "wouter";
import { useSubscription } from "@/hooks/useSubscription";
import {
  useBillingOverview, useCancelSubscription, usePurchaseTopUp, useStartSubscription,
} from "@/hooks/useBilling";
import { TabSkeleton, EmptyState } from "./BillingPrimitives";
import { PlanDetailsStrip } from "./PlanDetailsStrip";
import { BillingIntervalToggle } from "./BillingIntervalToggle";
import { GiftSubscriptionCard } from "./GiftSubscriptionCard";
import { PlanOptionCards } from "./PlanOptionCards";
import { AddBranchCard } from "./AddBranchCard";
import { TopUpPacks } from "./TopUpPacks";

/**
 * The Plans tab: what this account is on, what it could be on, and how to buy
 * more of either churches or hours.
 *
 * An orchestrator only — it owns the data and the mutations, and each section
 * below is presentational. The tab got long enough in the updated design that
 * keeping it in one file would have reproduced the 943-line page this whole
 * rework replaced.
 *
 * The billing interval is held here rather than in the toggle, because three
 * things depend on it — the price on the cards, the saving on the toggle, and
 * what Checkout is asked to bill — and they must not be able to disagree.
 */
export const BillingPlansTab: React.FC = () => {
  const { overview, canManage, isLoading, isError, error } = useBillingOverview();
  const { subscription } = useSubscription();

  const startSubscription = useStartSubscription();
  const cancelSubscription = useCancelSubscription();
  const purchaseTopUp = usePurchaseTopUp();
  const busy =
    startSubscription.isPending || cancelSubscription.isPending || purchaseTopUp.isPending;

  const [interval, setInterval] = useState<"month" | "year">("month");

  if (isLoading) return <TabSkeleton rows={3} />;
  if (isError || !overview) {
    return (
      <EmptyState
        title="Could not load your plan"
        body={error instanceof Error ? error.message : "Please refresh and try again."}
      />
    );
  }

  // Churches already spoken for set the floor a downgrade cannot go below.
  const minimumSlots = Math.max(1, subscription?.slots.used ?? 1);
  const currentSlots = Math.max(1, overview.slotsTotal || 1);

  return (
    <div className="space-y-16">
      <section>
        <SectionHeading>Plan details</SectionHeading>
        <div className="mt-6">
          <PlanDetailsStrip overview={overview} />
        </div>
      </section>

      <section>
        <SectionHeading>Plan options</SectionHeading>
        <div className="mt-6">
          <BillingIntervalToggle
            interval={interval}
            slots={currentSlots}
            onChange={setInterval}
            disabled={busy}
          />
        </div>
        <div className="mt-8">
          <PlanOptionCards
            interval={interval}
            currentPlanId={overview.planId}
            canManage={canManage}
            busy={busy}
            onChoosePaid={() =>
              startSubscription.mutate({
                slots: Math.max(currentSlots, minimumSlots),
                interval,
              })
            }
            onChooseFree={() => cancelSubscription.mutate()}
          />
        </div>
      </section>

      <section>
        <SectionHeading>Add branches to your church or organisation</SectionHeading>
        <div className="mt-6">
          {overview.planId === "standard" ? (
            <AddBranchCard
              currentSlots={currentSlots}
              minimumSlots={minimumSlots}
              canManage={canManage}
              busy={busy}
              onAdd={(total) => startSubscription.mutate({ slots: total, interval })}
            />
          ) : (
            // Free holds exactly one church, so there is nothing to add to.
            <p className="rounded-xl bg-account-card p-6 text-sm text-gray-400">
              Branches are part of Standard. Choose Standard above, and you can add a church for
              $15.99 a month each.
            </p>
          )}
        </div>
      </section>

      <section>
        <SectionHeading>Pay as you go top-up packs</SectionHeading>
        <p className="mt-2 max-w-[640px] text-sm text-gray-400">
          Extra hours for a Sunday that runs long. They belong to the church you buy them for and
          expire at the end of the month.
        </p>
        <div className="mt-6">
          <TopUpPacks
            branches={overview.branches}
            canManage={canManage}
            busy={busy}
            onBuy={(organizationId, hours) => purchaseTopUp.mutate({ organizationId, hours })}
          />
        </div>
      </section>

      <section>
        <SectionHeading>Gift Q-worship to a church that needs it</SectionHeading>
        <div className="mt-6">
          <GiftSubscriptionCard canManage={canManage} />
        </div>
      </section>

      {!canManage && (
        <p className="text-xs text-gray-500">
          Only an owner or admin can change the plan or buy hours.{" "}
          <Link
            href="/dashboard-profile/organization"
            className="underline underline-offset-4 hover:text-white"
          >
            See who is on this account
          </Link>
          .
        </p>
      )}
    </div>
  );
};

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-[22px] font-semibold text-[#8356F3]">{children}</h2>
);
