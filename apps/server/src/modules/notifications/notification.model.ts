import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  category: 'system' | 'subscription' | 'admin' | 'user_activity';
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        // System / Automatic
        'welcome',
        'password_change',
        // Subscription
        'plan_subscription',
        'plan_expiry_reminder',
        'plan_expired',
        'payment_success',
        'new_plan',
        // Billing — written by modules/billing/billing.notify.ts. These were
        // missing from this list, so every billing notice failed validation and
        // was swallowed by createNotification's catch: a declined card, a lapsed
        // plan and a church running out of hours all happened in silence.
        'payment_failed',
        'payment_recovered',
        'plan_ended',
        'hours_low',
        'payment_disputed',
        'topup_refunded',
        'storage_low',
        'stream_peak',
        'buffer_prompt',
        // The trial ending, at 7 days / 1 day / the day itself. A type
        // missing from this list does not error anywhere a human will see —
        // createNotification catches the validation failure — so the notice
        // simply never arrives. That is how the billing notices above spent
        // a release in silence; do not add a notify* function without adding
        // its type here.
        'trial_ending',
        // Admin-triggered
        'admin_feature',
        'admin_bible',
        'admin_promotion',
        'admin_general',
        // User activity
        'recording_saved',
        // Referral programme
        'referral_new_organization',
        'referral_org_activated',
        'referral_commission_earned',
        'referral_withdrawal_paid',
      ],
    },
    category: {
      type: String,
      required: true,
      enum: ['system', 'subscription', 'admin', 'user_activity'],
      default: 'system',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    icon: { type: String },           // lucide icon name hint for the frontend
    actionUrl: { type: String },      // optional deep-link
    isRead: { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Compound index for efficient user-notification queries
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
