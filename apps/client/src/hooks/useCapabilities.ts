import { useQuery } from "@tanstack/react-query";
import { FEATURES, type FeatureId } from "@qworship/shared";
import { CAPABILITIES_KEY, fetchCapabilities, type Capabilities } from "@/lib/billingApi";

/**
 * What the signed-in church may do, for deciding what to lock.
 *
 * Read by the Live Console on nearly every screen, so it is cached hard: a
 * plan does not change while somebody is running a service, and refetching
 * it on every window focus would put a request behind every alt-tab during a
 * Sunday morning.
 *
 * The one moment it DOES change is a purchase, and the billing hooks
 * invalidate this key when that happens.
 */

/** Until the answer arrives, assume the church may do nothing premium. */
const ASSUME_FREE: Capabilities = {
  planId: "free",
  trialing: false,
  // Locking a control before the answer arrives costs nothing. REDIRECTING
  // before it arrives would throw somebody off the page they asked for, so
  // this one assumption has to point the other way.
  trialExpired: false,
  trialDaysLeft: 0,
  features: Object.fromEntries(
    Object.keys(FEATURES).map((id) => [id, false]),
  ) as Capabilities["features"],
};

/**
 * `enabled` exists for the route guard, which renders before we know whether
 * anybody is signed in: asking a protected endpoint on behalf of a visitor
 * would spend a 401 on every public page that happens to mount the guard.
 */
export function useCapabilities({ enabled = true }: { enabled?: boolean } = {}) {
  const query = useQuery({
    queryKey: CAPABILITIES_KEY,
    queryFn: fetchCapabilities,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled,
  });

  const capabilities = query.data?.capabilities ?? ASSUME_FREE;

  return {
    ...query,
    capabilities,
    /**
     * Whether one feature is available.
     *
     * While loading this answers false, so a control renders locked and then
     * unlocks. The other order — open, then snatched away a beat later — is
     * worse: somebody will have already pressed it.
     */
    can: (featureId: FeatureId) => capabilities.features[featureId] === true,
    isTrialing: capabilities.trialing,
    trialDaysLeft: capabilities.trialDaysLeft,
    isFree: capabilities.planId === "free" && !capabilities.trialing,
    /**
     * Whether the trial has lapsed with nothing chosen yet.
     *
     * `isLoading` comes with it because the route guard must not act on the
     * placeholder above: no answer yet is not the same as "no trial has
     * expired", and the difference decides whether somebody keeps the page
     * they asked for.
     */
    trialExpired: capabilities.trialExpired,
  };
}

/**
 * One feature's availability, with the copy to explain it.
 *
 * Returns the catalog's blurb rather than letting each call site write its
 * own, so the same feature is described the same way wherever it is locked.
 */
export function useFeature(featureId: FeatureId) {
  const { can, isTrialing, trialDaysLeft } = useCapabilities();
  return {
    allowed: can(featureId),
    label: FEATURES[featureId].label,
    blurb: FEATURES[featureId].blurb,
    isTrialing,
    trialDaysLeft,
  };
}
