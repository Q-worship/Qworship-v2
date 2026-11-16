import dotenv from 'dotenv';
import { connectDB } from '../core/db.js';
import { User } from '../modules/auth/auth.model.js';
import { Account } from '../modules/organization/account.model.js';
import { Organization } from '../modules/organization/organization.model.js';
import { Membership } from '../modules/organization/membership.model.js';

dotenv.config();

/**
 * One-off: unstick the churches that chose the free plan and were locked out.
 *
 * "Continue with the free plan" settled the ACCOUNT onto free correctly, but
 * nothing ever moved the legacy `user.trialStatus` off `expired` — the mirror
 * only wrote that flag when an account converted to Standard. The client's
 * route guard reads the flag, so every one of those people was redirected
 * back to the trial-ended screen on every load, for good. The mirror now
 * handles this going forward; these rows predate it.
 *
 * NARROW BY DESIGN. A user is touched only when:
 *   - their flag is exactly `expired`, and
 *   - every account their churches sit on is a SETTLED one (`free`/`active`).
 *
 * A member who also sits on a live trial or a paid account elsewhere is left
 * alone and reported, because widening their access is not this script's job
 * and narrowing it would be worse.
 *
 * `cancelled` rather than a new enum value: trial eligibility already treats
 * it exactly as it treats `expired`, so one trial per account still holds
 * and nobody earns a second one out of this.
 *
 * UPDATES ONLY — nothing here deletes a document or a field.
 *
 * Dry run (the default):  pnpm --filter @qworship/server backfill:settled-trials
 * Apply:                  pnpm --filter @qworship/server backfill:settled-trials --apply
 */
async function run() {
  await connectDB();
  const apply = process.argv.includes('--apply');

  const stuck: any[] = await User.find({ trialStatus: 'expired' })
    .select('email trialStatus subscriptionStatus')
    .lean();

  console.log(`\n${stuck.length} user(s) carrying trialStatus "expired".\n`);

  const toFix: { id: any; email: string }[] = [];
  const skipped: string[] = [];

  for (const user of stuck) {
    const memberships: any[] = await Membership.find({ userId: user._id })
      .select('organizationId')
      .lean();
    const churches: any[] = await Organization.find({
      _id: { $in: memberships.map((m) => m.organizationId) },
    })
      .select('accountId')
      .lean();
    const accountIds = churches.map((c) => c.accountId).filter(Boolean);
    const accounts: any[] = await Account.find({ _id: { $in: accountIds } })
      .select('planId status')
      .lean();

    // No resolvable account is not a settled account: leave the flag alone
    // rather than guess at a plan nobody can see.
    if (accounts.length === 0) {
      skipped.push(`${user.email} — no account could be resolved`);
      continue;
    }

    const allSettled = accounts.every((a) => a.planId === 'free' && a.status === 'active');
    if (!allSettled) {
      const shape = accounts.map((a) => `${a.planId}/${a.status}`).join(', ');
      skipped.push(`${user.email} — not settled on free (${shape})`);
      continue;
    }

    toFix.push({ id: user._id, email: user.email });
  }

  if (skipped.length) {
    console.log('LEFT ALONE:');
    for (const line of skipped) console.log(`  - ${line}`);
    console.log('');
  }

  if (toFix.length === 0) {
    console.log('Nothing to backfill.\n');
    process.exit(0);
  }

  console.log(`${apply ? 'FIXING' : 'WOULD FIX'} ${toFix.length} user(s) — expired -> cancelled:`);
  for (const u of toFix) console.log(`  - ${u.email}`);

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write.\n');
    process.exit(0);
  }

  // Conditional on the flag still reading `expired`, so a run that overlaps
  // with somebody converting to Standard cannot undo their conversion.
  const result = await User.updateMany(
    { _id: { $in: toFix.map((u) => u.id) }, trialStatus: 'expired' },
    { $set: { trialStatus: 'cancelled' } },
  );

  console.log(`\nUpdated ${result.modifiedCount} user(s).\n`);
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
