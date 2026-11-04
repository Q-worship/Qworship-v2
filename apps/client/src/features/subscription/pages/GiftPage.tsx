import React, { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { Copy, Check } from "lucide-react";
import { formatUsd } from "@qworship/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountBreadcrumb } from "@/components/account/AccountShell";
import { useBillingOverview, useGifts, useRedeemGift } from "@/hooks/useBilling";
import { GiftSubscriptionCard } from "../components/billing/GiftSubscriptionCard";
import { Panel, StatusPill, TabSkeleton, EmptyState, TableScroll } from "../components/billing/BillingPrimitives";

/**
 * Gifting, both directions: sponsoring a church and claiming a sponsorship.
 *
 * Its own route rather than a fifth section of the Plans tab, because the two
 * halves belong to different people. A sponsor comes here to buy and to find a
 * code they already bought; a recipient comes here with a code in hand and no
 * interest in plans at all.
 */
export const GiftPage: React.FC = () => {
  const search = useSearch();
  const { canManage } = useBillingOverview();
  const { gifts, isLoading } = useGifts();

  // Stripe sends the code back on the success URL so the sponsor sees it the
  // moment they return, rather than hunting for it in the list below.
  const justBought = new URLSearchParams(search).get("code");

  return (
    <div className="min-h-full bg-account-bg text-white">
      <div className="mx-auto w-full max-w-[1247px] p-4 sm:p-6 lg:px-8 lg:pb-8 lg:pt-14">
        <AccountBreadcrumb page="Gift a subscription" />
        <h1 className="mt-[26px] text-[32px] font-bold leading-[1.1] tracking-tight text-white sm:text-[45px]">
          Gift a subscription
        </h1>
        <p className="mt-[22px] text-base text-gray-400 sm:text-[19px]">
          Sponsor another church, or claim a gift somebody has given you.
        </p>

        {justBought && (
          <div className="mt-10 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-6">
            <p className="text-sm font-semibold text-emerald-300">Thank you — your gift is paid.</p>
            <p className="mt-2 text-sm text-gray-300">
              Pass this code to the church you are sponsoring. They claim it on this page.
            </p>
            <CodeBlock code={justBought} />
          </div>
        )}

        <div className="mt-14 space-y-14">
          <section>
            <h2 className="text-[22px] font-semibold text-[#8356F3]">Claim a gift</h2>
            <div className="mt-6">
              <RedeemGiftCard canManage={canManage} />
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-[#8356F3]">
              Gift Q-worship to a church that needs it
            </h2>
            <div className="mt-6">
              <GiftSubscriptionCard canManage={canManage} />
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-[#8356F3]">Gifts you have given</h2>
            <div className="mt-6">
              {isLoading ? (
                <TabSkeleton rows={2} />
              ) : gifts.length === 0 ? (
                <EmptyState
                  title="No gifts yet"
                  body="Sponsored subscriptions appear here with their codes, so you can pass one on again."
                />
              ) : (
                <Panel title="Sponsored subscriptions" description="Most recent first.">
                  <TableScroll>
                    <table className="w-full min-w-[720px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-gray-500">
                          <th className="pb-3 pr-4 font-medium">Recipient</th>
                          <th className="pb-3 pr-4 font-medium">Code</th>
                          <th className="pb-3 pr-4 font-medium">Length</th>
                          <th className="pb-3 pr-4 text-right font-medium">Paid</th>
                          <th className="pb-3 text-right font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gifts.map((gift) => (
                          <tr key={gift.id} className="border-b border-white/5 last:border-0">
                            <td className="py-4 pr-4">
                              <div className="text-sm text-white">
                                {gift.recipientName || "Not named"}
                              </div>
                              {gift.recipientEmail && (
                                <div className="mt-0.5 text-xs text-gray-500">
                                  {gift.recipientEmail}
                                </div>
                              )}
                            </td>
                            <td className="py-4 pr-4">
                              {gift.code ? (
                                <InlineCode code={gift.code} />
                              ) : (
                                // A spent code is not worth reprinting; showing
                                // it invites somebody to try it again.
                                <span className="text-xs text-gray-600">—</span>
                              )}
                            </td>
                            <td className="py-4 pr-4 text-sm text-gray-400">
                              {gift.months} {gift.months === 1 ? "month" : "months"}
                            </td>
                            <td className="py-4 pr-4 text-right text-sm tabular-nums text-white">
                              {formatUsd(gift.amountUsd)}
                            </td>
                            <td className="py-4 text-right">
                              <StatusPill status={gift.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableScroll>
                </Panel>
              )}
            </div>
          </section>
        </div>

        <p className="mt-14 text-sm text-gray-500">
          <Link
            href="/dashboard-subscription/plans"
            className="underline underline-offset-4 hover:text-white"
          >
            Back to plans
          </Link>
        </p>
      </div>
    </div>
  );
};

/**
 * Claiming a code.
 *
 * Deliberately forgiving about formatting — people retype codes from a phone
 * screen or a printed card, and rejecting lowercase or a stray space would
 * fail them for something the server normalises anyway.
 */
const RedeemGiftCard: React.FC<{ canManage: boolean }> = ({ canManage }) => {
  const [code, setCode] = useState("");
  const redeem = useRedeemGift();

  return (
    <div className="rounded-xl bg-account-card p-6 lg:max-w-[560px]">
      <h3 className="text-xl font-semibold text-white">Have a code?</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-400">
        Claiming moves this account onto Standard for the months the gift covers. You will not be
        asked for a card, and there is nothing to cancel when it ends.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="GIFT-XXXX-XXXX"
          aria-label="Gift code"
          className="w-56 border-white/15 bg-account-field font-mono text-white"
          disabled={redeem.isPending}
        />
        <Button
          className="bg-[#8356F3] text-white hover:bg-[#7245e2] disabled:opacity-40"
          disabled={!canManage || redeem.isPending || code.trim().length < 6}
          onClick={() => redeem.mutate(code)}
        >
          {redeem.isPending ? "Claiming…" : "Claim gift"}
        </Button>
      </div>

      {!canManage && (
        <p className="mt-3 text-xs text-gray-500">Only an owner or admin can claim a gift.</p>
      )}
    </div>
  );
};

/** A code with a copy button — nobody should have to retype one by hand. */
const CodeBlock: React.FC<{ code: string }> = ({ code }) => (
  <div className="mt-4">
    <InlineCode code={code} large />
  </div>
);

const InlineCode: React.FC<{ code: string; large?: boolean }> = ({ code, large }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => {
        // Clipboard access can be refused; the code stays visible either way,
        // so a failure here is not worth an error message.
        navigator.clipboard?.writeText(code).then(
          () => setCopied(true),
          () => undefined,
        );
      }}
      className={`inline-flex items-center gap-2 rounded-lg border border-white/15 bg-account-field font-mono text-white transition-colors hover:border-[#8356F3]/50 ${
        large ? "px-4 py-3 text-lg" : "px-2.5 py-1.5 text-xs"
      }`}
      aria-label={`Copy code ${code}`}
    >
      {code}
      {copied ? (
        <Check className={large ? "h-4 w-4 text-emerald-400" : "h-3 w-3 text-emerald-400"} />
      ) : (
        <Copy className={large ? "h-4 w-4 text-gray-500" : "h-3 w-3 text-gray-500"} />
      )}
    </button>
  );
};

export default GiftPage;
