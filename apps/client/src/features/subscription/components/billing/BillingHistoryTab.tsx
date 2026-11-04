import React from "react";
import { formatUsd } from "@qworship/shared";
import { useInvoices } from "@/hooks/useBilling";
import { Panel, TabSkeleton, EmptyState, TableScroll, StatusPill } from "./BillingPrimitives";

/**
 * Every charge we have a record of.
 *
 * Today that is top-ups only. Subscription invoices are issued by the payment
 * processor and are read from it when connected — generating rows for them
 * here would produce a history that disagreed with the card statement, which
 * is worse than a short list.
 */
export const BillingHistoryTab: React.FC = () => {
  const { invoices, subscriptionInvoicesAvailable, isLoading, isError, error } = useInvoices();

  if (isLoading) return <TabSkeleton rows={3} />;
  if (isError) {
    return (
      <EmptyState
        title="Could not load billing history"
        body={error instanceof Error ? error.message : "Please refresh and try again."}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!subscriptionInvoicesAvailable && (
        <p className="rounded-lg bg-account-card p-4 text-sm leading-relaxed text-gray-400">
          Plan invoices will appear here once card payments are connected. Until then this lists
          extra hours bought for your churches.
        </p>
      )}

      <Panel title="Invoices and transactions" description="Most recent first.">
        {invoices.length === 0 ? (
          <EmptyState
            title="Nothing billed yet"
            body="Charges appear here as soon as there is something to show."
          />
        ) : (
          <TableScroll>
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="pb-3 pr-4 font-medium">Reference</th>
                  <th className="pb-3 pr-4 font-medium">What for</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 text-right font-medium">Amount</th>
                  <th className="pb-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-white/5 last:border-0">
                    <td className="py-4 pr-4 font-mono text-xs text-gray-400">
                      {invoice.hostedUrl ? (
                        // Stripe's own receipt, rather than a PDF we would
                        // have to render and keep in step with theirs.
                        <a
                          href={invoice.hostedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-4 hover:text-white"
                        >
                          {invoice.reference}
                        </a>
                      ) : (
                        invoice.reference
                      )}
                    </td>
                    <td className="py-4 pr-4">
                      <div className="text-sm text-white">{invoice.description}</div>
                      {invoice.churchName && (
                        <div className="mt-0.5 text-xs text-gray-500">for {invoice.churchName}</div>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-sm text-gray-400">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="py-4 pr-4 text-right text-sm tabular-nums text-white">
                      {formatUsd(invoice.amountUsd)}
                    </td>
                    <td className="py-4 text-right">
                      <StatusPill status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>
    </div>
  );
};
