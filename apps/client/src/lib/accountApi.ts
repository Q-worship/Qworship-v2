import { apiRequest } from "@/lib/queryClient";
import { request } from "@/lib/apiResult";

/**
 * The account, plan and network endpoints. Kept in one module outside any
 * feature so the organization and subscription screens can both use it without
 * importing from each other, which the folder guide forbids.
 */

export interface Plan {
  id: "free" | "standard";
  name: string;
  description: string;
  monthlyPrice: number;
  includedSlots: number;
  includedHours: number;
  canBuySlots: boolean;
  features: string[];
}

export interface SlotUsage {
  total: number;
  churches: number;
  pendingInvites: number;
  used: number;
  available: number;
}

export interface HourUsage {
  period: string;
  /** This church's own monthly allowance, before anything bought on top. */
  includedHours: number;
  /** Hours head office bought for this church, for this period only. */
  purchasedHours: number;
  /** What this church may spend: included plus purchased. Never a network total. */
  allowance: number;
  usedHours: number;
  remainingHours: number;
  percentUsed: number;
}

/** One church's hours, as head office sees it in the branch tables. */
export interface BranchHourUsage extends HourUsage {
  organizationId: string;
  name: string;
  /** Cloud storage this church is using, measured from its uploaded files. */
  storageUsedGb: number;
  storageLimitGb: number;
  storagePercentUsed: number;
}

export interface Branch {
  id: string;
  name: string;
  city?: string;
  country?: string;
  isParent: boolean;
  createdAt: string;
  hoursThisMonth: number;
}

export interface PendingInvite {
  id: string;
  method: "code" | "email";
  code?: string;
  email?: string;
  expiresAt: string;
  createdAt: string;
}

export interface BranchesResponse {
  parentId: string;
  branches: Branch[];
  pendingInvites: PendingInvite[];
  slots: SlotUsage;
}

export interface Subscription {
  planId: "free" | "standard";
  /** Church slots bought, one church each. Zero on the Free plan. */
  purchasedSlots: number;
  monthlyPrice: number;
  status: "active" | "trialing" | "past_due" | "cancelled";
  slots: SlotUsage;
  /** The CALLING church's own hours, not a network figure. */
  hours: HourUsage;
  /** Every church on the account with its own hours. Rows, never a sum. */
  branches: BranchHourUsage[];
  role: "owner" | "admin" | "member";
}

export async function fetchBranches(): Promise<BranchesResponse> {
  return request<BranchesResponse>(() => apiRequest("GET", "/api/branches"));
}

export async function fetchSubscription(): Promise<{ subscription: Subscription }> {
  return request<{ subscription: Subscription }>(() => apiRequest("GET", "/api/subscription"));
}

export async function createInvite(input: { method: "code" | "email"; email?: string }) {
  return request<{ invite: PendingInvite; slots: SlotUsage }>(() =>
    apiRequest("POST", "/api/branches/invite", input),
  );
}

export async function revokeInvite(id: string) {
  return request<{ slots: SlotUsage }>(() =>
    apiRequest("POST", `/api/branches/invite/${id}/revoke`),
  );
}

export async function acceptInvite(code: string) {
  return request<{ joined: { id: string; name: string } }>(() =>
    apiRequest("POST", "/api/branches/accept", { code }),
  );
}

export async function removeBranch(id: string) {
  return request<{ slots: SlotUsage }>(() => apiRequest("DELETE", `/api/branches/${id}`));
}

export async function fetchPlans(): Promise<{ plans: Plan[] }> {
  return request<{ plans: Plan[] }>(() => apiRequest("GET", "/api/plans"));
}

export async function changePlan(planId: "free" | "standard", slots = 1) {
  return request<{ subscription: Subscription }>(() =>
    apiRequest("POST", "/api/subscription/plan", { planId, slots }),
  );
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  status: string;
  method: string;
  invoice: string;
}

export async function fetchPaymentHistory(): Promise<PaymentRecord[]> {
  const res = await apiRequest("GET", "/api/payments/history");
  if (!res.ok) return [];
  return (await res.json().catch(() => [])) as PaymentRecord[];
}
