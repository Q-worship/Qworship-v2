import React from "react";
import { MoreHorizontal } from "lucide-react";
import { formatHours } from "@qworship/shared";
import type { Branch, PendingInvite } from "@/lib/accountApi";
import type { BranchHourUsage } from "@/lib/accountApi";
import { Meter, TableScroll } from "./BillingPrimitives";

/**
 * The branch table from the design: who, what kind, how much of its hours it
 * has spent, and what state it is in.
 *
 * Open invitations are listed alongside churches rather than somewhere else.
 * An invitation holds a slot exactly as a church does, so leaving it out would
 * mean the table never adds up to the slot count beside it — which is the
 * question this screen exists to answer.
 *
 * The design's statuses (Onboarding, Suspended, Archived) describe a branch
 * lifecycle this product does not have. Rather than hardcode labels nothing
 * can ever set, the status is derived from what is actually known: whether a
 * church has streamed, whether it is over its hours, whether it is still an
 * unanswered invitation.
 */

export interface DirectoryRow {
  key: string;
  kind: "church" | "invite";
  name: string;
  subtitle: string;
  classification: string;
  usage?: BranchHourUsage;
  status: { label: string; tone: "ok" | "warn" | "bad" | "idle" };
  /** The church or invite id, for the row action. */
  id: string;
}

/** Two letters, from the first two words of a name. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Builds the rows, churches first then invitations.
 *
 * Exported so the tab can count and filter without rebuilding the same join.
 */
export function buildDirectory(
  branches: Branch[],
  usage: BranchHourUsage[],
  invites: PendingInvite[],
): DirectoryRow[] {
  const usageById = new Map(usage.map((u) => [u.organizationId, u]));

  const churches: DirectoryRow[] = branches.map((branch) => {
    const u = usageById.get(branch.id);
    const place = [branch.city, branch.country].filter(Boolean).join(", ");
    return {
      key: `church-${branch.id}`,
      kind: "church",
      id: branch.id,
      name: branch.name,
      subtitle: place || "No location set",
      classification: branch.isParent ? "Head Quarter" : "Branch",
      usage: u,
      status: !u
        ? { label: "No data", tone: "idle" }
        : u.percentUsed >= 100
          ? { label: "Hours used up", tone: "bad" }
          : u.percentUsed >= 80
            ? { label: "Running low", tone: "warn" }
            : // Not `=== 0`: usedHours is rounded to two decimals for display,
              // so a church with seconds of use would fail an exact test and
              // read as never having streamed.
              u.usedHours < 0.01
              ? { label: "No usage yet", tone: "idle" }
              : { label: "Active", tone: "ok" },
    };
  });

  const pending: DirectoryRow[] = invites.map((invite) => ({
    key: `invite-${invite.id}`,
    kind: "invite",
    id: invite.id,
    name: invite.email || invite.code || "Invitation",
    subtitle:
      invite.method === "code"
        ? "Code invitation · not yet accepted"
        : "Email invitation · not yet accepted",
    classification: "Invited",
    status: { label: "Holding a slot", tone: "warn" },
  }));

  return [...churches, ...pending];
}

const TONES: Record<DirectoryRow["status"]["tone"], string> = {
  ok: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  warn: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  bad: "border-red-400/30 bg-red-400/10 text-red-300",
  idle: "border-white/15 bg-white/5 text-gray-400",
};

export const BranchDirectory: React.FC<{
  rows: DirectoryRow[];
  canManage: boolean;
  busyId: string | null;
  onAction: (row: DirectoryRow) => void;
}> = ({ rows, canManage, busyId, onAction }) => (
  <TableScroll>
    <table className="w-full min-w-[840px] border-collapse text-left">
      <thead>
        <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-gray-500">
          <th className="pb-3 pr-4 font-medium">Branch</th>
          <th className="pb-3 pr-4 font-medium">Classification</th>
          <th className="pb-3 pr-4 font-medium">Quota / usage</th>
          <th className="pb-3 pr-4 font-medium">Status</th>
          <th className="pb-3 text-right font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-white/5 last:border-0">
            <td className="py-5 pr-4">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#8356F3]/20 text-xs font-semibold text-[#a98bff]"
                >
                  {initials(row.name)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{row.name}</div>
                  <div className="mt-0.5 truncate text-xs text-gray-500">{row.subtitle}</div>
                </div>
              </div>
            </td>

            <td className="py-5 pr-4">
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-gray-300">
                {row.classification}
              </span>
            </td>

            <td className="py-5 pr-4">
              {row.usage ? (
                <div className="w-44">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-gray-400">
                      {formatHours(row.usage.allowance)} / mo
                    </span>
                    <span
                      className={
                        row.usage.percentUsed >= 80 ? "text-amber-300" : "text-gray-500"
                      }
                    >
                      {row.usage.percentUsed}% used
                    </span>
                  </div>
                  <div className="mt-2">
                    <Meter
                      percent={row.usage.percentUsed}
                      warn={row.usage.percentUsed >= 80}
                    />
                  </div>
                </div>
              ) : (
                // An invitation has no church yet, so there is nothing to meter.
                <span className="text-xs text-gray-600">—</span>
              )}
            </td>

            <td className="py-5 pr-4">
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONES[row.status.tone]}`}
              >
                {row.status.label}
              </span>
            </td>

            <td className="py-5 text-right">
              {canManage && row.classification !== "Head Quarter" ? (
                <button
                  type="button"
                  onClick={() => onAction(row)}
                  disabled={busyId === row.id}
                  aria-label={
                    row.kind === "invite"
                      ? `Withdraw invitation ${row.name}`
                      : `Remove ${row.name}`
                  }
                  className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              ) : (
                // The head office cannot remove itself, and a member cannot
                // remove anything.
                <span className="text-xs text-gray-700">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </TableScroll>
);
