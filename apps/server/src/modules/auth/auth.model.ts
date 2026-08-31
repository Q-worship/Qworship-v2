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
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
