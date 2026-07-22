import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../core/db.js';
import { User } from '../modules/auth/auth.model.js';

dotenv.config();

async function migrate() {
  await connectDB();
  const now = new Date();
  const users = await User.find({ emailVerified: true, onboardingCompletedAt: { $exists: false } });
  let updated = 0;
  for (const user of users) {
    user.onboardingStatus = 'completed';
    user.onboardingCompletedAt = user.createdAt || now;
    if (user.subscriptionStatus === 'active') {
      user.trialStatus = 'converted';
    } else if (user.trialEndDate) {
      user.trialStatus = user.trialEndDate > now ? 'active' : 'expired';
      user.subscriptionStatus = user.trialStatus === 'active' ? 'trial' : 'inactive';
      user.trialActivatedAt ||= user.trialStartDate || user.createdAt;
    } else {
      // Existing verified accounts retain access; they are not silently granted a fresh trial.
      user.trialStatus = 'converted';
      user.subscriptionStatus = 'active';
    }
    user.emailVerifiedAt ||= user.createdAt;
    await user.save();
    updated += 1;
  }
  console.log(`Migrated ${updated} existing verified users.`);
  await mongoose.disconnect();
}

migrate().catch(async error => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
