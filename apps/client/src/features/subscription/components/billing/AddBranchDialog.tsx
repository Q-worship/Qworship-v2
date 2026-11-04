import React, { useEffect, useState } from "react";
import { Copy, Check, X } from "lucide-react";
import { SLOT_PRICE_USD, formatUsd } from "@qworship/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SlotUsage } from "@/lib/accountApi";
import { useInviteBranch } from "@/hooks/useBranches";
import { useStartSubscription } from "@/hooks/useBilling";

/**
 * Adding a branch, which is two things that look like one.
 *
 * A slot has to be bought, and then a church has to be invited into it. The
 * design's single "Add new branch" button implies one action, and splitting
 * those across two screens is what made the old flow hard to follow — you
 * could invite and be refused with no idea what to do, or buy a slot and not
 * realise anything else was needed.
 *
 * So this dialog asks which situation you are in and only ever shows one step:
 * no free slot means buy one; a free slot means invite.
 */
export const AddBranchDialog: React.FC<{
  slots: SlotUsage | undefined;
  planId: "free" | "standard";
  onClose: () => void;
}> = ({ slots, planId, onClose }) => {
  const invite = useInviteBranch();
  const startSubscription = useStartSubscription();

  const [method, setMethod] = useState<"code" | "email">("code");
  const [email, setEmail] = useState("");
  const [issued, setIssued] = useState<{ code?: string; email?: string } | null>(null);

  // Escape closes, as people expect of anything that covers the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hasSlot = (slots?.available ?? 0) > 0;
  const needsPlan = planId === "free";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add a branch"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] rounded-xl bg-account-card p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">Add a branch</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {issued ? (
          <IssuedInvite issued={issued} onDone={onClose} />
        ) : needsPlan ? (
          /* Free holds exactly one church, so there is no slot to free up. */
          <Step
            body="Branches are part of Standard. Move to Standard and you can add a church for $15.99 a month each, every one with its own hours."
            action={
              <Button
                className="bg-[#8356F3] text-white hover:bg-[#7245e2] disabled:opacity-40"
                disabled={startSubscription.isPending}
                onClick={() => startSubscription.mutate({ slots: 2, interval: "month" })}
              >
                {startSubscription.isPending ? "Opening checkout…" : "Choose Standard"}
              </Button>
            }
          />
        ) : !hasSlot ? (
          <Step
            body={`All ${slots?.total ?? 0} of your church slots are taken — ${slots?.churches ?? 0} ${
              (slots?.churches ?? 0) === 1 ? "church" : "churches"
            }${
              (slots?.pendingInvites ?? 0) > 0
                ? ` and ${slots?.pendingInvites} open ${(slots?.pendingInvites ?? 0) === 1 ? "invitation" : "invitations"}`
                : ""
            }. Buy another slot to make room, at ${formatUsd(SLOT_PRICE_USD)} a month.`}
            action={
              <Button
                className="bg-[#8356F3] text-white hover:bg-[#7245e2] disabled:opacity-40"
                disabled={startSubscription.isPending}
                onClick={() =>
                  startSubscription.mutate({
                    slots: (slots?.total ?? 1) + 1,
                    interval: "month",
                  })
                }
              >
                {startSubscription.isPending
                  ? "Opening checkout…"
                  : `Buy a slot — ${formatUsd(SLOT_PRICE_USD)}/mo`}
              </Button>
            }
            note="An open invitation holds a slot until it is accepted or withdrawn."
          />
        ) : (
          <div className="mt-4">
            <p className="text-sm leading-relaxed text-gray-400">
              You have {slots?.available} free{" "}
              {(slots?.available ?? 0) === 1 ? "slot" : "slots"}. Invite a church to take one —
              they keep their own songs and media, and get their own monthly hours.
            </p>

            <div className="mt-6 flex gap-2">
              {(["code", "email"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    method === value
                      ? "border-[#8356F3] bg-[#8356F3]/20 text-white"
                      : "border-white/15 text-gray-300 hover:bg-white/5"
                  }`}
                >
                  {value === "code" ? "Share a code" : "Send an email"}
                </button>
              ))}
            </div>

            {method === "email" && (
              <div className="mt-4">
                <label htmlFor="invite-email" className="text-xs uppercase tracking-wide text-gray-500">
                  Their email
                </label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pastor@gracechapel.org"
                  className="mt-2 border-white/15 bg-account-field text-white"
                />
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                className="bg-[#8356F3] text-white hover:bg-[#7245e2] disabled:opacity-40"
                disabled={invite.isPending || (method === "email" && !email.trim())}
                onClick={() =>
                  invite.mutate(
                    { method, email: method === "email" ? email.trim() : undefined },
                    {
                      onSuccess: (result) =>
                        setIssued({ code: result.invite.code, email: result.invite.email }),
                    },
                  )
                }
              >
                {invite.isPending ? "Creating…" : "Create invitation"}
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-gray-400 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Step: React.FC<{ body: string; action: React.ReactNode; note?: string }> = ({
  body,
  action,
  note,
}) => (
  <div className="mt-4">
    <p className="text-sm leading-relaxed text-gray-400">{body}</p>
    <div className="mt-6">{action}</div>
    {note && <p className="mt-4 text-xs text-gray-500">{note}</p>}
  </div>
);

/**
 * The invitation, once created.
 *
 * The code is the whole product of this flow, so it is shown large and
 * copyable rather than buried in a toast that disappears.
 */
const IssuedInvite: React.FC<{
  issued: { code?: string; email?: string };
  onDone: () => void;
}> = ({ issued, onDone }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <div className="mt-4">
      {issued.code ? (
        <>
          <p className="text-sm leading-relaxed text-gray-400">
            Share this code with the church you are adding. They enter it under Organization to
            join your network.
          </p>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard?.writeText(issued.code as string).then(
                () => setCopied(true),
                () => undefined,
              )
            }
            className="mt-4 inline-flex items-center gap-3 rounded-lg border border-white/15 bg-account-field px-4 py-3 font-mono text-lg text-white transition-colors hover:border-[#8356F3]/50"
            aria-label={`Copy code ${issued.code}`}
          >
            {issued.code}
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </>
      ) : (
        <p className="text-sm leading-relaxed text-gray-400">
          An invitation is on its way to <span className="text-white">{issued.email}</span>.
        </p>
      )}

      <p className="mt-4 text-xs text-gray-500">
        It holds one of your slots until it is accepted or withdrawn.
      </p>

      <Button
        className="mt-6 bg-[#8356F3] text-white hover:bg-[#7245e2]"
        onClick={onDone}
      >
        Done
      </Button>
    </div>
  );
};
