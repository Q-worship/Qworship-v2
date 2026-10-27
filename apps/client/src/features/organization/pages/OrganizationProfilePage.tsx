import React, { useState } from "react";
import { Plus, Network, AlertCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CapacityMeters } from "../components/CapacityMeters";
import { BranchList } from "../components/BranchList";
import { InviteBranchDialog } from "../components/InviteBranchDialog";
import { JoinNetworkCard } from "../components/JoinNetworkCard";
import {
  fetchBranches, fetchSubscription, removeBranch, revokeInvite,
  type Branch, type PendingInvite,
} from "../api";

/**
 * The network at a glance: what the account holds, which churches are on it,
 * and what capacity is left.
 */
export const OrganizationProfilePage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const branchesQuery = useQuery({ queryKey: ["/api/branches"], queryFn: fetchBranches });
  const subscriptionQuery = useQuery({ queryKey: ["/api/subscription"], queryFn: fetchSubscription });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
    queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
  };

  const subscription = subscriptionQuery.data?.subscription;
  const data = branchesQuery.data;
  // Only an owner or admin changes the shape of the network.
  const canManage = subscription?.role === "owner" || subscription?.role === "admin";

  const handleRemoveBranch = async (branch: Branch) => {
    setBusyId(branch.id);
    try {
      await removeBranch(branch.id);
      toast({ title: "Church removed", description: `${branch.name} is back on its own plan.` });
      refresh();
    } catch (error: any) {
      toast({ title: "Could not remove", description: error.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleRevokeInvite = async (invite: PendingInvite) => {
    setBusyId(invite.id);
    try {
      await revokeInvite(invite.id);
      toast({ title: "Invitation withdrawn", description: "The slot it held is available again." });
      refresh();
    } catch (error: any) {
      toast({ title: "Could not withdraw", description: error.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  if (branchesQuery.isLoading || subscriptionQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const error = branchesQuery.error || subscriptionQuery.error;
  if (error || !data || !subscription) {
    return (
      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
        <Card>
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">Could not load your network</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {(error as Error)?.message || "Something went wrong."}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={refresh}>
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSingleChurch = data.branches.length <= 1 && data.pendingInvites.length === 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Network className="h-5 w-5 text-muted-foreground" />
            Your churches
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {subscription.planId === "free"
              ? "You are on the Free plan, which covers one church."
              : `Standard plan · ${subscription.packs} ${subscription.packs === 1 ? "pack" : "packs"} · $${subscription.monthlyPrice.toFixed(2)} a month`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {subscription.status !== "active" && (
            <Badge variant="destructive" className="capitalize">
              {subscription.status.replace("_", " ")}
            </Badge>
          )}
          {canManage && (
            <Button onClick={() => setInviteOpen(true)} disabled={subscription.slots.available < 1}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add a church
            </Button>
          )}
        </div>
      </div>

      <CapacityMeters slots={data.slots} hours={subscription.hours} />

      {/* On the free plan the meters tell the whole story, so lead with the offer. */}
      {subscription.planId === "free" && (
        <Card className="border-dashed">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div>
              <p className="font-medium">Add branch churches</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                The Standard plan covers ten churches for $15.99 a month, with pooled
                hands-free Bible hours across all of them.
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href="/dashboard-subscription">See plans</a>
            </Button>
          </CardContent>
        </Card>
      )}

      <BranchList
        branches={data.branches}
        pendingInvites={data.pendingInvites}
        canManage={!!canManage}
        onRemoveBranch={handleRemoveBranch}
        onRevokeInvite={handleRevokeInvite}
        busyId={busyId}
      />

      {/* A church with no branches of its own may be looking to join someone else's. */}
      {isSingleChurch && <JoinNetworkCard onJoined={refresh} />}

      <InviteBranchDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={refresh}
        slotsAvailable={data.slots.available}
      />
    </div>
  );
};

export default OrganizationProfilePage;
