import React, { useState } from "react";
import { Building2, MapPin, Clock, MoreHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="rounded-xl border border-white/10 bg-[#2a1f3d] p-5">
        <h2 className="mb-3 text-base font-semibold text-white">
          Churches
          <span className="ml-2 text-sm font-normal text-gray-400">
            {branches.length}
            {pendingInvites.length > 0 && ` · ${pendingInvites.length} pending`}
          </span>
        </h2>
        <div className="space-y-2">
          {ordered.map((branch) => (
            <div
              key={branch.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#8356F3]/20">
                <Building2 className="h-4 w-4 text-[#b89bff]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-white">{branch.name}</span>
                  {branch.isParent && (
                    <span className="shrink-0 rounded-full bg-[#8356F3]/20 px-2 py-0.5 text-[11px] text-[#b89bff]">
                      Main church
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
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
                  className="text-gray-400 hover:bg-red-500/10 hover:text-red-300"
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
              className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-white/15 p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/5">
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-gray-300">
                    {invite.method === "email" ? invite.email : invite.code}
                  </span>
                  <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-gray-400">
                    Invited
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  Holding a slot · expires {new Date(invite.expiresAt).toLocaleDateString()}
                </p>
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:bg-red-500/10 hover:text-red-300"
                  disabled={busyId === invite.id}
                  onClick={() => onRevokeInvite(invite)}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  {busyId === invite.id ? "Withdrawing…" : "Withdraw"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={!!confirming} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent className="border-white/10 bg-[#1f1438] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {confirming?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              It leaves this account and goes back to its own free plan. Its songs,
              presentations and services stay with it — nothing is deleted — and the
              slot it held becomes available. You can invite it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-white hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#8356F3] text-white hover:bg-[#7245e2]"
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
