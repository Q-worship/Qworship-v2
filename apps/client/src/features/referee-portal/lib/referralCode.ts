/** Prefers the real, server-issued referral code (persisted on the User document and backend-validated
 *  during onboarding); falls back to a derived value only if the account somehow doesn't have one yet. */
type ReferralUser = { id?: string; firstName?: string; email?: string; referralCode?: string } | null | undefined;

export function getReferralCode(user: ReferralUser): string {
  if (user?.referralCode) return user.referralCode;
  const seed = user?.id || user?.email || "REFERRER";
  const suffix = seed.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() || "000000";
  const initial = (user?.firstName?.[0] || "Q").toUpperCase();
  return `QW-${initial}${suffix}`;
}

export function getReferralLink(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://qworship.com";
  return `${origin}/refer-and-earn/join?ref=${encodeURIComponent(code)}`;
}
