import type { UsageQuery } from "@/lib/billingApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  BILLING_INVOICES_KEY,
  BILLING_OVERVIEW_KEY,
  BILLING_USAGE_KEY,
  fetchBillingOverview,
  fetchBillingUsage,
  cancelSubscription,
  fetchInvoices,
  openBillingPortal,
  purchaseTopUp,
  startSubscription,
  GIFTS_KEY,
  GIFT_OPTIONS_KEY,
  fetchGiftOptions,
  fetchGifts,
  purchaseGift,
  previewGift,
  redeemGift,
  continueOnFreePlan,
  CAPABILITIES_KEY,
} from "@/lib/billingApi";

/**
 * React Query bindings for the billing screens.
 *
 * The tabs share an account but not a query: each asks for what it renders, so
 * opening Overview does not pull four weeks of session history nobody looked
 * at. A top-up touches hours and money, so it invalidates all three.
 */

export function useBillingOverview() {
  const query = useQuery({ queryKey: BILLING_OVERVIEW_KEY, queryFn: fetchBillingOverview });
  return {
    ...query,
    overview: query.data?.overview,
    role: query.data?.role,
    canManage: query.data?.role === "owner" || query.data?.role === "admin",
  };
}

export function useBillingUsage(usage: UsageQuery = {}, weeks = 4) {
  const query = useQuery({
    // The range is part of the key, so switching to "last 90 days" fetches
    // rather than showing the previous range's bars under a new label.
    queryKey: [...BILLING_USAGE_KEY, weeks, usage],
    queryFn: () => fetchBillingUsage(usage, weeks),
    // Keeps the old chart on screen while the new range loads, instead of
    // collapsing the panel to a skeleton on every change of dropdown.
    placeholderData: (previous) => previous,
  });
  return {
    ...query,
    weeks: query.data?.weeks ?? [],
    series: query.data?.series,
    health: query.data?.health,
    churches: query.data?.churches ?? [],
    branches: query.data?.branches ?? [],
  };
}

export function useInvoices() {
  const query = useQuery({ queryKey: BILLING_INVOICES_KEY, queryFn: fetchInvoices });
  return {
    ...query,
    invoices: query.data?.invoices ?? [],
    subscriptionInvoicesAvailable: query.data?.subscriptionInvoicesAvailable ?? false,
  };
}

/**
 * Hands the browser to Stripe.
 *
 * A full-page assignment rather than a new tab: Checkout owns the next step,
 * and a popup here is the thing most likely to be blocked at the exact moment
 * somebody is trying to pay.
 */
function toCheckout(url: string) {
  window.location.assign(url);
}

export function usePurchaseTopUp() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: { organizationId: string; hours: number }) =>
      purchaseTopUp(input.organizationId, input.hours),
    // No cache invalidation: nothing has changed yet. The hours arrive when
    // Stripe's webhook says they were paid for, not when this call returns.
    onSuccess: (result) => toCheckout(result.checkoutUrl),
    onError: (error: Error) => {
      toast({
        title: "Could not start checkout",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Subscribing, or changing the church count on a live subscription.
 *
 * The first needs a card and leaves the page; the second is billed against the
 * card on file and stays, so this only invalidates in the second case.
 */
export function useStartSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: { slots: number; interval?: "month" | "year" }) =>
      startSubscription(input.slots, input.interval ?? "month"),
    onSuccess: (result) => {
      if (result.checkoutUrl) return toCheckout(result.checkoutUrl);
      queryClient.invalidateQueries({ queryKey: BILLING_OVERVIEW_KEY });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({
        title: "Plan updated",
        description: "Your churches have been updated and the difference billed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not update your plan",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => cancelSubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_OVERVIEW_KEY });
      toast({
        title: "Cancellation scheduled",
        description: "Your plan runs to the end of the period you have paid for.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Could not cancel", description: error.message, variant: "destructive" });
    },
  });
}

export function useBillingPortal() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => openBillingPortal(),
    onSuccess: (result) => toCheckout(result.portalUrl),
    onError: (error: Error) => {
      toast({
        title: "Could not open the billing portal",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}


/**
 * Gifting.
 *
 * Buying a gift leaves the page for Stripe, exactly like a top-up, and grants
 * nothing until the signed webhook confirms the payment. Redeeming happens on
 * our own server and changes the plan immediately, so it invalidates
 * everything that describes the plan.
 */
export function useGiftOptions() {
  const query = useQuery({ queryKey: GIFT_OPTIONS_KEY, queryFn: fetchGiftOptions });
  return { ...query, options: query.data?.options ?? [] };
}

export function useGifts() {
  const query = useQuery({ queryKey: GIFTS_KEY, queryFn: fetchGifts });
  return { ...query, gifts: query.data?.gifts ?? [] };
}

export function usePurchaseGift() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: purchaseGift,
    onSuccess: (result) => toCheckout(result.checkoutUrl),
    onError: (error: Error) => {
      toast({
        title: "Could not start checkout",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}

/** Looks a code up without claiming it, so the screen can describe the gift. */
export function usePreviewGift() {
  return useMutation({ mutationFn: (code: string) => previewGift(code) });
}

export function useRedeemGift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (code: string) => redeemGift(code),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: BILLING_OVERVIEW_KEY });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({ title: "Gift claimed", description: result.message, duration: 12000 });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not claim that gift",
        description: error.message || "Check the code and try again.",
        variant: "destructive",
      });
    },
  });
}

/**
 * "Continue with the free plan", from the trial-ended screen.
 *
 * Invalidates capabilities as well as the billing reads: the whole point of
 * the change is that premium controls must now render locked, and a stale
 * capability cache would leave them live until the next refetch.
 */
export function useContinueFree() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: continueOnFreePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAPABILITIES_KEY });
      queryClient.invalidateQueries({ queryKey: BILLING_OVERVIEW_KEY });
    },
  });
}
