import React, { useState } from "react";
import { Building2, MapPin, Clock, MoreHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Branch, PendingInvite } from "@/lib/accountApi";

/**
 * The churches on this account, and any invitation still waiting.
 *
 * Pending invitations sit in the same list rather than a separate panel,
 * because they occupy slots exactly as a real church does — splitting them up
 * makes the slot count look wrong.
 */

interface Props {
  branches: Branch[];
  pendingInvites: PendingInvite[];
  canManage: boolean;
  onRemoveBranch: (branch: Branch) => void;
  onRevokeInvite: (invite: PendingInvite) => void;
  busyId?: string | null;
}

export const BranchList: React.FC<Props> = ({
  branches, pendingInvites, canManage, onRemoveBranch, onRevokeInvite, busyId,
}) => {
  const [confirming, setConfirming] = useState<Branch | null>(null);
  // Parent first, then branches alphabetically — a network reads top-down.
  const ordered = [...branches].sort((a, b) =>
    a.isParent === b.isParent ? a.name.localeCompare(b.name) : a.isParent ? -1 : 1,
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Churches
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {branches.length}
              {pendingInvites.length > 0 && ` · ${pendingInvites.length} pending`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ordered.map((branch) => (
            <div
              key={branch.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{branch.name}</span>
                  {branch.isParent && (
                    <Badge variant="secondary" className="shrink-0">Main church</Badge>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {(branch.city || branch.country) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[branch.city, branch.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {branch.hoursThisMonth < 1
                      ? `${Math.round(branch.hoursThisMonth * 60)} min`
                      : `${Number(branch.hoursThisMonth.toFixed(1))} hr`} this month
                  </span>
                </div>
              </div>
              {canManage && !branch.isParent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={busyId === branch.id}
                  onClick={() => setConfirming(branch)}
                >
                  {busyId === branch.id ? "Removing…" : "Remove"}
                </Button>
              )}
            </div>
          ))}

          {pendingInvites.map((invite) => (
            <div
              key={invite.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/50">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-muted-foreground">
                    {invite.method === "email" ? invite.email : invite.code}
                  </span>
                  <Badge variant="outline" className="shrink-0">Invited</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Holding a slot · expires {new Date(invite.expiresAt).toLocaleDateString()}
                </p>
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={busyId === invite.id}
                  onClick={() => onRevokeInvite(invite)}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  {busyId === invite.id ? "Withdrawing…" : "Withdraw"}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirming} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {confirming?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It leaves this account and goes back to its own free plan. Its songs,
              presentations and services stay with it — nothing is deleted — and the
              slot it held becomes available. You can invite it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirming) onRemoveBranch(confirming); setConfirming(null); }}
            >
              Remove church
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
