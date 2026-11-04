import React, { useMemo, useState } from "react";
import { Search, Plus, Network } from "lucide-react";
import { SLOT_PRICE_USD, formatUsd } from "@qworship/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBillingOverview } from "@/hooks/useBilling";
import { useBranches, useRemoveBranch, useRevokeInvite } from "@/hooks/useBranches";
import { TabSkeleton, EmptyState } from "./BillingPrimitives";
import { BranchDirectory, buildDirectory, type DirectoryRow } from "./BranchDirectory";
import { AddBranchDialog } from "./AddBranchDialog";

/**
 * Your Branches: the churches on the account, what each is using, and the one
 * place to add another.
 *
 * The design's filters for Region and Tier are not here — neither exists on a
 * church, so they would be dropdowns with one option. Search is, because a
 * network of thirty genuinely needs it, and it searches the two things a
 * person actually knows: the name and the place.
 *
 * Export is likewise absent: the Usage tab already exports per-church
 * consumption, and a second CSV of the same churches with fewer columns is a
 * button nobody needed twice.
 */
export const BillingBranchesTab: React.FC = () => {
  const { overview, canManage, isLoading, isError, error } = useBillingOverview();
  const { branches, pendingInvites, slots, isLoading: branchesLoading } = useBranches();

  const removeBranch = useRemoveBranch();
  const revokeInvite = useRevokeInvite();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const rows = useMemo(
    () => buildDirectory(branches, overview?.branches ?? [], pendingInvites),
    [branches, overview?.branches, pendingInvites],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q),
    );
  }, [rows, query]);

  if (isLoading || branchesLoading) return <TabSkeleton rows={3} />;
  if (isError || !overview) {
    return (
      <EmptyState
        title="Could not load your branches"
        body={error instanceof Error ? error.message : "Please refresh and try again."}
      />
    );
  }

  const busyId = removeBranch.isPending
    ? (removeBranch.variables as string)
    : revokeInvite.isPending
      ? (revokeInvite.variables as string)
      : null;

  const handleAction = (row: DirectoryRow) => {
    if (row.kind === "invite") return revokeInvite.mutate(row.id);
    removeBranch.mutate(row.id);
  };

  const available = slots?.available ?? 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold text-[#8356F3]">
            Your branches and fellowships
          </h2>
          <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-gray-400">
            The churches on this account, what each has spent of its own hours, and the
            invitations still waiting to be accepted.
          </p>
        </div>
        {canManage && (
          <Button
            className="bg-[#8356F3] text-white hover:bg-[#7245e2]"
            onClick={() => setAdding(true)}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Add new branch
          </Button>
        )}
      </header>

      <div className="rounded-xl bg-account-card p-4">
        <div className="relative max-w-[480px]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by church name or city…"
            aria-label="Search branches"
            className="border-white/15 bg-account-field pl-9 text-white"
          />
        </div>
      </div>

      <div className="rounded-xl bg-account-card p-5 sm:p-6">
        {filtered.length === 0 ? (
          <EmptyState
            title={query ? "Nothing matches that" : "No churches yet"}
            body={
              query
                ? "Try a different name or city."
                : "Churches appear here once they are created or accept an invitation."
            }
          />
        ) : (
          <>
            <BranchDirectory
              rows={filtered}
              canManage={canManage}
              busyId={busyId}
              onAction={handleAction}
            />
            <p className="mt-5 border-t border-white/10 pt-4 text-xs text-gray-500">
              Showing {filtered.length} of {rows.length}{" "}
              {rows.length === 1 ? "entry" : "entries"} — {slots?.churches ?? 0}{" "}
              {(slots?.churches ?? 0) === 1 ? "church" : "churches"}
              {(slots?.pendingInvites ?? 0) > 0 &&
                ` and ${slots?.pendingInvites} open ${
                  (slots?.pendingInvites ?? 0) === 1 ? "invitation" : "invitations"
                }`}
              .
            </p>
          </>
        )}
      </div>

      {/* The design's "License Slot Availability" footer. It is the answer to
          the question the table raises — can I add another — so it sits
          directly under it rather than on the Plans tab. */}
      <section className="flex flex-wrap items-center justify-between gap-5 rounded-xl bg-account-card p-6">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#8356F3]/20 text-[#a98bff]">
            <Network className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-base font-semibold text-white">Church slots</h3>
              <span className="rounded-full bg-[#8356F3]/20 px-2.5 py-0.5 text-[11px] font-medium capitalize text-[#a98bff]">
                {overview.planId}
              </span>
            </div>
            <p className="mt-1.5 max-w-[520px] text-sm text-gray-400">
              {available > 0
                ? `${available} ${available === 1 ? "slot is" : "slots are"} free. Each church you add brings its own ${overview.hoursPerChurch} hours a month.`
                : `All ${slots?.total ?? 0} slots are in use. Add another at ${formatUsd(SLOT_PRICE_USD)} a month to make room.`}
            </p>
          </div>
        </div>

        {canManage && (
          <Button
            className="bg-[#8356F3] text-white hover:bg-[#7245e2]"
            onClick={() => setAdding(true)}
          >
            {available > 0 ? "Invite a church" : "Add a slot"}
          </Button>
        )}
      </section>

      {adding && (
        <AddBranchDialog
          slots={slots}
          planId={overview.planId}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
};
