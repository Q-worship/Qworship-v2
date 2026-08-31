/** Derives a real, per-referee referral code and link from the authenticated user, replacing the wireframe's hardcoded "QW-DM482" prototype value. */
type ReferralUser = { id?: string; firstName?: string; email?: string } | null | undefined;

export function getReferralCode(user: ReferralUser): string {
  const seed = user?.id || user?.email || "REFERRER";
  const suffix = seed.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() || "000000";
  const initial = (user?.firstName?.[0] || "Q").toUpperCase();
  return `QW-${initial}${suffix}`;
}

export function getReferralLink(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://qworship.com";
  return `${origin}/refer-and-earn/join?ref=${encodeURIComponent(code)}`;
}
