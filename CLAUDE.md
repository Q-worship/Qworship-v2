# Q-worship — working notes

Conventions and open work. See `FOLDER_STRUCTURE_GUIDE.md` for the feature-slice
rules; this file covers the subscription and billing system specifically.

---

## Client architecture (enforced, do not regress)

Three rules, verified by grep at the end of each change:

1. **No API calls in components.** Components call hooks; hooks call
   `lib/*Api.ts`; those call `lib/apiResult.ts`. A component should never hold
   a `Response` or decide what "failed" means.
2. **No cross-feature imports.** `features/a` may not import from
   `features/b`. Shared UI lives in `components/`, shared data in `lib/` and
   `hooks/`.
3. **Keep files small.** Everything added in the account/billing rework is
   under ~210 lines. The 943-line profile page this replaced is the warning.

```
lib/apiResult.ts → lib/{user,organization,billing,account}Api.ts
                 → hooks/use{CurrentUser,Organization,Subscription,Billing,Branches}.ts
                 → components
```

### Surface colours

Account and billing surfaces use tokens in `tailwind.config.ts`, sampled from
the design exports — `account.bg` `#1a102d`, `account.card` `#141414`,
`account.well` `#0a0a0a`, `account.field` `#1e1e21`. **Cards carry no border**;
the fill contrast against the purple page separates them. Do not reintroduce
`border-white/10` on a card.

---

## Commercial model (the decisions, and why)

Prices and allowances live in **`packages/shared/src/plans.ts` only**. Never
state a price in a component.

- **$15.99 per church slot, per month.** Yearly is 12 months less 10%
  ($172.69). USD is the base and settlement currency.
- **30 hours per church, per month — NOT pooled.** Each church owns its hours;
  no branch can spend another's. This was deliberately changed from a pooled
  model: pooling let one busy branch black out a sibling mid-service, and it
  converted breakage into provider cost. Any UI showing one hours figure for a
  whole network is wrong.
- **Extra hours $1.99/hr**, bought for a *named church*, expiring with the
  month. Hours are not transferable, so a purchase with no destination is not a
  thing the system can carry out.
- **Free: 1 church, 4 hours, 1 GB. Standard: 30 hours and 10 GB per church.**
- **Gifts** are paid up front and produce a *code*; the sponsor usually does not
  know which account will redeem it. `expiresAt` is stamped at redemption, not
  purchase, so a code in an inbox does not burn down.

### Where the designs disagree with the catalog, the catalog wins

The exports contain stale figures — "Cloud Pro", ₦15,000/node, Free at 2 hours,
three Bible versions, and top-up packs implying $0.71–0.80/hr. All corrected.
The design also shows a branch lifecycle (Onboarding / Suspended / Archived)
that does not exist; status is derived from real data instead.

---

## Billing invariants (breaking these causes real harm)

- **Entitlements move only in `stripe.webhook.ts`**, never on redirect. A
  browser can be closed, replayed or lied to.
- **The Stripe webhook is mounted with `express.raw` BEFORE `express.json`** in
  `index.ts`. Parsing and re-serialising the body breaks signature
  verification. This is the classic "works locally, 400s in production" bug.
- **Every webhook handler must be idempotent.** They return 500 to ask Stripe
  to retry, which is only safe because each write is conditional on the state
  it expects.
- **Prices never come from the client.** Quantities do, bounded; amounts are
  always computed server-side from the catalog.
- **`past_due` does not revoke access.** A card failing on a Saturday must not
  take a church off the air on Sunday. Only `cancelled` revokes.
- **Never cut a running service without warning.** Enforcement is strict at
  session *start* (nobody is mid-sentence) and gives a 30-minute grace window
  plus two explicit notices mid-session.
- **A refund takes back what it bought.** `charge.refunded` moves the
  `HourTopUp` to `refunded` and voids an *unclaimed* gift code. Only FULL
  refunds act: a row is one purchase of N hours at one price and cannot be
  partly unwound, so a partial refund is logged for a human. An *already
  redeemed* gift is left alone and logged — clawing a live plan back from a
  church that did nothing wrong is a conversation, not a webhook.
- **A dispute does not revoke access.** `charge.dispute.created` notifies the
  owner and changes nothing else, for the same reason as `past_due`: disputes
  are often opened in error and take weeks to close. If one is lost, Stripe
  cancels for non-payment and `customer.subscription.deleted` revokes properly.
- **Enforcement reads `usedSeconds`, never `usedHours`.** The latter is rounded
  to 2dp for display; comparing against it cut a church off ~3.6 seconds early.

### Two entitlement systems, one answer

`requireProductAccess` (33 routes) historically read `user.subscriptionStatus` /
`user.trialStatus`, while billing lives on the **Account**. They were
disconnected — a paying church could be refused with `402 TRIAL_EXPIRED`.

It now asks the Account first and falls back to the legacy user flags, and the
webhook mirrors the plan onto those flags via
`modules/billing/entitlement.service.ts`. **The fallback order must only ever
widen access**, or a release becomes an outage. The mirror is temporary; delete
it once the legacy readers are gone.

### Local development

- Stripe webhooks need `stripe listen --api-key $STRIPE_SECRET_KEY --forward-to
  localhost:5000/webhooks/stripe`. Without a live listener the endpoint answers
  503 by design, so Stripe retries once configured.
- **Editing `packages/shared` does not hot-reload the server** — nodemon watches
  only `apps/server/src`. Touch a server file after a catalog change.
- **Editing `tailwind.config.ts` does not hot-reload Vite.** Restart it, or new
  colour tokens render as transparent.

---

## Open work

Roughly in the order worth doing. None is release-blocking; the two that were
(entitlement reconciliation, and having any scheduler at all) are done.

### 1. Storage is measured but not enforced

`modules/usage/storage.service.ts` reports real bytes and the Plans tile shows
them, but `media.controller.ts` does not check the limit on upload. A Free
church can put 50 GB against its 1 GB. Needs a pre-upload check mirroring the
hours guard — and the same "warn before you block" treatment.

### 2. Gift stacking

`redeemGift` refuses an account with a live Stripe subscription but not one with
an already-redeemed gift, so a second code silently overwrites the first's
`expiresAt`. Either refuse, or extend the existing expiry.

### 3. Billing visibility

Read endpoints in `billing.routes.ts` use `requireAccount(req, res)` with
`needsWrite: false`, so **any member** sees invoices, spend and payment method.
Probably should be owner/admin only.

### 4. No trial on Standard

The design shows "30 Days Free Trial / 19 days left". Stripe supports
`trial_period_days` on the subscription; nothing uses it, and there is no
trial-days figure anywhere in the account model.

### 5. Dashboard configuration (not code)

- **Adaptive Pricing** must be switched on in the Stripe Dashboard — it is a
  setting, not an API call, and the whole currency approach depends on it. Note
  Nigeria is *not* in its supported list and needs manual `currency_options`.
- **Billing Portal** must be enabled, or "Manage payment method" errors.
- **Production webhook endpoint** with the nine handled events, and its own
  signing secret. The CLI secret is local-only.

### 6. Deferred features

- **Auto-refill / "Emergency Sunday Buffer"** from the design: buy hours
  automatically instead of stopping. Deliberately not built — it charges a card
  without a click and needs off-session SCA handling.
- **Two-factor authentication.** The toggle on Login & Security is disabled and
  labelled; it needs enrollment, backup codes, a verify step in sign-in and a
  lost-device recovery path.
- **Session timeout and login notifications** persist but nothing acts on them.
  Timeout needs a client idle timer — do *not* shorten JWT expiry, which would
  sign people out mid-service.
- **Email.** `notificationPreferences` now gates in-app notices only; no billing
  email is sent at all. `modules/auth/email.service.ts` has the transport.

### 7. Known gaps in testing

- Refunds and disputes **have** been exercised against live test-mode Stripe
  (full refund reverses the row, replay is a no-op, partial refund declines to
  act, a dispute notifies without touching `status`). Done against a throwaway
  database — `MONGODB_URI` points at the real cluster, so never seed into it.
- No multi-branch account has been exercised end to end; every per-branch table
  has only ever rendered one row. `pnpm seed:demo` builds a network but refuses
  non-local databases.
- The design has no **Plans** export — the file duplicates Your Branches — so
  that screen was built from the catalog rather than a mock.
