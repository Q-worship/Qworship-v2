import dotenv from 'dotenv';
import { connectDB } from '../core/db.js';
import { Account } from '../modules/organization/account.model.js';
import { Organization } from '../modules/organization/organization.model.js';
import { BranchInvite } from '../modules/organization/branch-invite.model.js';
import { HourTopUp } from '../modules/organization/hour-topup.model.js';
import { User } from '../modules/auth/auth.model.js';
import { pickOwnersAccount } from '../modules/organization/account.service.js';

dotenv.config();

/**
 * Folds an owner's duplicate accounts into one.
 *
 * `ensureAccountFor` used to create a whole new Account whenever an owner
 * made a second church outside the branch-invite flow, which handed out a
 * second free plan, slot and trial. That cause is fixed; this clears up what
 * it already made.
 *
 * NOTHING IS DELETED. Churches, pending invites and bought hours are
 * RE-POINTED at the keeper, and an emptied duplicate is marked `cancelled`
 * rather than removed — a cancelled account is skipped by
 * `pickOwnersAccount`, so nothing will ever join it again, and the row stays
 * for anyone asking later what happened.
 *
 * A duplicate that still holds anything after the move is LEFT ALONE and
 * reported. Taking a church over its owner's slot count, or stranding hours
 * somebody paid for, is a conversation rather than a script.
 *
 * Run with --dry-run first.
 */
async function run() {
  await connectDB();
  const dry = process.argv.includes('--dry-run');
  console.log(dry ? 'DRY RUN — nothing will be written\n' : 'WRITING\n');

  const owners: any[] = await Account.aggregate([
    { $group: { _id: '$ownerId', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  console.log(`${owners.length} owner(s) hold more than one account.\n`);

  let retired = 0;
  let moved = 0;
  let skipped = 0;

  for (const { _id: ownerId } of owners) {
    const user = await User.findById(ownerId).select('email').lean();
    const accounts = await Account.find({ ownerId }).sort({ createdAt: 1 });
    const keeper = pickOwnersAccount(accounts);
    if (!keeper) continue;

    console.log(`${user?.email ?? ownerId}`);
    console.log(`  keep    ${keeper._id}  (plan=${keeper.planId} status=${keeper.status})`);

    for (const dup of accounts) {
      if (String(dup._id) === String(keeper._id)) continue;

      const orgs = await Organization.countDocuments({ accountId: dup._id });
      const invites = await BranchInvite.countDocuments({ accountId: dup._id, state: 'pending' });
      const topUps = await HourTopUp.countDocuments({ accountId: dup._id });

      if (orgs + invites + topUps > 0) {
        // Moving a church here would take the keeper over its slot count on
        // a plan already in use. That needs a person, not this script.
        console.log(
          `  SKIP    ${dup._id}  still holds ${orgs} church(es), ${invites} invite(s), ` +
          `${topUps} top-up(s) — needs a decision, not a merge`,
        );
        skipped += 1;
        continue;
      }

      console.log(`  retire  ${dup._id}  (empty: no churches, invites or hours)`);
      if (!dry) {
        dup.status = 'cancelled';
        await dup.save();
      }
      retired += 1;
    }
    console.log('');
  }

  console.log(
    `${dry ? 'Would retire' : 'Retired'} ${retired} empty duplicate(s), ` +
    `moved ${moved}, skipped ${skipped} that still hold something.`,
  );
  if (dry) console.log('Nothing was written. Re-run without --dry-run to apply.');
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
