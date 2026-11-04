import React, { useState } from "react";
import { Link } from "wouter";
import { Gift as GiftIcon } from "lucide-react";
import { DEFAULT_GIFT_MONTHS, GIFT_DURATIONS, formatUsd, giftPriceUsd } from "@qworship/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePurchaseGift } from "@/hooks/useBilling";
import giftCongregation from "@assets/gift-congregation.jpg";

/**
 * Sponsoring Standard for another church.
 *
 * Paid once and up front, producing a code rather than a direct grant: the
 * sponsor usually does not know which account the recipient will use, and
 * often the recipient has not signed up yet. A code can be emailed, read out
 * at a conference, or written on a card.
 *
 * Recipient details are optional for the same reason. A sponsor handing the
 * code over in person has nobody to address it to yet, and demanding an email
 * would make them invent one.
 */
export const GiftSubscriptionCard: React.FC<{ canManage: boolean }> = ({ canManage }) => {
  const [months, setMonths] = useState<number>(DEFAULT_GIFT_MONTHS);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const purchase = usePurchaseGift();

  const amount = giftPriceUsd(months, 1);

  return (
    <section className="overflow-hidden rounded-xl bg-account-card">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="p-6 sm:p-8">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#8356F3]/20 text-[#a98bff]">
            <GiftIcon className="h-[18px] w-[18px]" aria-hidden />
          </span>

          <p className="mt-6 text-sm font-semibold text-[#a98bff]">Gift Q-worship</p>
          <h3 className="mt-2 text-[26px] font-bold leading-tight text-white">
            Gift the tech. Bless a church.
          </h3>
          <p className="mt-3 max-w-[520px] text-sm leading-relaxed text-gray-400">
            Sponsor a church plant, a missionary campus or a sister ministry. You pay once; they
            get Standard for the months you choose, with no card of their own and nothing to
            cancel when it ends.
          </p>

          <fieldset className="mt-8" disabled={!canManage || purchase.isPending}>
            <legend className="text-xs uppercase tracking-wide text-gray-500">How long</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {GIFT_DURATIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMonths(option)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    months === option
                      ? "border-[#8356F3] bg-[#8356F3]/20 text-white"
                      : "border-white/15 text-gray-300 hover:bg-white/5"
                  }`}
                >
                  {option} {option === 1 ? "month" : "months"}
                  <span className="ml-2 text-xs text-gray-500">
                    {formatUsd(giftPriceUsd(option, 1))}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Church or person (optional)">
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Grace Chapel"
                  className="border-white/15 bg-account-field text-white"
                />
              </Field>
              <Field label="Their email (optional)">
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="pastor@gracechapel.org"
                  className="border-white/15 bg-account-field text-white"
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="A note with the gift (optional)">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="From everyone at St Luke's — we are praying for you."
                  className="border-white/15 bg-account-field text-white"
                />
              </Field>
            </div>
          </fieldset>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button
              className="bg-[#8356F3] text-white hover:bg-[#7245e2] disabled:opacity-40"
              disabled={!canManage || purchase.isPending}
              onClick={() =>
                purchase.mutate({
                  months,
                  slots: 1,
                  recipientName: recipientName.trim() || undefined,
                  recipientEmail: recipientEmail.trim() || undefined,
                  message: message.trim() || undefined,
                })
              }
            >
              {purchase.isPending ? "Opening checkout…" : `Gift ${formatUsd(amount)}`}
            </Button>
            <Link
              href="/dashboard-subscription/gift"
              className="text-sm font-medium text-white underline underline-offset-4 transition-colors hover:text-[#a98bff]"
            >
              Gifts you have given
            </Link>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-gray-500">
            You get a code to pass on. It grants nothing until the payment confirms, and the months
            only start when the church claims it — a code sitting in an inbox does not burn down.
          </p>
        </div>

        {/* Decorative only, so it carries an empty alt and is hidden on narrow
            screens — a photograph must not push the form that matters below
            the fold on a phone. The gradient over it keeps the card's left
            edge from ending in a hard seam against the panel background. */}
        <div className="relative hidden lg:block">
          <img
            src={giftCongregation}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-[#201734] via-[#201734]/30 to-transparent"
          />
        </div>
      </div>
    </section>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
    <div className="mt-2">{children}</div>
  </label>
);
