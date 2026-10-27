import mongoose, { Schema, Document } from "mongoose";

/**
 * Membership joins a user to a church.
 *
 * Access used to be expressed as `Organization.ownerId`, which could only ever
 * describe one user owning one church. A network administrator has to act
 * across every branch on their plan, and a person can belong to more than one
 * church, so access moves here: one row per person per church, with the role
 * they hold *at that church*.
 *
 * `Organization.ownerId` is kept as a record of who created the church. It no
 * longer grants access on its own — this collection does.
 */
export type MembershipRole = "owner" | "admin" | "member";

/** Roles permitted to change a church's own settings. */
export const MEMBERSHIP_WRITE_ROLES: MembershipRole[] = ["owner", "admin"];

export interface IMembership extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  role: MembershipRole;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<IMembership>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
      required: true,
    },
  },
  { timestamps: true },
);

// A person holds exactly one role at any given church.
MembershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

export const Membership = mongoose.model<IMembership>("Membership", MembershipSchema);
