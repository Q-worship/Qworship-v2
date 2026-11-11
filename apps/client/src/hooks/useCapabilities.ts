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
  trialDaysLeft: 0,
  features: Object.fromEntries(
    Object.keys(FEATURES).map((id) => [id, false]),
  ) as Capabilities["features"],
};

export function useCapabilities() {
  const query = useQuery({
    queryKey: CAPABILITIES_KEY,
    queryFn: fetchCapabilities,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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
