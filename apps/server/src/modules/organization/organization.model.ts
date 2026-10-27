import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  website?: string;
  denomination?: string;
  size?: number;
  subscriptionType: "free" | "basic" | "premium" | "enterprise";
  subscriptionStatus: "active" | "inactive" | "trial" | "cancelled";
  activatedAt?: Date;
  ownerId: mongoose.Types.ObjectId;
  /** The Account whose slots this church consumes. */
  accountId?: mongoose.Types.ObjectId | null;
  /** The church this is a branch of. Null for a standalone or parent church. */
  parentOrganizationId?: mongoose.Types.ObjectId | null;
  referredBy?: mongoose.Types.ObjectId;
  referralCodeUsed?: string;
  campaignId?: mongoose.Types.ObjectId;
  hearAboutUsSource?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String },
    phone: { type: String },
    website: { type: String },
    denomination: { type: String },
    size: { type: Number },
    subscriptionType: {
      type: String,
      enum: ["free", "basic", "premium", "enterprise"],
      default: "free",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "trial", "cancelled"],
      default: "trial",
    },
    activatedAt: { type: Date },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", default: null, index: true },
    parentOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "User" },
    referralCodeUsed: { type: String },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign" },
    hearAboutUsSource: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const Organization = mongoose.model<IOrganization>(
  "Organization",
  OrganizationSchema,
);
