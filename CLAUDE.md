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

- **$15.99 per church slot, per month.** Yearly is 12 months less 25%
  ($143.91). USD is the base and settlement currency. Note the same discount
  sets the twelve-month gift price.
- **30 hours per church, per month — NOT pooled.** Each church owns its hours;
  no branch can spend another's. This was deliberately changed from a pooled
  model: pooling let one busy branch black out a sibling mid-service, and it
  converted breakage into provider cost. Any UI showing one hours figure for a
  whole network is wrong.
- **Extra hours $1.99/hr**, bought for a *named church*, valid **30 days from
  payment** (`TOP_UP_VALID_DAYS`). It used to expire with the calendar month,
  which gave a church buying on the 28th three days for what the card promised
  as thirty. Rows written before `expiresAt` existed still follow the old
  month rule — see `liveTopUpFilter` — so nobody loses hours they paid for.
  Hours are not transferable, so a purchase with no destination is not a thing
  the system can carry out.
- **Top-ups sell hours, never features.** `capabilitiesForAccount` is handed
  planId, status and trialEndsAt and has no hours field to be influenced by,
  so buying time can never buy the feature set. Tested, because a later
  "helpful" change could otherwise make $5.97 a way to rent Standard. The
  economics agree: matching Standard's 30 hours via top-ups costs $55.72
  against $15.99, and leaves you on KJV throughout.
- **Free holds 25 songs** (`FREE_SONG_LIMIT`), checked on CREATE only. Songs
  over the cap are never hidden or deleted — a church that built forty on
  trial keeps forty and simply cannot add another. Bulk import is Standard
  outright, since one upload would walk past a per-song cap.
- **Free: 1 church, 2 hours, 1 GB. Standard: 30 hours and 10 GB per church.**
  Free is a real, usable plan — not a synonym for locked out — and what it
  withholds is decided per feature in `packages/shared/src/features.ts`, never
  by refusing the product wholesale.
- **Trial: the whole of Standard, free, for 30 days, with 2 hours.** The hours
  are a budget for the WHOLE run, not per month, and are counted from
  `trialStartedAt` rather than per calendar month — counting per month would
  hand a trial straddling a month boundary a second full allowance. Expiry is
  exact to the minute (`trialStartedAt + 30 x 24h`), a deliberate choice over
  rounding to end of day. Running the hours out silences hands-free Bible
  only; every other premium feature stays until the days are up. One trial per
  account, forever, which is why `trialStartedAt` is never cleared.
- **Gifts** are paid up front and produce a *code*; the sponsor usually does not
  know which account will redeem it. `expiresAt` is stamped at redemption, not
  purchase, so a code in an inbox does not burn down.

### Where the designs disagree with the catalog, the catalog wins

The exports contain stale figures — "Cloud Pro", ₦15,000/node, three Bible
versions, and top-up packs implying $0.71–0.80/hr. All corrected. (Free at 2
hours was once listed here as stale; it is now the decision, so the catalog and
the design agree. The design's "14 Bible versions" is still wrong — we ship 13,
so the plan card says "every Bible version" rather than a number that drifts.)
The design also shows a branch lifecycle (Onboarding / Suspended / Archived)
that does not exist; status is derived from real data instead — over allowance,
active, or idle, read off the church's own numbers.

The **Usage** export (`payments-&-billing-usage.svg`, also circulated as
"Frame 11.svg") adds three more that are not built, and should not be without
the metering first:

- **Peak Sunday Streams / "30 Concurrent"** — nothing meters concurrency. The
  tile is extra hours bought this month instead, which is real.
- **Stream Uptime (99.8%)** — nothing measures uptime. The column is absent
  rather than filled with a plausible-looking number.
- **Emergency Sunday Buffer at ₦12,500** — auto-refill is deliberately deferred
  (see Deferred features), and prices are USD from the catalog.

It also draws one hours figure over one allowance for a whole network. For a
multi-church account that is the pooled model this product deliberately does
not have, so the tiles show a per-church figure when there is one church and a
captioned total with no denominator when there are several.

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
- **Storage is refused before anything is stored.** `usage/storage.guard.ts`
  judges the whole batch at the START of an upload, after compression (the
  bytes that will actually occupy the allowance) and before a byte reaches S3,
  so a multi-file upload cannot half-land and leave a church over its limit.
  Refusal is `402 STORAGE_LIMIT_REACHED`. Crossing 80% warns *once* — on the
  crossing, not on every upload thereafter. An unresolvable church means do
  not enforce, the same trade hours make: an attribution gap is a reporting
  problem, not a reason to refuse somebody's media. Admin `isCloud` media is
  exempt throughout; it belongs to no church's allowance.
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
- **`packages/shared` is consumed as COMPILED JS, not source.** Its `main` is
  `dist/index.js`, because production runs the server as plain `node
  apps/server/dist/index.js` and node cannot load a `.ts` file — pointing
  `main` at `src/index.ts` is what caused `ERR_UNKNOWN_FILE_EXTENSION` on boot.
  So `dist` must exist before either app builds: both Dockerfiles and the root
  `build` script build shared first, and `pnpm dev` runs `tsc --watch` for it.
  A fresh clone needs `pnpm --filter @qworship/shared build` once.
- **Editing `packages/shared` does not hot-reload the server** — nodemon watches
  only `apps/server/src`. The watcher recompiles shared, but touch a server
  file after a catalog change.
- **Editing `tailwind.config.ts` does not hot-reload Vite.** Restart it, or new
  colour tokens render as transparent.

---

## Open work

Roughly in the order worth doing. None is release-blocking; the two that were
(entitlement reconciliation, and having any scheduler at all) are done.

### 1. Trial grace is capped, but nothing enforces the cap

`migrate:account-trials` has been RUN against production: six accounts kept
the legacy trial days they were owed. Re-running it is a no-op.

One account then carried 33 days because the old extend button had been
pressed repeatedly, and was capped by hand to 30. Nothing stops that
recurring if a long `trialEndDate` is ever written again — the cap was a
one-off script, not a rule. `pnpm audit:trials` is how you would notice.

### 2. One account per owner

An Account owns the subscription and Organizations consume its slots, so a
second account for the same person is a second free plan, slot and trial.

**The cause was a RACE, not a missing check.** Two requests landing together
on a church with no account — the billing overview and the capability lookup
fired by one page load — both read `accountId` as empty and both created one.
The two duplicates found in production were **six and nine milliseconds
apart**, and each owner held a single church. Onboarding had nothing to do
with it; gating onboarding would not have prevented either.

`ensureAccountFor` now decides the winner with one conditional write that
only matches a church still without an account, so exactly one caller can
match it. The loser retires the account it had just made and returns the
winner's. Reading the owner's existing accounts first still happens, but it
narrows the window rather than closing it — two concurrent calls can both
find nothing there too — so the claim is what actually holds.

**The two found in production are cleared.** Both duplicates were empty, so
`merge:duplicate-accounts` retired them by marking them `cancelled`, never
deleting. `audit:trials` reports "No owner holds more than one live account."

A hard unique index on `ownerId` would be the belt-and-braces version, and is
deliberately NOT added: removing a branch from a network (`DELETE /branches/:id`)
creates a fresh free account for that branch's owner, who may already hold a
live one of their own. A unique index would refuse that removal.

### 3. Signup never asks for a card, deliberately

`PlanSelectionOverlay` takes an `onProceedToCheckout` prop that is NEVER
CALLED. Its plan buttons only set local selection state; the one live control
is "Start free Trial", and `OnboardingFlow` points both props at the same
handler. Choosing Standard during signup is cosmetic — everybody lands on a
trial.

That is the right behaviour and should stay: the trial is thirty days with no
card, so a checkout at signup would ask for one before anybody has seen the
product. The honest conversion moment is the trial-ended screen. The DEFECT
is the dead prop, which implies a path that does not exist — delete it, or
wire it only if card-up-front signup is actually wanted.

Onboarding now DOES check slots: a second church costs one, the first never
does, and an owner with no account yet always passes.

### 4. Gift stacking

`redeemGift` refuses an account with a live Stripe subscription but not one with
an already-redeemed gift, so a second code silently overwrites the first's
`expiresAt`. Either refuse, or extend the existing expiry.

### 5. Billing visibility

Read endpoints in `billing.routes.ts` use `requireAccount(req, res)` with
`needsWrite: false`, so **any member** sees invoices, spend and payment method.
Probably should be owner/admin only.

### 6. Trial notices reach the app only, never an inbox

In-app notices now go out at **7 days, 1 day and the day itself**
(`sendTrialEndingNotices`, hourly). Each milestone is claimed with a
conditional `$addToSet` on `trialNoticesSent` before sending, so several app
instances send one notice rather than one each, and a milestone that was
overtaken is marked settled so a "7 days left" can never arrive after a
"1 day left".

**The gap: a church that does not open Q-worship between Monday and Sunday
still gets no warning at all.** No billing email is sent anywhere in this
product; `modules/auth/email.service.ts` has the transport and nothing in
billing uses it. That is the remaining half of this feature.

Stripe's own `trial_period_days` is still unused — our trial is ours, held on
the Account, and does not require a card. That is deliberate; revisit only if
card-up-front trials are wanted.

### 7. Dashboard configuration (not code)

- **Adaptive Pricing** must be switched on in the Stripe Dashboard — it is a
  setting, not an API call, and the whole currency approach depends on it. Note
  Nigeria is *not* in its supported list and needs manual `currency_options`.
- **Billing Portal** must be enabled, or "Manage payment method" errors.
- **Production webhook endpoint** with the nine handled events, and its own
  signing secret. DONE — configured on the production host. The CLI secret
  remains local-only.

### 8. Deferred features

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

### 9. Known gaps in testing

- `pnpm test:capabilities` covers the plan/feature matrix, trial eligibility,
  trial expiry, the hours rules, the trial-notice thresholds and the
  one-account-per-owner rule. Pure, so it needs no database or server.
- `pnpm audit:trials` is read-only and needs a database. It reports remaining
  trial grace and flags owners holding several accounts. Read the LEFT
  column, not RAN: a trial inheriting a legacy start date shows a long run
  without having had one.
- `pnpm test:usage` covers range resolution for every option the usage screen
  offers (7/30/90 days, weekly, monthly, custom, Sunday-to-Sunday), and needs
  no database.
- `pnpm test:storage` covers the storage policy and needs no database or
  server — `verdictFor` is pure so the refusal rules run anywhere.
- Refunds and disputes **have** been exercised against live test-mode Stripe
  (full refund reverses the row, replay is a no-op, partial refund declines to
  act, a dispute notifies without touching `status`). Done against a throwaway
  database — `MONGODB_URI` points at the real cluster, so never seed into it.
- No multi-branch account has been exercised end to end; every per-branch table
  has only ever rendered one row. `pnpm seed:demo` builds a network but refuses
  non-local databases.
- The design has no **Plans** export — the file duplicates Your Branches — so
  that screen was built from the catalog rather than a mock.
