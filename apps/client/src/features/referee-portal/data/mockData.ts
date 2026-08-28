/** Quiet Momentum data vocabulary: transparent lifecycle and financial states with clearly fictional prototype records. */
export type ReferralStatus = "Link visited" | "Interest received" | "Trial active" | "Getting set up" | "Trial complete" | "Active subscriber" | "Payment attention" | "Subscription ended";

export type ChurchRecord = {
  id: string;
  church: string;
  contact: string;
  city: string;
  country: string;
  status: ReferralStatus;
  plan: string;
  source: string;
  date: string;
  trialEnds?: string;
  nextStep: string;
  monthlyCommission: number;
};

export const referralCode = "QW-DM482";
export const referralLink = "https://qworship.com/r/QW-DM482";

export const churches: ChurchRecord[] = [
  { id: "new-life-centre", church: "New Life Worship Centre", contact: "Ruth A.", city: "Accra", country: "Ghana", status: "Active subscriber", plan: "Premium", source: "Referral link", date: "12 Jun 2026", nextStep: "Recurring commission active", monthlyCommission: 3.9 },
  { id: "grace-community", church: "Grace Community Chapel", contact: "Samuel K.", city: "Lagos", country: "Nigeria", status: "Trial active", plan: "Enterprise", source: "Direct introduction", date: "18 Aug 2026", trialEnds: "17 Sep 2026", nextStep: "Trial review in 22 days", monthlyCommission: 0 },
  { id: "city-hill", church: "City on a Hill Church", contact: "Martha N.", city: "Nairobi", country: "Kenya", status: "Getting set up", plan: "Premium", source: "Church tech event", date: "09 Aug 2026", trialEnds: "08 Sep 2026", nextStep: "Product onboarding in progress", monthlyCommission: 0 },
  { id: "redeemed-hope", church: "Redeemed Hope Assembly", contact: "David O.", city: "Abuja", country: "Nigeria", status: "Active subscriber", plan: "Starter", source: "Campaign: Summer demos", date: "02 May 2026", nextStep: "Recurring commission active", monthlyCommission: 2.7 },
  { id: "faith-tabernacle", church: "Faith Tabernacle", contact: "Lerato M.", city: "Johannesburg", country: "South Africa", status: "Trial complete", plan: "Premium", source: "Referral code", date: "27 Jun 2026", nextStep: "Awaiting first settled invoice", monthlyCommission: 0 },
  { id: "living-word", church: "Living Word Parish", contact: "Joseph B.", city: "Kumasi", country: "Ghana", status: "Interest received", plan: "Not selected", source: "Direct introduction", date: "21 Aug 2026", nextStep: "Q-Worship team will contact the church", monthlyCommission: 0 },
  { id: "new-covenant", church: "New Covenant House", contact: "Esther W.", city: "Cape Town", country: "South Africa", status: "Payment attention", plan: "Enterprise", source: "Referral link", date: "14 Mar 2026", nextStep: "Commission paused until payment resolves", monthlyCommission: 0 },
  { id: "kingdom-life", church: "Kingdom Life Fellowship", contact: "Peter A.", city: "Mombasa", country: "Kenya", status: "Subscription ended", plan: "Starter", source: "Referral code", date: "08 Jan 2026", nextStep: "No future commission", monthlyCommission: 0 },
];

export const earningsTrend = [
  { month: "Mar", earned: 31.4, forecast: 36.0 }, { month: "Apr", earned: 36.2, forecast: 40.0 },
  { month: "May", earned: 39.8, forecast: 43.0 }, { month: "Jun", earned: 42.1, forecast: 47.0 },
  { month: "Jul", earned: 45.6, forecast: 51.0 }, { month: "Aug", earned: 48.72, forecast: 56.4 },
];

export const ledger = [
  { id: "COM-3482", church: "New Life Worship Centre", event: "Premium renewal", date: "24 Aug 2026", gross: "$12.99", amount: "$3.90", state: "Pending", available: "31 Aug 2026" },
  { id: "COM-3471", church: "Redeemed Hope Assembly", event: "Starter renewal", date: "21 Aug 2026", gross: "$8.99", amount: "$2.70", state: "Available", available: "Now" },
  { id: "COM-3415", church: "Christ Harbour Church", event: "Enterprise renewal", date: "12 Aug 2026", gross: "$15.99", amount: "$4.80", state: "Available", available: "Now" },
  { id: "COM-3396", church: "Dominion Parish", event: "Premium renewal", date: "05 Aug 2026", gross: "$12.99", amount: "$3.90", state: "Paid", available: "Paid 15 Aug" },
  { id: "COM-3354", church: "House of Grace", event: "Premium refund", date: "29 Jul 2026", gross: "-$12.99", amount: "-$3.90", state: "Reversed", available: "Refund" },
];

export const payouts = [
  { id: "PAY-2026-008", amount: "$82.40", requested: "03 Aug 2026", completed: "06 Aug 2026", method: "Bank •••• 8142", status: "Paid" },
  { id: "PAY-2026-006", amount: "$67.80", requested: "02 Jun 2026", completed: "05 Jun 2026", method: "Bank •••• 8142", status: "Paid" },
  { id: "PAY-2026-004", amount: "$54.60", requested: "06 Apr 2026", completed: "10 Apr 2026", method: "Bank •••• 8142", status: "Paid" },
  { id: "PAY-2026-002", amount: "$48.20", requested: "09 Feb 2026", completed: "12 Feb 2026", method: "Bank •••• 8142", status: "Paid" },
];

export const funnel = [
  { label: "Link visits", value: 246, rate: "100%" },
  { label: "Interest received", value: 58, rate: "23.6%" },
  { label: "Trials started", value: 31, rate: "53.4%" },
  { label: "Paid churches", value: 18, rate: "58.1%" },
];

export const activities = [
  { title: "Grace Community Chapel started a trial", detail: "Enterprise · Nigeria", time: "2 hours ago", tone: "violet" },
  { title: "$3.90 commission moved to pending", detail: "New Life Worship Centre renewed Premium", time: "Yesterday", tone: "pink" },
  { title: "Living Word Parish was received", detail: "Q-Worship follow-up is queued", time: "21 Aug", tone: "green" },
];
