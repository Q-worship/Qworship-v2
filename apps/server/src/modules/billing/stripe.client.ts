import Stripe from "stripe";
import { OVERAGE_PRICE_PER_HOUR_USD, SLOT_PRICE_USD, slotPriceFor, type BillingInterval } from "@qworship/shared";

/**
 * The Stripe client, and the two line items we ever charge for.
 *
 * Lazily constructed so the server still boots without keys — most of this
 * application has nothing to do with billing, and a missing STRIPE_SECRET_KEY
 * should disable checkout, not the Bible.
 *
 * CURRENCY: everything is priced and settled in USD. Customers are shown their
 * own currency by Stripe's Adaptive Pricing, which is a Dashboard setting
 * rather than an API call — it converts at checkout and charges the customer
 * the 2-4% conversion, not us. It requires Checkout (it does not work with
 * Elements and the Payment Intents API), which is why every payment below goes
 * through a hosted Checkout Session rather than an inline card form.
 */

let client: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured: STRIPE_SECRET_KEY is missing");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Pinned: an account-level API upgrade must not silently change the
      // shape of the objects this module reads.
      apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
      appInfo: { name: "Q-worship", url: "https://qworship.com" },
      maxNetworkRetries: 2,
    });
  }
  return client;
}

/** True when the configured key is a test key, surfaced to the billing screens. */
export function isTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY || "").startsWith("sk_test_");
}

/** USD is quoted in dollars in the catalog and in cents at Stripe. */
export function toCents(usd: number): number {
  return Math.round(usd * 100);
}

/**
 * The recurring line for one church slot.
 *
 * Built inline rather than referencing a Price created in the Dashboard, so
 * there is no catalog to provision before the first charge and no chance of
 * the Dashboard and `plans.ts` disagreeing about the price. The tradeoff is
 * that Stripe's product reporting groups by the generated price rather than a
 * stable one; swap in a `price` id here if that reporting is ever needed.
 */
export function slotLineItem(
  slots: number,
  interval: BillingInterval = "month",
): Stripe.Checkout.SessionCreateParams.LineItem {
  const yearly = interval === "year";
  return {
    quantity: slots,
    price_data: {
      currency: "usd",
      // Priced from the catalog for the chosen interval, so the tenth off a
      // yearly plan is applied in exactly one place.
      unit_amount: toCents(slotPriceFor(interval)),
      recurring: { interval },
      product_data: {
        name: `Q-worship Standard — church slot (${yearly ? "yearly" : "monthly"})`,
        description: "One church, with its own monthly hands-free Bible hours.",
      },
    },
  };
}

/** The one-off line for a gifted subscription, paid by the sponsor. */
export function giftLineItem(
  months: number,
  amountUsd: number,
  recipient: string,
): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: toCents(amountUsd),
      product_data: {
        name: `Q-worship Standard — ${months} month gift`,
        description: `A sponsored subscription for ${recipient}.`,
      },
    },
  };
}

/** The one-off line for extra hours bought for a single church. */
export function topUpLineItem(
  hours: number,
  churchName: string,
): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    quantity: hours,
    price_data: {
      currency: "usd",
      unit_amount: toCents(OVERAGE_PRICE_PER_HOUR_USD),
      product_data: {
        name: "Hands-free Bible — extra hour",
        // Named on the receipt: these hours are not transferable, so the
        // church they belong to has to be legible after the fact.
        description: `Extra transcription hours for ${churchName}.`,
      },
    },
  };
}
