import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username?: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  countryCode?: string;
  phoneNumber?: string;
  agreeToMarketing?: boolean;
  organizationName?: string;
  bio?: string;
  accountType?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  profilePicture?: string;
  role: 'user' | 'admin' | 'superadmin' | 'pastor' | 'worship_leader' | 'member' | 'referee';
  roleId?: mongoose.Types.ObjectId | null;
  /** The church this user is currently acting on, when they belong to several. */
  activeOrganizationId?: mongoose.Types.ObjectId | null;
  referralCode?: string;
  mustChangePassword?: boolean;
  lastLoginAt?: Date;
  planType?: string;
  trialStartDate?: Date;
  trialEndDate?: Date;
  subscriptionStatus?: string;
  emailVerifiedAt?: Date;
  onboardingStatus: 'pending' | 'organization' | 'preferences' | 'completed';
  onboardingCompletedAt?: Date;
  selectedFeatures: string[];
  trialStatus: 'not_started' | 'active' | 'expired' | 'converted' | 'cancelled';
  trialActivatedAt?: Date;
  biblePreferences?: {
    pinnedVersions: string[];
  };
  /**
   * How this person wants to be contacted, and how their session behaves.
   *
   * Marketing email is NOT here: it is `agreeToMarketing` above, set at signup
   * and relied on for consent. A second flag for the same thing is how someone
   * who opted out still receives mail.
   *
   * `sessionTimeoutMinutes` is enforced in the client as an idle timer, not by
   * shortening the token. Tokens last 7 days on purpose — expiring one mid
   * service is a far worse failure than an unattended tab staying open.
   */
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
    trial: boolean;
    login: boolean;
    /** Warn when many branches stream at once on a Sunday. */
    streamPeak: boolean;
    /** Prompt to top up the moment a church runs out mid-service. */
    autoRefill: boolean;
  };
  sessionTimeoutMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String }, // Optional for OAuth
    firstName: { type: String },
    lastName: { type: String },
    countryCode: { type: String },
    phoneNumber: { type: String },
    agreeToMarketing: { type: Boolean, default: false },
    organizationName: { type: String },
    bio: { type: String },
    accountType: { type: String, default: 'free' },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    profilePicture: { type: String },
    role: { type: String, enum: ['user', 'admin', 'superadmin', 'pastor', 'worship_leader', 'member', 'referee'], default: 'user' },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', default: null },
    activeOrganizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    referralCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    emailVerifiedAt: { type: Date },
    onboardingStatus: { type: String, enum: ['pending', 'organization', 'preferences', 'completed'], default: 'pending' },
    onboardingCompletedAt: { type: Date },
    selectedFeatures: { type: [String], default: [] },
    planType: { type: String, default: 'cloud_pro' },
    trialStartDate: { type: Date },
    trialEndDate: { type: Date },
    trialStatus: { type: String, enum: ['not_started', 'active', 'expired', 'converted', 'cancelled'], default: 'not_started' },
    trialActivatedAt: { type: Date },
    subscriptionStatus: { type: String, default: 'inactive' },
    biblePreferences: {
      pinnedVersions: {
        type: [String],
        default: ['kjv', 'nkjv', 'niv', 'msg', 'esv', 'amp'],
      },
    },
    notificationPreferences: {
      // Transactional mail defaults on; a church that cannot be told its
      // hours ran out finds out during a service instead.
      email: { type: Boolean, default: true },
      // Off by default: SMS costs money and needs a number we may not have.
      sms: { type: Boolean, default: false },
      // On by default: a network about to saturate its feeds wants to know.
      streamPeak: { type: Boolean, default: true },
      // Off by default. It is an extra notice during a service, and a church
      // that has not asked for one should not start getting them.
      autoRefill: { type: Boolean, default: false },
      trial: { type: Boolean, default: true },
      login: { type: Boolean, default: true },
    },
    sessionTimeoutMinutes: { type: Number, default: 30, min: 5, max: 480 },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
