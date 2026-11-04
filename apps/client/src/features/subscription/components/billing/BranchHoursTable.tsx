import React from "react";
import { formatHours } from "@qworship/shared";
import type { BranchHourUsage } from "@/lib/accountApi";
import { Meter, TableScroll, EmptyState } from "./BillingPrimitives";

/**
 * Every church with its own hours, as rows.
 *
 * Shared by Overview, Usage and Your Branches so one definition of "used"
 * exists. There is deliberately no totals row: adding these up produces a
 * number that governs nothing, since no church can spend another's hours.
 */
export const BranchHoursTable: React.FC<{
  branches: BranchHourUsage[];
  /** Adds a per-row action, used on Your Branches to buy hours. */
  renderAction?: (branch: BranchHourUsage) => React.ReactNode;
}> = ({ branches, renderAction }) => {
  if (branches.length === 0) {
    return (
      <EmptyState
        title="No churches yet"
        body="Churches appear here once they are created or accept an invitation to join your network."
      />
    );
  }

  return (
    <TableScroll>
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-gray-500">
            <th className="pb-3 pr-4 font-medium">Church</th>
            <th className="pb-3 pr-4 font-medium">Hours used</th>
            <th className="pb-3 pr-4 font-medium">Remaining</th>
            <th className="pb-3 pr-4 font-medium">Allowance</th>
            {renderAction && <th className="pb-3 text-right font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {branches.map((branch) => {
            const tight = branch.percentUsed >= 80;
            return (
              <tr key={branch.organizationId} className="border-b border-white/5 last:border-0">
                <td className="py-4 pr-4">
                  <div className="text-sm font-medium text-white">{branch.name}</div>
                  {branch.purchasedHours > 0 && (
                    <div className="mt-0.5 text-xs text-gray-500">
                      {branch.includedHours} included + {branch.purchasedHours} bought
                    </div>
                  )}
                </td>
                <td className="py-4 pr-4 align-middle">
                  <div className="flex items-center gap-3">
                    <div className="w-28">
                      <Meter percent={branch.percentUsed} warn={tight} />
                    </div>
                    <span
                      className={`text-xs tabular-nums ${tight ? "text-amber-300" : "text-gray-400"}`}
                    >
                      {branch.percentUsed}%
                    </span>
                  </div>
                </td>
                <td className="py-4 pr-4 text-sm tabular-nums text-gray-300">
                  {formatHours(branch.remainingHours)}
                </td>
                <td className="py-4 pr-4 text-sm tabular-nums text-gray-400">
                  {formatHours(branch.allowance)}
                </td>
                {renderAction && (
                  <td className="py-4 text-right">{renderAction(branch)}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableScroll>
  );
};
