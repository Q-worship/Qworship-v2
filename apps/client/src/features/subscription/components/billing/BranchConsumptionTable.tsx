import React, { useMemo, useState } from "react";
import { formatHours } from "@qworship/shared";
import type { BranchHourUsage } from "@/lib/accountApi";
import type { StreamHealth } from "@/lib/billingApi";
import { Meter, TableScroll, EmptyState, StatusPill } from "./BillingPrimitives";

/**
 * Per-church consumption, searchable and exportable.
 *
 * Stream uptime is MEASURED: the share of a church's ended sessions that did
 * not end in `error`. A church with no finished sessions reads as 100% with a
 * dash rather than 0% — nothing has gone wrong, there is simply nothing yet.
 *
 * Status is DERIVED, not stored. There is no branch lifecycle in this system —
 * no onboarding, suspended or archived — so a church is described by what its
 * own numbers say: over its allowance, using it, or quiet this month.
 */

type Derived = "over allowance" | "active" | "idle";

function statusOf(branch: BranchHourUsage): Derived {
  if (branch.usedHours > branch.allowance) return "over allowance";
  return branch.usedHours > 0 ? "active" : "idle";
}

const PAGE_SIZE = 10;

/** One CSV field, quoted so a church called "St Mary, Ikeja" cannot split it. */
const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

type Row = BranchHourUsage & { health?: StreamHealth | null };

export const BranchConsumptionTable: React.FC<{ branches: Row[] }> = ({ branches }) => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | Derived>("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return branches.filter((b) => {
      if (status !== "all" && statusOf(b) !== status) return false;
      return !needle || b.name.toLowerCase().includes(needle);
    });
  }, [branches, search, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  // Exports what is on screen — the filtered set, not the whole account.
  // Downloading rows you cannot see is a surprise, not a convenience.
  const exportCsv = () => {
    const header = ["Church", "Hours used", "Allowance", "Remaining", "Cloud storage (GB)", "Storage limit (GB)", "Stream uptime (%)", "Sessions failed", "Status"];
    const body = filtered.map((b) =>
      [b.name, b.usedHours, b.allowance, b.remainingHours, b.storageUsedGb, b.storageLimitGb,
       b.health?.sessionsEnded ? b.health.uptimePercent : "", b.health?.sessionsFailed ?? 0, statusOf(b)]
        .map(cell)
        .join(","),
    );
    const blob = new Blob([[header.map(cell).join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `church-consumption-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (branches.length === 0) {
    return (
      <EmptyState
        title="No churches yet"
        body="Churches appear here once they are created or accept an invitation to join your network."
      />
    );
  }

  const field =
    "rounded-lg border border-[#2F2845] bg-[#161124] px-3 py-2 text-xs text-[#CBCED5] outline-none focus:ring-2 focus:ring-[#8356F3]/60";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          className={`${field} min-w-[180px] flex-1 text-white placeholder:text-[#768092]`}
          placeholder="Search church…"
          aria-label="Search church"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        <select
          className={field}
          aria-label="Status"
          value={status}
          onChange={(e) => { setStatus(e.target.value as "all" | Derived); setPage(0); }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="idle">Idle</option>
          <option value="over allowance">Over allowance</option>
        </select>
        <button
          type="button"
          onClick={exportCsv}
          className={`${field} hover:bg-white/10`}
          disabled={filtered.length === 0}
        >
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No churches match" body="Try a different search or status." />
      ) : (
        <>
          <TableScroll>
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#2F2845] text-[11px] uppercase tracking-wide text-[#768092]">
                  <th className="pb-3 pr-4 font-medium">Branch name</th>
                  <th className="pb-3 pr-4 font-medium">Allowance/Projections</th>
                  <th className="pb-3 pr-4 font-medium">Cloud storage</th>
                  <th className="pb-3 pr-4 font-medium">Stream uptime</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.organizationId} className="border-b border-[#2F2845]/50 last:border-0 hover:bg-white/[0.02]">
                    <td className="py-3.5 pr-4 text-sm font-medium text-white">
                      <span className="inline-block h-2 w-2 rounded-full bg-[#34D399] mr-2" />
                      {b.name}
                    </td>
                    <td className="py-3 pr-4 text-sm tabular-nums text-gray-300">
                      {formatHours(b.usedHours)}
                      <span className="ml-1 text-xs text-gray-500">({b.percentUsed}%)</span>
                      <div className="mt-1 w-28"><Meter percent={b.percentUsed} warn={b.percentUsed >= 80} /></div>
                    </td>
                    <td className="py-3 pr-4 text-sm tabular-nums text-gray-300">
                      {formatHours(b.allowance)}
                      {b.purchasedHours > 0 && (
                        <span className="ml-1 text-xs text-gray-500">
                          (+{formatHours(b.purchasedHours)} bought)
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-sm tabular-nums text-gray-300">
                      {b.storageUsedGb} / {b.storageLimitGb} GB
                    </td>
                    <td className="py-3 pr-4 text-sm tabular-nums text-gray-300">
                      {b.health && b.health.sessionsEnded > 0 ? (
                        <>
                          {b.health.uptimePercent}%
                          {b.health.sessionsFailed > 0 && (
                            <span className="ml-1 text-xs text-amber-300/80">
                              ({b.health.sessionsFailed} failed)
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-3"><StatusPill status={statusOf(b)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-xs text-gray-500">
              Showing {current * PAGE_SIZE + 1}–{current * PAGE_SIZE + rows.length} of {filtered.length}
              {filtered.length !== branches.length && ` (filtered from ${branches.length})`}. Each
              church spends only its own hours.
            </p>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`${field} disabled:opacity-40`}
                  onClick={() => setPage(current - 1)}
                  disabled={current === 0}
                >
                  Prev
                </button>
                <span className="text-xs text-gray-500">{current + 1} / {pages}</span>
                <button
                  type="button"
                  className={`${field} disabled:opacity-40`}
                  onClick={() => setPage(current + 1)}
                  disabled={current >= pages - 1}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};
