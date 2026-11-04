import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { changePlan, fetchPlans, fetchSubscription } from "@/lib/accountApi";
import { BILLING_OVERVIEW_KEY } from "@/lib/billingApi";

/**
 * React Query bindings for the plan and its catalog.
 *
 * Changing a plan moves slots, hours and price at once, so it invalidates the
 * subscription, the branch list and the billing overview together. Leaving any
 * of those to a caller is how one screen shows the new plan while another
 * still shows the old price.
 */

const SUBSCRIPTION_KEY = ["/api/subscription"] as const;
const PLANS_KEY = ["/api/plans"] as const;
const BRANCHES_KEY = ["/api/branches"] as const;

export function usePlans() {
  const query = useQuery({ queryKey: PLANS_KEY, queryFn: fetchPlans });
  return { ...query, plans: query.data?.plans ?? [] };
}

export function useSubscription() {
  const query = useQuery({ queryKey: SUBSCRIPTION_KEY, queryFn: fetchSubscription });
  const subscription = query.data?.subscription;
  return {
    ...query,
    subscription,
    canManage: subscription?.role === "owner" || subscription?.role === "admin",
  };
}

export function useChangePlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: { planId: "free" | "standard"; slots: number }) =>
      changePlan(input.planId, input.slots),
    onSuccess: ({ subscription }) => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
      queryClient.invalidateQueries({ queryKey: BRANCHES_KEY });
      queryClient.invalidateQueries({ queryKey: BILLING_OVERVIEW_KEY });
      toast({
        title: "Plan updated",
        description:
          subscription.planId === "free"
            ? "You are on the Free plan."
            : `${subscription.slots.total} ${
                subscription.slots.total === 1 ? "church" : "churches"
              } for $${subscription.monthlyPrice.toFixed(2)} a month.`,
      });
    },
    onError: (error: Error) => {
      // A refused downgrade names how many churches to release; show that.
      toast({
        title: "Could not change plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
