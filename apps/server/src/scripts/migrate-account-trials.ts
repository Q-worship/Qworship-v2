import dotenv from 'dotenv';
import { connectDB } from '../core/db.js';
import { User } from '../modules/auth/auth.model.js';
import { Account } from '../modules/organization/account.model.js';
import { trialGrantFor } from '../modules/billing/trial.service.js';

dotenv.config();

/**
 * Carries each existing account's trial from the User onto the Account.
 *
 * REQUIRED before the trial work goes live, unlike most migrations here.
 * `ensureAccountFor` decides the trial when it CREATES an account, reading
 * the owner's legacy `trialStatus` / `trialEndDate` — but accounts that
 * already exist never take that path. Without this script, somebody eleven
 * days into the old trial with an account row already in the database would
 * be treated as a plain free user on the day we deploy, losing nineteen days
 * they were promised. That is the one thing this change must not do.
 *
 * Safe to run more than once. Every account is matched on `trialStartedAt`
 * not existing, so a second pass finds nothing; and it never touches a
 * Standard account, whose plan comes from Stripe rather than from a trial.
 *
 * Run with: pnpm --filter @qworship/server migrate:account-trials
 * Add --dry-run to see exactly what it would change and write nothing. Do
 * that first: this touches live accounts, and a trial date written wrongly
 * is not something anybody notices until somebody is locked out.
 */
const DRY_RUN = process.argv.includes('--dry-run');

async function migrate() {
  await connectDB();

  // Says which database is about to be touched, without printing credentials.
  const uri = process.env.MONGODB_URI || '';
  const target = uri.replace(/\/\/[^@]*@/, '//***@').split('?')[0];
  console.log(`${DRY_RUN ? 'DRY RUN — nothing will be written' : 'WRITING'}`);
  console.log(`Database: ${target || '(not set)'}\n`);

  // Only accounts that have not already been given trial fields, and only
  // unpaid ones — a Standard account's entitlement comes from its
  // subscription, and stamping a trial on it could only confuse reporting.
  const accounts = await Account.find({
    trialStartedAt: { $exists: false },
    planId: { $ne: 'standard' },
  });

  console.log(`Found ${accounts.length} accounts with no trial recorded.`);

  let trialing = 0;
  let settled = 0;
  let skipped = 0;

  for (const account of accounts) {
    const owner = await User.findById(account.ownerId)
      .select('trialStatus trialStartDate trialEndDate subscriptionStatus')
      .lean();

    if (!owner) {
      // An account whose owner is gone is left exactly as it is. Guessing a
      // trial for a row nobody can log into helps nobody.
      skipped += 1;
      continue;
    }

    const grant = trialGrantFor(owner);

    if (grant.status === 'trialing') {
      account.status = 'trialing';
      account.trialStartedAt = grant.trialStartedAt;
      account.trialEndsAt = grant.trialEndsAt;
      account.trialHours = grant.trialHours;
      if (!DRY_RUN) await account.save();
      trialing += 1;
      console.log(
        `  trial  ${account._id} — ${grant.trialEndsAt?.toISOString().slice(0, 10)} ` +
        `(carried from the user's legacy trial)`,
      );
    } else {
      // No live trial to carry. Stamp the start date anyway so this account
      // is not offered a fresh thirty days later: the rule is one trial per
      // account forever, and "already had one" is exactly what the legacy
      // flags are telling us here.
      account.trialStartedAt = owner.trialStartDate ?? account.createdAt ?? new Date();
      account.trialEndsAt = owner.trialEndDate ?? account.trialStartedAt;
      if (!DRY_RUN) await account.save();
      settled += 1;
    }
  }

  console.log(
    `\n${DRY_RUN ? 'Would change' : 'Done'}. ${trialing} accounts kept a running trial, ` +
    `${settled} recorded as already trialed, ${skipped} skipped (no owner).`,
  );
  if (DRY_RUN) console.log('Nothing was written. Re-run without --dry-run to apply.');
  process.exit(0);
}

migrate().catch((error) => {
  console.error('Trial migration failed:', error);
  process.exit(1);
});
