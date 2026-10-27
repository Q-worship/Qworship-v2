import { apiRequest } from "@/lib/queryClient";

/**
 * The network endpoints. Kept in one module so the screens never assemble URLs
 * or response shapes themselves, and so a server change lands in one place.
 */

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

/** Reads the server's message rather than inventing one, so a refusal explains itself. */
async function unwrap<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || `Request failed (${res.status})`);
  }
  return body as T;
}

export async function fetchBranches(): Promise<BranchesResponse> {
  return unwrap<BranchesResponse>(await apiRequest("GET", "/api/branches"));
}

export async function fetchSubscription(): Promise<{ subscription: Subscription }> {
  return unwrap<{ subscription: Subscription }>(await apiRequest("GET", "/api/subscription"));
}

export async function createInvite(input: { method: "code" | "email"; email?: string }) {
  return unwrap<{ invite: PendingInvite; slots: SlotUsage }>(
    await apiRequest("POST", "/api/branches/invite", input),
  );
}

export async function revokeInvite(id: string) {
  return unwrap<{ slots: SlotUsage }>(
    await apiRequest("POST", `/api/branches/invite/${id}/revoke`),
  );
}

export async function acceptInvite(code: string) {
  return unwrap<{ joined: { id: string; name: string } }>(
    await apiRequest("POST", "/api/branches/accept", { code }),
  );
}

export async function removeBranch(id: string) {
  return unwrap<{ slots: SlotUsage }>(await apiRequest("DELETE", `/api/branches/${id}`));
}
