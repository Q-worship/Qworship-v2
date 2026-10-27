import { apiRequest } from "@/lib/queryClient";

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
  canBuyPacks: boolean;
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
  allowance: number;
  usedHours: number;
  remainingHours: number;
  percentUsed: number;
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
  packs: number;
  monthlyPrice: number;
  status: "active" | "trialing" | "past_due" | "cancelled";
  slots: SlotUsage;
  hours: HourUsage;
  role: "owner" | "admin" | "member";
}

/**
 * Reads the server's message rather than inventing one, so a refusal explains
 * itself — a blocked downgrade says how many churches to release.
 *
 * apiRequest throws on a non-2xx before returning, and its message is the raw
 * body prefixed with the status ("409: {\"success\":false,...}"). Left alone
 * that JSON lands in a toast, so it is unpacked back into the sentence the
 * server actually wrote.
 */
function readableError(error: unknown): Error {
  const raw = error instanceof Error ? error.message : String(error);
  const match = /^\d{3}:\s*(\{[\s\S]*\})$/.exec(raw.trim());
  if (match) {
    try {
      const body = JSON.parse(match[1]);
      if (typeof body?.message === "string") return new Error(body.message);
    } catch {
      // Not JSON after all; fall through to the raw text.
    }
  }
  return new Error(raw);
}

async function request<T>(fn: () => Promise<Response>): Promise<T> {
  let res: Response;
  try {
    res = await fn();
  } catch (error) {
    throw readableError(error);
  }
  const body = await res.json().catch(() => null);
  if (body?.success === false) throw new Error(body.message || "Request failed");
  return body as T;
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

export async function changePlan(planId: "free" | "standard", packs = 1) {
  return request<{ subscription: Subscription }>(() =>
    apiRequest("POST", "/api/subscription/plan", { planId, packs }),
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
