import React, { useEffect, useState } from "react";
import { CheckCircle2, Info } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { BILLING_OVERVIEW_KEY, CAPABILITIES_KEY } from "@/lib/billingApi";

/**
 * What a church sees when Stripe sends it back.
 *
 * The success and cancel URLs have always existed on the server; nothing on
 * this side read them. So somebody paid $143.91 and landed on the billing
 * page with a query string and no acknowledgement at all — the single moment
 * in the product where silence is least affordable.
 *
 * IT DOES NOT CLAIM THE MONEY ARRIVED. Checkout returning only means the
 * browser came back; the plan and the hours are written by the webhook, which
 * may be a second or two behind and does not depend on this page being open.
 * So the wording is "payment received, this page will catch up" rather than
 * "you are on Standard", which would be a claim we cannot see yet and which
 * the tiles underneath might immediately contradict.
 *
 * The queries are invalidated once on mount for that reason, and the param is
 * stripped so a refresh or a shared link does not replay the banner.
 */
type Outcome = { kind: "success" | "cancelled"; what: "plan" | "hours" } | null;

function readOutcome(): Outcome {
  const params = new URLSearchParams(window.location.search);
  const checkout = params.get("checkout");
  const topup = params.get("topup");
  if (checkout === "success") return { kind: "success", what: "plan" };
  if (checkout === "cancelled") return { kind: "cancelled", what: "plan" };
  if (topup === "success") return { kind: "success", what: "hours" };
  if (topup === "cancelled") return { kind: "cancelled", what: "hours" };
  return null;
}

export const CheckoutReturnBanner: React.FC = () => {
  const queryClient = useQueryClient();
  const [outcome] = useState<Outcome>(readOutcome);

  useEffect(() => {
    if (!outcome) return;

    if (outcome.kind === "success") {
      queryClient.invalidateQueries({ queryKey: BILLING_OVERVIEW_KEY });
      queryClient.invalidateQueries({ queryKey: CAPABILITIES_KEY });
    }

    // Strip the parameter without adding a history entry, so Back goes where
    // the person expects rather than replaying this.
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    url.searchParams.delete("topup");
    url.searchParams.delete("session_id");
    window.history.replaceState({}, "", url.toString());
  }, [outcome, queryClient]);

  if (!outcome) return null;

  const success = outcome.kind === "success";
  const isHours = outcome.what === "hours";

  return (
    <div
      role="status"
      className={`mb-8 flex items-start gap-3 rounded-xl border p-4 ${
        success
          ? "border-[#00c4b4]/30 bg-[#00c4b4]/[0.08]"
          : "border-white/15 bg-account-card"
      }`}
    >
      {success ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#00c4b4]" aria-hidden />
      ) : (
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden />
      )}
      <div className="text-sm leading-relaxed">
        <p className="font-semibold text-white">
          {success
            ? isHours
              ? "Payment received — your hours are on the way"
              : "Payment received — thank you"
            : isHours
              ? "No hours were bought"
              : "Checkout was cancelled"}
        </p>
        <p className="mt-1 text-gray-300">
          {success
            ? isHours
              ? "They are added to the church you bought them for as soon as your payment settles, usually within a moment. Refresh if this page has not caught up."
              : "Your plan is updated as soon as the payment settles, usually within a moment. Refresh if the figures below have not caught up."
            : "Nothing was charged, and your plan has not changed. You can pick it up again whenever you are ready."}
        </p>
      </div>
    </div>
  );
};
