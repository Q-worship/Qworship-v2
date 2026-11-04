import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  acceptInvite, createInvite, fetchBranches, removeBranch, revokeInvite,
} from "@/lib/accountApi";
import { BILLING_OVERVIEW_KEY } from "@/lib/billingApi";

/**
 * The churches on an account, and the invitations holding slots open for more.
 *
 * Every mutation here moves a slot, so each one invalidates the branch list,
 * the subscription and the billing overview together. A pending invitation
 * occupies a slot exactly as a church does — that is the whole reason the two
 * are listed side by side rather than in separate places.
 */

const BRANCHES_KEY = ["/api/branches"] as const;
const SUBSCRIPTION_KEY = ["/api/subscription"] as const;

function useBranchRefresh() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: BRANCHES_KEY });
    queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
    queryClient.invalidateQueries({ queryKey: BILLING_OVERVIEW_KEY });
  };
}

export function useBranches() {
  const query = useQuery({ queryKey: BRANCHES_KEY, queryFn: fetchBranches });
  return {
    ...query,
    branches: query.data?.branches ?? [],
    pendingInvites: query.data?.pendingInvites ?? [],
    slots: query.data?.slots,
  };
}

/**
 * Opens an invitation for a church to join the network.
 *
 * The server refuses when no slot is free, naming how many are in use — that
 * refusal is the signal the caller turns into "buy another slot", so its
 * message is surfaced rather than replaced.
 */
export function useInviteBranch() {
  const refresh = useBranchRefresh();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: { method: "code" | "email"; email?: string }) => createInvite(input),
    onSuccess: (result) => {
      refresh();
      toast({
        title: "Invitation ready",
        description:
          result.invite.method === "code"
            ? "Share the code with the church you are adding."
            : `Sent to ${result.invite.email}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not invite that church",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useRevokeInvite() {
  const refresh = useBranchRefresh();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => revokeInvite(id),
    onSuccess: () => {
      refresh();
      toast({ title: "Invitation withdrawn", description: "The slot it held is free again." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not withdraw", description: error.message, variant: "destructive" });
    },
  });
}

/**
 * Removes a church from the network.
 *
 * It is not deleted — it returns to its own Free plan, keeping its songs,
 * media and people. The copy says so, because "remove" reads like deletion to
 * anyone who has not read the code.
 */
export function useRemoveBranch() {
  const refresh = useBranchRefresh();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => removeBranch(id),
    onSuccess: () => {
      refresh();
      toast({
        title: "Church removed",
        description: "It is back on its own Free plan. Nothing of theirs was deleted.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Could not remove", description: error.message, variant: "destructive" });
    },
  });
}

export function useAcceptInvite() {
  const refresh = useBranchRefresh();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (code: string) => acceptInvite(code),
    onSuccess: (result) => {
      refresh();
      toast({ title: "Joined", description: `You are now part of ${result.joined.name}.` });
    },
    onError: (error: Error) => {
      toast({ title: "Could not join", description: error.message, variant: "destructive" });
    },
  });
}
