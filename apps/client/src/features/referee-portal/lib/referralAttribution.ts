/** Bridges a referral click on the public /signup page through to the onboarding wizard
 *  (verify -> login -> onboarding is a multi-page journey, so sessionStorage — the same
 *  idiom already used for `verifyEmail`/`mock_signup_user` in authApi.ts — carries it). */
import { apiRequest } from "@/lib/queryClient";

const ATTRIBUTION_KEY = "qworship_referral_attribution";
const VISIT_TRACKED_PREFIX = "qworship_referral_visit_tracked:";

export interface ReferralAttribution {
  code: string;
  campaign?: string;
}

export function readStoredAttribution(): ReferralAttribution | null {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.code === "string" && parsed.code ? parsed : null;
  } catch {
    return null;
  }
}

/** Reads `?ref=`/`?campaign=` from the current URL, records one visit (deduped per
 *  browser session so a refresh doesn't inflate the count), and stores the attribution
 *  for the onboarding wizard to pick up later. Safe to call unconditionally on mount —
 *  no-ops cleanly when there's no `ref` param. */
export function captureAttributionFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("ref")?.trim();
  if (!code) return;

  const campaign = params.get("campaign")?.trim() || undefined;

  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({ code, campaign }));
  } catch {
    // sessionStorage unavailable (private mode, etc.) - attribution just won't prefill later.
  }

  const dedupeKey = `${VISIT_TRACKED_PREFIX}${code}:${campaign || ""}`;
  try {
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, "true");
  } catch {
    // If we can't dedupe, still fire once for this call rather than skip tracking entirely.
  }

  apiRequest("POST", "/api/referrals/track-visit", { code, campaign }).catch(() => {});
}
