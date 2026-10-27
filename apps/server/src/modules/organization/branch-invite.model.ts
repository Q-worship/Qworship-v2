import mongoose, { Schema, Document } from "mongoose";

/**
 * An invitation for a church to join a network as a branch.
 *
 * Both ways of affiliating a church are the same state machine with different
 * entry points, so they are one record rather than two features: a shareable
 * code the branch redeems, or an invitation sent to a registered church's
 * email address. One record means one audit trail and one place slots are
 * counted.
 *
 * A pending invite RESERVES a slot, released on decline, expiry or revocation.
 * Without that, an owner on ten slots could send fifty invitations and
 * oversubscribe the account.
 *
 * Email invitations are never silent: linking an existing church moves its data
 * under another church's administration, so that church must accept.
 */
export type BranchInviteState = "pending" | "accepted" | "declined" | "expired" | "revoked";

export interface IBranchInvite extends Document {
  accountId: mongoose.Types.ObjectId;
  /** The church sending the invitation. */
  parentOrganizationId: mongoose.Types.ObjectId;
  method: "code" | "email";
  /** Shareable code, for `code` invitations. */
  code?: string;
  /** Address invited, for `email` invitations. */
  email?: string;
  state: BranchInviteState;
  invitedBy: mongoose.Types.ObjectId;
  /** The church that accepted, once one has. */
  acceptedOrganizationId?: mongoose.Types.ObjectId;
  acceptedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BranchInviteSchema = new Schema<IBranchInvite>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    parentOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    method: { type: String, enum: ["code", "email"], required: true },
    code: { type: String, uppercase: true, trim: true, sparse: true, index: true },
    email: { type: String, lowercase: true, trim: true },
    state: {
      type: String,
      enum: ["pending", "accepted", "declined", "expired", "revoked"],
      default: "pending",
      index: true,
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    acceptedOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    acceptedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export const BranchInvite = mongoose.model<IBranchInvite>("BranchInvite", BranchInviteSchema);

/** Days a code or email invitation stays open before it expires. */
export const INVITE_TTL_DAYS = 14;

/** A readable, unambiguous code: no O/0 or I/1 to mistype. */
export function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
