import mongoose, { Schema, Document } from "mongoose";

/**
 * An enterprise enquiry: somebody too big for Standard, asking to talk.
 *
 * Stored rather than emailed, because no billing email is sent anywhere in
 * this product yet and a `mailto:` link — which is what the Talk to sales
 * button used to be — loses the enquiry entirely when the visitor has no mail
 * client configured. A row can be read from the admin area today and emailed
 * later once there is a transport; a lost enquiry cannot be recovered at all.
 *
 * There is deliberately no Enterprise PLAN behind this. `PlanId` is still
 * free | standard, so nothing here grants an entitlement: it is a sales
 * record, and whatever is agreed is applied as slots and bonus hours on an
 * ordinary account.
 */

export interface IEnterpriseEnquiry extends Document {
  name: string;
  email: string;
  organizationName: string;
  /** Roughly how many churches or campuses, as the enquirer states it. */
  churches?: string;
  phone?: string;
  message?: string;
  /** Set when the enquirer was signed in; absent for a public enquiry. */
  userId?: mongoose.Types.ObjectId | null;
  status: "new" | "contacted" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

const EnterpriseEnquirySchema = new Schema<IEnterpriseEnquiry>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
    organizationName: { type: String, required: true, trim: true, maxlength: 200 },
    churches: { type: String, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 50 },
    message: { type: String, trim: true, maxlength: 4000 },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["new", "contacted", "closed"], default: "new", index: true },
  },
  { timestamps: true },
);

// Newest first is the only order the sales queue is ever read in.
EnterpriseEnquirySchema.index({ createdAt: -1 });

export const EnterpriseEnquiry = mongoose.model<IEnterpriseEnquiry>(
  "EnterpriseEnquiry",
  EnterpriseEnquirySchema,
);
