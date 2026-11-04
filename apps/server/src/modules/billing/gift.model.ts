import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

/**
 * A sponsored subscription: one church paying for another to have Standard.
 *
 * Modelled as a CODE rather than a direct grant, because the sponsor usually
 * does not know which account the recipient will use — often the recipient has
 * not signed up yet. A code can be emailed, read out at a conference, or
 * printed, and it attaches to whichever account redeems it.
 *
 * The gift is paid for up front and in full. It is not a subscription with a
 * card behind it: when the months run out the recipient simply returns to
 * Free, with no payment method of theirs ever involved and nothing to cancel.
 */

export type GiftStatus =
  /** Sponsor started checkout; nothing is payable yet. */
  | "pending"
  /** Paid for, waiting to be claimed. */
  | "unclaimed"
  /** Applied to an account and running. */
  | "redeemed"
  /** Payment failed or was abandoned. */
  | "failed"
  /** Its months have run out. */
  | "expired";

export interface IGift extends Document {
  /** The code a recipient types in. Unique, and the only way to claim. */
  code: string;
  /** Who paid. */
  sponsorAccountId: mongoose.Types.ObjectId;
  sponsorUserId: mongoose.Types.ObjectId;
  /** How the sponsor described the recipient, for the receipt and the email. */
  recipientName?: string;
  recipientEmail?: string;
  message?: string;
  months: number;
  /** Churches the gift covers. One unless the sponsor paid for more. */
  slots: number;
  amountUsd: number;
  status: GiftStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  /** Set when claimed. */
  redeemedByAccountId?: mongoose.Types.ObjectId | null;
  redeemedAt?: Date | null;
  /** When the sponsored months run out. Set at redemption, not at purchase. */
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const GiftSchema = new Schema<IGift>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, index: true },
    sponsorAccountId: { type: Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    sponsorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipientName: { type: String },
    recipientEmail: { type: String, lowercase: true, trim: true },
    message: { type: String, maxlength: 500 },
    months: { type: Number, required: true, min: 1, max: 36 },
    slots: { type: Number, required: true, min: 1, max: 50, default: 1 },
    amountUsd: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "unclaimed", "redeemed", "failed", "expired"],
      default: "pending",
      index: true,
    },
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String },
    redeemedByAccountId: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    redeemedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// The sweep that expires finished gifts reads exactly this shape.
GiftSchema.index({ status: 1, expiresAt: 1 });

export const Gift = mongoose.model<IGift>("Gift", GiftSchema);

/**
 * A code that can be read aloud without being misheard.
 *
 * No I, O, 0 or 1 — the pairs people reliably confuse over a phone line or
 * from the back of a hall. Grouped in fours because that is how a person
 * copies a code without losing their place.
 */
export function generateGiftCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = () => alphabet[crypto.randomInt(0, alphabet.length)];
  const block = () => Array.from({ length: 4 }, pick).join("");
  return `GIFT-${block()}-${block()}`;
}
