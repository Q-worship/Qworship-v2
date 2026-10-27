import React, { useEffect, useState } from "react";
import { CreditCard, AlertCircle, Receipt, Info } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CapacityMeters } from "@/components/account/CapacityMeters";
import { PlanCard } from "../components/PlanCard";
import { PackStepper } from "../components/PackStepper";
import {
  fetchPlans, fetchSubscription, changePlan, fetchPaymentHistory,
} from "@/lib/accountApi";

const SLOTS_PER_PACK = 10;

/**
 * Plan, capacity and billing in one place.
 *
 * Replaces the hardcoded Essential/Professional/Enterprise cards at 15/29/49,
 * which matched neither the server nor the marketing page. Everything shown
 * here is read from the catalog.
 */
export const SubscriptionPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [draftPacks, setDraftPacks] = useState<number | null>(null);

  const plansQuery = useQuery({ queryKey: ["/api/plans"], queryFn: fetchPlans });
  const subQuery = useQuery({ queryKey: ["/api/subscription"], queryFn: fetchSubscription });
  const paymentsQuery = useQuery({ queryKey: ["/api/payments/history"], queryFn: fetchPaymentHistory });

  const subscription = subQuery.data?.subscription;

  // The stepper starts from what is actually owned, and resets when the server
  // confirms a change, so it never drifts from the truth.
  useEffect(() => {
    if (subscription && draftPacks === null) {
      setDraftPacks(Math.max(1, subscription.packs || 1));
    }
  }, [subscription, draftPacks]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
    queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
  };

  const apply = async (planId: "free" | "standard", packs: number) => {
    setBusy(true);
    try {
      const { subscription: next } = await changePlan(planId, packs);
      setDraftPacks(Math.max(1, next.packs || 1));
      toast({
        title: "Plan updated",
        description: planId === "free"
          ? "You are on the Free plan."
          : `${next.slots.total} churches for $${next.monthlyPrice.toFixed(2)} a month.`,
      });
      refresh();
    } catch (error: any) {
      // A refused downgrade names how many churches to release; show that.
      toast({ title: "Could not change plan", description: error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (plansQuery.isLoading || subQuery.isLoading || draftPacks === null) {
    return (
      <div className="min-h-full bg-[#1a0f2e] text-white">
        <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
          <Skeleton className="h-9 w-48 bg-white/5" />
          <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-36 bg-white/5" /><Skeleton className="h-36 bg-white/5" /></div>
          <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-72 bg-white/5" /><Skeleton className="h-72 bg-white/5" /></div>
        </div>
      </div>
    );
  }

  const error = plansQuery.error || subQuery.error;
  if (error || !subscription || !plansQuery.data) {
    return (
      <div className="min-h-full bg-[#1a0f2e] text-white">
        <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#2a1f3d] p-5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="font-medium text-white">Could not load your plan</p>
              <p className="mt-1 text-sm text-gray-400">
                {(error as Error)?.message || "Something went wrong."}
              </p>
              <Button variant="outline" size="sm" className="mt-3 border-white/10 bg-transparent text-white hover:bg-white/5" onClick={refresh}>Try again</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canManage = subscription.role === "owner" || subscription.role === "admin";
  // Slots already spoken for set the floor a downgrade cannot go below.
  const minimumPacks = Math.max(1, Math.ceil(subscription.slots.used / SLOTS_PER_PACK));
  const payments = paymentsQuery.data ?? [];

  return (
    <div className="min-h-full bg-[#1a0f2e] text-white"><div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <CreditCard className="h-5 w-5 text-[#b89bff]" />
            Plan and billing
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {subscription.planId === "free"
              ? "Free plan"
              : `Standard · ${subscription.packs} ${subscription.packs === 1 ? "pack" : "packs"} · $${subscription.monthlyPrice.toFixed(2)} a month`}
          </p>
        </div>
        {subscription.status !== "active" && (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] capitalize text-red-300">
            {subscription.status.replace("_", " ")}
          </span>
        )}
      </div>

      <CapacityMeters slots={subscription.slots} hours={subscription.hours} />

      <div className="grid gap-4 sm:grid-cols-2">
        {plansQuery.data.plans.map((plan) => {
          const isCurrent = plan.id === subscription.planId;
          return (
            <PlanCard key={plan.id} plan={plan} isCurrent={isCurrent}>
              {plan.id === "standard" ? (
                <div className="space-y-3">
                  {(isCurrent || canManage) && (
                    <PackStepper
                      packs={draftPacks}
                      onChange={setDraftPacks}
                      pricePerPack={plan.monthlyPrice}
                      slotsPerPack={plan.includedSlots}
                      minimumPacks={isCurrent ? minimumPacks : 1}
                      disabled={busy || !canManage}
                    />
                  )}
                  <Button
                    className="w-full bg-[#8356F3] text-white hover:bg-[#7245e2] disabled:opacity-40"
                    disabled={busy || !canManage || (isCurrent && draftPacks === subscription.packs)}
                    onClick={() => apply("standard", draftPacks)}
                  >
                    {busy
                      ? "Saving…"
                      : !isCurrent
                        ? "Switch to Standard"
                        : draftPacks === subscription.packs
                          ? "Current plan"
                          : draftPacks > subscription.packs
                            ? `Add ${draftPacks - subscription.packs} pack${draftPacks - subscription.packs === 1 ? "" : "s"}`
                            : `Reduce to ${draftPacks} pack${draftPacks === 1 ? "" : "s"}`}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-white/10 bg-transparent text-white hover:bg-white/5 disabled:opacity-40"
                  disabled={busy || !canManage || isCurrent}
                  onClick={() => apply("free", 0)}
                >
                  {isCurrent ? "Current plan" : "Switch to Free"}
                </Button>
              )}
            </PlanCard>
          );
        })}
      </div>

      {!canManage && (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Info className="h-4 w-4" />
          Only an owner or admin of this church can change the plan.
        </p>
      )}

      <div className="rounded-xl border border-white/10 bg-[#2a1f3d] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
          <Receipt className="h-4 w-4 text-gray-400" />
          Billing history
        </h2>
        <div>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-400">No payments yet.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                  <div>
                    <p className="font-medium text-white">${p.amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{p.date} · {p.method}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] capitalize text-emerald-300">
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
          {/* Said plainly rather than implied: no payment provider is wired yet. */}
          <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" />
            Card payments are not connected yet. Plan changes here adjust your
            capacity but do not charge anything.
          </p>
        </div>
      </div>
    </div></div>
  );
};

export default SubscriptionPage;
