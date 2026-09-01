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
  referredBy?: mongoose.Types.ObjectId;
  referralCodeUsed?: string;
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
    referredBy: { type: Schema.Types.ObjectId, ref: "User" },
    referralCodeUsed: { type: String },
    hearAboutUsSource: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const Organization = mongoose.model<IOrganization>(
  "Organization",
  OrganizationSchema,
);
