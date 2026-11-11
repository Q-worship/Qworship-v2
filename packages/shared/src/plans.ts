/**
 * The subscription catalog — the one place plan names, prices and limits are
 * defined. Both apps import from here.
 *
 * Before this, prices lived in five places that disagreed: referralCommission.ts
 * (free/basic/premium/enterprise), subscription.routes.ts (29/49),
 * SubscriptionManagement.tsx (15/29/49) and the marketing pricing components.
 * Changing a price meant editing all of them and missing one.
 *
 * NOTE ON PERSISTENCE: an account stores the price and limits it bought at, so
 * editing this catalog changes terms for new and renewing subscriptions only.
 * Existing subscribers keep what they signed up to.
 */

export type PlanId = "free" | "standard";

/**
 * USD per church slot, per month.
 *
 * One slot is one church. A single church on Standard pays this once; a network
 * adding a branch buys another slot at the same price. There is no volume
 * discount, which is deliberate: a flat per-church price is the one thing an
 * owner can work out in their head before they call us.
 */
export const SLOT_PRICE_USD = 15.99;

/**
 * Transcription hours each paid church gets, per month.
 *
 * These hours belong to the church that was paid for. They do NOT pool across a
 * network and one branch can never spend another's. That is the whole point: a
 * branch that pays its $15.99 is guaranteed its thirty hours, so a busy sibling
 * can never black it out mid-service, and head office tops a branch up when it
 * runs short rather than rationing a shared bucket.
 *
 * Thirty is a headline figure, not an expected bill. At $0.46/hour of provider
 * cost (TRANSCRIPTION_COST_PER_HOUR_USD) and $15.23 net of card fees, a church
 * breaks even at about 33 hours, so even a branch that burned all thirty still
 * leaves $1.43. Real churches run nowhere near it — two Sunday services and a
 * midweek meeting is roughly three hours a week. The cost lives in the tail,
 * which is what OVERAGE_PRICE_PER_HOUR_USD is for.
 *
 * It was 10, set when hours pooled across the network and a busy branch could
 * draw on a quiet one's share. Once hours stopped pooling, 10 per church was
 * both stingier and less useful, because unused hours no longer went anywhere.
 */
export const HOURS_PER_SLOT = 30;

/** USD per extra hour beyond a church's own allowance, about 4.3x provider cost. */
export const OVERAGE_PRICE_PER_HOUR_USD = 1.99;

/**
 * What an hour of streaming transcription costs us, in USD.
 *
 * INTERNAL. Deepgram Nova-3 streaming at $0.0077 a minute. Never shown to a
 * customer — it exists so margin reporting and the hour allowance above are
 * computed from one number instead of being re-derived in a spreadsheet.
 * Shadow metering replaces this estimate with the measured figure; see
 * /api/usage/report.
 */
export const TRANSCRIPTION_COST_PER_HOUR_USD = 0.46;

/**
 * Transcription hours on the Free plan, per month.
 *
 * Two hours is a taste, not a working allowance: roughly one service a
 * fortnight. That is the point. Free exists to show a church what hands-free
 * Bible feels like and then run out, with the premium features visible but
 * locked beside it; see FEATURES for what free actually loses.
 *
 * It costs us about $0.92 per free account against no revenue, so it is
 * acquisition spend: at 1,000 free churches, roughly $920 a month.
 *
 * It was 4, set when free was the only non-paying state and had to carry a
 * whole billing cycle of normal use on its own. The trial now does that job —
 * thirty days of the FULL product — so free no longer has to be generous
 * enough to live on, and halving it costs nothing a trialist will feel.
 *
 * Free holds one church, so there is nothing here to pool.
 */
export const FREE_HOURS = 2;

/**
 * Cloud storage included with each plan, in gigabytes, per church.
 *
 * Real limits against a real measurement: every media row already carries a
 * `fileSize`, so this is the sum of what a church has actually uploaded, not a
 * decorative bar. Per church rather than per account, for the same reason
 * hours are — a branch's library is its own.
 */
export const FREE_STORAGE_GB = 1;
export const STANDARD_STORAGE_GB = 10;

/** Bytes in a gigabyte, so no caller has to write the literal. */
export const BYTES_PER_GB = 1024 ** 3;

/**
 * Songs a free church may keep in its library.
 *
 * Twenty-five is about a church's working rotation — four songs a Sunday,
 * rotating — so free runs real services for months and meets the wall as it
 * genuinely grows, which is the honest moment to ask for money rather than
 * an artificial one on day two.
 *
 * ENFORCED ON CREATE ONLY. Songs over the cap are never hidden or deleted: a
 * church that built forty during its trial keeps all forty and simply cannot
 * add a forty-first. Taking back something somebody wrote is not a pricing
 * decision, and a library that silently shrinks is indistinguishable from
 * data loss.
 *
 * Bulk import is Standard for the same reason the cap exists — one upload
 * would otherwise walk straight past it.
 */
export const FREE_SONG_LIMIT = 25;

/**
 * How long a new account gets the whole product for, in days.
 *
 * The trial is not a cheaper plan; it is Standard, free, for a month. Every
 * premium capability is open — see FEATURES — because the only thing that
 * sells them is using them.
 */
export const TRIAL_DAYS = 30;

/**
 * Transcription hours a trial gets for its whole run.
 *
 * NOT per month: a trial is thirty days long, and this is the total for it.
 *
 * Two, the same as free, which looks odd until you see what it is for. The
 * trial does not sell HOURS, it sells FEATURES — every Bible version, lower
 * thirds, sermons, the cloud collections — and those cost us nothing to
 * hand out. Transcription is the one thing that bills a provider by the
 * minute, so it is the one thing the trial is tight with. Giving thirty
 * trial hours would spend ~$13.80 of Deepgram on an account that may never
 * pay, and would make the paid allowance feel like a downgrade.
 *
 * The consequence is deliberate and must not be "fixed" without a decision:
 * a trialist who burns both hours on day three has no hands-free Bible until
 * their free plan begins on day thirty-one. They keep every other premium
 * feature until then (see TRIAL_KEEPS_FEATURES_UNTIL_EXPIRY), and they can
 * buy a top-up pack, which is the intended escape and the intended revenue.
 */
export const TRIAL_HOURS = 2;

/**
 * Whether spending the trial's hours also ends its feature access.
 *
 * It does not. Running out of hours silences hands-free Bible and nothing
 * else; the versions, the lower thirds and the sermons stay until the thirty
 * days are up.
 *
 * Taking everything away at the moment somebody hits a limit is the surest
 * way to lose them: they are at their most engaged and would be met with an
 * app that suddenly does less than it did an hour ago. Leaving the rest open
 * means twenty-seven more days of seeing the product work, with one locked
 * button in front of them and a price beside it.
 *
 * A constant rather than a bare `true` so the rule is greppable from the
 * enforcement code that depends on it.
 */
export const TRIAL_KEEPS_FEATURES_UNTIL_EXPIRY = true;

/**
 * How a subscription is billed.
 *
 * Yearly is twelve months at a quarter off — the discount the design promises,
 * expressed once here so the saving on the toggle and the figure Stripe
 * charges cannot drift apart.
 *
 * A quarter is steep for an annual commitment, and deliberately so: a church
 * budgets once a year, and a year paid up front removes twelve chances to
 * churn. Note it also sets the twelve-month gift price, which is the same
 * commitment and so takes the same discount.
 */
export type BillingInterval = "month" | "year";

export const YEARLY_DISCOUNT = 0.25;

/** What one church slot costs for a whole year, after the discount. */
export function yearlySlotPriceUsd(): number {
  return Number((SLOT_PRICE_USD * 12 * (1 - YEARLY_DISCOUNT)).toFixed(2));
}

/** The price of one slot for an interval, as Stripe will charge it. */
export function slotPriceFor(interval: BillingInterval): number {
  return interval === "year" ? yearlySlotPriceUsd() : SLOT_PRICE_USD;
}

/** What a year of billing saves against paying monthly, in USD. */
export function yearlySavingUsd(slots = 1): number {
  return Number((SLOT_PRICE_USD * 12 * YEARLY_DISCOUNT * slots).toFixed(2));
}

/**
 * Gift durations offered when sponsoring another church.
 *
 * A gift buys Standard for ONE church for a fixed run of months, paid once and
 * up front. Twelve months carries the same tenth off a yearly subscription
 * gets, because it is the same commitment.
 *
 * One month is deliberately the floor: it is the cheapest way to cover a
 * single conference or a revival week, and it lets somebody try sponsoring
 * without committing a quarter's worth.
 */
export const GIFT_DURATIONS = [1, 3, 6, 12] as const;

/**
 * What the gift card opens on.
 *
 * Named rather than taken by index, so adding a duration cannot silently move
 * the default — prepending 1 month would otherwise have switched everybody
 * from six months to three without anyone deciding to.
 */
export const DEFAULT_GIFT_MONTHS = 6;

export function giftPriceUsd(months: number, slots = 1): number {
  const gross = SLOT_PRICE_USD * months * slots;
  const discounted = months >= 12 ? gross * (1 - YEARLY_DISCOUNT) : gross;
  return Number(discounted.toFixed(2));
}

/**
 * The preset hour packs offered on the Plans screen.
 *
 * Sizes only — every price is derived from OVERAGE_PRICE_PER_HOUR_USD, so a
 * pack cannot drift from the per-hour rate the rest of the system charges.
 * The design offered packs at round dollar amounts ($2, $5, $10) whose implied
 * rates were between $0.71 and $0.80 an hour; honouring those would have
 * undercut the catalog by more than half without anybody deciding to.
 *
 * Hours, not dollars, because hours are what a church actually runs out of,
 * and because pricing has to stay on the server.
 */
export const TOP_UP_PACKS = [
  { hours: 3, label: "A spare service" },
  { hours: 7, label: "A busy month" },
  { hours: 14, label: "A season of events" },
] as const;

/**
 * How long bought hours last, in days from the moment they are PAID for.
 *
 * Thirty days from purchase, not to the end of the calendar month. The month
 * rule was the original one and it quietly punished the people most likely to
 * buy: a church topping up on the 28th for an unusually heavy Sunday got three
 * days to use what it paid for, and the plan card had always promised thirty.
 * Nobody reads "expires with the month" as "expires on Saturday".
 *
 * Measured from payment rather than from opening checkout, so an abandoned
 * session resumed the next day does not start already spent.
 */
export const TOP_UP_VALID_DAYS = 30;

/** Sizes offered on the custom top-up, beside a free-entry field. */
export const TOP_UP_PRESET_HOURS = [5, 10, 25, 50] as const;

/** What a number of extra hours costs, at the catalog's overage rate. */
export function topUpPrice(hours: number): number {
  return Number((hours * OVERAGE_PRICE_PER_HOUR_USD).toFixed(2));
}

/** Card processing on a single charge: Stripe's 2.9% + $0.30. */
export function cardFeeUsd(amount: number): number {
  return Number((amount * 0.029 + 0.3).toFixed(2));
}

/**
 * Hours a given monthly charge pays for before it stops making money.
 *
 * INTERNAL, for margin reporting and for sanity-checking HOURS_PER_SLOT when
 * provider pricing moves.
 */
export function breakEvenHours(monthlyPrice: number): number {
  const net = monthlyPrice - cardFeeUsd(monthlyPrice);
  if (net <= 0) return 0;
  return Number((net / TRANSCRIPTION_COST_PER_HOUR_USD).toFixed(1));
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  /** Monthly price of one slot. Free plans are 0. */
  monthlyPrice: number;
  /** Churches included before any extra slots are bought. */
  includedSlots: number;
  /** Transcription hours each church on this plan gets a month, to itself. */
  includedHours: number;
  /** Cloud storage each church on this plan gets, in gigabytes. */
  includedStorageGb: number;
  /** Whether more church slots can be bought on this plan. */
  canBuySlots: boolean;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    description: "Essential tools for a single church, and enough hands-free Bible to see how it works.",
    monthlyPrice: 0,
    includedSlots: 1,
    includedHours: FREE_HOURS,
    includedStorageGb: FREE_STORAGE_GB,
    canBuySlots: false,
    features: [
      "One church",
      `${FREE_HOURS} hrs/month hands-free Scripture & transcription`,
      `${FREE_STORAGE_GB} GB cloud storage`,
      "Order of service builder",
      "Hands-free Bible — KJV only",
      "On-screen Bible search — KJV only",
      `Song book and song builder — up to ${FREE_SONG_LIMIT} songs`,
      "Media assets — limited to My Media",
      "Live projection",
      "Slide canvas builder — text, shapes, images, layers, QR codes",
      "PowerPoint import & back-up",
    ],
  },
  standard: {
    id: "standard",
    name: "Standard",
    description: "One church, and a slot for every branch you add.",
    monthlyPrice: SLOT_PRICE_USD,
    includedSlots: 1,
    includedHours: HOURS_PER_SLOT,
    includedStorageGb: STANDARD_STORAGE_GB,
    canBuySlots: true,
    // Written as "everything in free, plus" — the screen renders this list
    // under that heading, so nothing free already has is repeated here.
    features: [
      `${HOURS_PER_SLOT} hrs/month for every church`,
      "Every Bible version, hands-free and on-screen",
      "Add multiple branches or campuses",
      `${STANDARD_STORAGE_GB} GB of storage for every branch`,
      "Q-worship sermons",
      "Lower third builder & pre-built templates",
      "Advanced cloud media collections",
      "Usage visibility for every branch",
      "Priority support",
    ],
  },
};

export const PLAN_LIST: Plan[] = [PLANS.free, PLANS.standard];

/** What an account on this plan, with this many slots, is entitled to. */
export interface Entitlements {
  planId: PlanId;
  slots: number;
  /**
   * Hours each church on the account gets a month, to itself.
   *
   * Deliberately not a network total: there is no pooled figure to report, and
   * a single number across branches is exactly the thing we do not want anyone
   * reading as a shared bucket.
   */
  hoursPerChurch: number;
  monthlyPrice: number;
}

export function entitlementsFor(planId: PlanId, slots = 1): Entitlements {
  const plan = PLANS[planId] ?? PLANS.free;
  if (!plan.canBuySlots) {
    return {
      planId: plan.id,
      slots: plan.includedSlots,
      hoursPerChurch: plan.includedHours,
      monthlyPrice: plan.monthlyPrice,
    };
  }
  // A paid account always holds at least the one church that opened it.
  const owned = Math.max(plan.includedSlots, Math.floor(slots));
  return {
    planId: plan.id,
    slots: owned,
    hoursPerChurch: HOURS_PER_SLOT,
    monthlyPrice: Number((SLOT_PRICE_USD * owned).toFixed(2)),
  };
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${Number(hours.toFixed(1))} hr`;
}
