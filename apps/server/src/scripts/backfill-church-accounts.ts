import dotenv from 'dotenv';
import { connectDB } from '../core/db.js';
import { Organization } from '../modules/organization/organization.model.js';
import { Account } from '../modules/organization/account.model.js';
import { ensureAccountFor, pickOwnersAccount } from '../modules/organization/account.service.js';
import { accountSlots } from '../modules/organization/account.model.js';

dotenv.config();

/**
 * Give every church without an `accountId` the account it should already have.
 *
 * NOT a handful of stragglers: 1,661 churches across 1,615 owners, because
 * neither creation path ever placed one (now fixed — see `placeOnAccount`).
 * Read the dry run before applying it; at that size the summary matters more
 * than any single line of it.
 *
 * An Account owns the subscription and Organizations consume its slots, so a
 * church with no `accountId` is outside the billing model entirely. Five were
 * found in production while auditing the trial-ended redirect. Nothing placed
 * them: `capabilitiesFor` answered UNRESOLVED, so the client granted the free
 * feature set, and `requireProductAccess` could not grant on the account and
 * fell through to legacy user flags that refused them on 33 routes. The
 * middleware no longer refuses an unplaceable caller, so this is no longer a
 * lock-out — but leaving a church unplaceable means its hours, storage and
 * features are all decided by fallbacks rather than by its plan.
 *
 * CREATES, NEVER REASSIGNS. A church that already has an `accountId` is not
 * touched, even if the row it points at is missing: repointing somebody's
 * church at a different account is a billing decision and not a migration.
 *
 * The work is done by `ensureAccountFor`, deliberately, rather than by
 * creating rows here:
 *
 *   - It attaches the church to the OWNER'S existing account when there is
 *     one, so a second church costs a slot instead of arriving with a plan of
 *     its own. Several of these owners may hold an account already.
 *   - Its claim is one conditional write that only matches a church still
 *     without an account, so running this twice, or alongside live traffic,
 *     cannot produce the duplicate accounts that a plain assignment did.
 *   - `trialGrantFor` decides the trial from the owner's legacy flags, so a
 *     church whose trial already lapsed lands on free rather than earning a
 *     second thirty days. This script must never be a way to reset a trial.
 *
 * Dry run (the default):  pnpm --filter @qworship/server backfill:church-accounts
 * Apply:                  pnpm --filter @qworship/server backfill:church-accounts --apply
 */
async function run() {
  await connectDB();
  const apply = process.argv.includes('--apply');

  const orphans: any[] = await Organization.find({
    $or: [{ accountId: { $exists: false } }, { accountId: null }],
  })
    .select('_id name ownerId')
    .lean();

  console.log(`\n${orphans.length} church(es) with no accountId.\n`);
  if (orphans.length === 0) process.exit(0);

  // Reported per church, because "joins the owner's existing account" and
  // "gets a new free one" are different outcomes and the second is the one
  // worth reading twice.
  //
  // The destination is worked out with `pickOwnersAccount` — the SAME
  // function `ensureAccountFor` uses — rather than by re-deriving the rule.
  // Re-deriving it got this wrong: "oldest live account" is not the rule. A
  // live STANDARD account wins over an older free one, so for an owner
  // holding both, a hand-rolled dry run promised the free account and the
  // apply would have attached the church to the one being paid for. The only
  // safety gate on this migration is somebody reading the dry run, so it has
  // to predict what the write does.
  const skipped: string[] = [];

  /*
   * THE PREVIEW HAS TO FOLLOW ITS OWN FOOTPRINTS.
   *
   * Queried against the pre-run state alone, the preview lied about exactly
   * the data this is being run for: two orphan churches under one owner who
   * holds no account printed "gets a new free account" twice, while the apply
   * creates one account for the first and attaches the second to it. The
   * per-destination counts were under-reported the same way. So the preview
   * carries what it has already decided — the account each owner will end up
   * with, and how many churches will have landed on each.
   */
  const plannedFor = new Map<string, string>();
  const landingOn = new Map<string, number>();

  for (const church of orphans) {
    console.log(`  - ${church.name} (${church._id})`);

    // A legacy row with no owner at all. Mongoose strips an `undefined`
    // filter value, so `{ ownerId: undefined }` would degrade to `{}` and
    // report this church joining the oldest account in the DATABASE — a
    // stranger's. And `ensureAccountFor(id, undefined)` would create an
    // account owned by nobody.
    if (!church.ownerId) {
      console.log('      NO OWNER — skipped. Needs a human: an account is owned by somebody.');
      skipped.push(String(church._id));
      continue;
    }

    const ownerKey = String(church.ownerId);
    const existing: any[] = await Account.find({ ownerId: church.ownerId })
      .sort({ createdAt: 1 })
      .lean();
    let destination: any = pickOwnersAccount(existing as any);

    // An account this run has already decided to create for the same owner.
    // The key is a sentinel, not an id — nothing exists yet — and it stands
    // in for the account the apply will make, so the counting below sees the
    // second orphan land on the first one's account.
    if (!destination && plannedFor.has(ownerKey)) {
      const planned = plannedFor.get(ownerKey)!;
      console.log(
        `      owner ${ownerKey} — joins the free account this run creates for` +
          ' their first orphan',
      );
      destination = { _id: planned, planId: 'free', status: 'active', slots: 1, bonusSlots: 0 };
    } else if (!destination) {
      console.log(`      owner ${ownerKey} — gets a new free account`);
      const planned = `planned:${ownerKey}`;
      plannedFor.set(ownerKey, planned);
      destination = { _id: planned, planId: 'free', status: 'active', slots: 1, bonusSlots: 0 };
    } else {
      console.log(
        `      owner ${ownerKey} — joins existing account ${destination._id}` +
          ` (${destination.planId}/${destination.status})`,
      );
    }

    // Flagged, not refused: `ensureAccountFor` attaches a church without
    // checking slots, so the migration can leave a free account quietly
    // running two churches — which onboarding would have refused. Whether to
    // charge for the slot, or leave it, is a billing decision and not this
    // script's to make.
    //
    // Capacity is `accountSlots`, plan slots PLUS any admin grant: reading
    // `slots` alone called an account with a bonus slot over its allowance
    // when it was within it.
    const destKey = String(destination._id);
    if (!landingOn.has(destKey)) {
      // A planned account holds nothing yet; a real one is counted once.
      landingOn.set(
        destKey,
        destKey.startsWith('planned:')
          ? 0
          : await Organization.countDocuments({ accountId: destination._id }),
      );
    }
    const position = (landingOn.get(destKey) ?? 0) + 1;
    landingOn.set(destKey, position);

    const capacity = accountSlots(destination);
    if (position > capacity) {
      console.log(
        `      OVER ALLOWANCE: would be church ${position} on ${capacity} slot(s).` +
          ' Placing it is still better than leaving it unplaceable, but the slot is unpaid.',
      );
    }
  }

  if (skipped.length) {
    console.log(`\n${skipped.length} church(es) skipped for having no owner.`);
  }

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write.\n');
    process.exit(0);
  }

  console.log('\nApplying…\n');
  let placed = 0;
  for (const church of orphans) {
    if (!church.ownerId) continue;
    try {
      // NO NEW TRIALS. There are 1,661 of these churches across 1,615
      // owners, so the default — a fresh thirty days for anybody who has
      // never trialed — would start roughly 1,600 trials in one command.
      // Placing a church is a data fix; handing out the product for a month
      // is a commercial decision and not this script's to make. A trial
      // already in flight is still inherited, and nobody's eligibility is
      // spent: `trialStartedAt` stays unset, so they can still have their
      // one run through the ordinary path.
      const account = await ensureAccountFor(church._id, church.ownerId, {
        startNewTrial: false,
      });
      const fresh: any = await Organization.findById(church._id).select('accountId').lean();
      const ok = String(fresh?.accountId) === String(account._id);
      console.log(`  ${ok ? 'OK  ' : 'HM  '} ${church.name} -> ${account._id} (${account.planId}/${account.status})`);
      if (ok) placed += 1;
      // `ensureAccountFor` retires the loser of a race and returns the
      // winner's account, so a mismatch here is not a failure — it means
      // something else claimed the church first. Reported rather than
      // retried, because the church IS placed either way.
      if (!ok) console.log(`      claimed meanwhile by ${fresh?.accountId ?? 'nothing'} — left as found`);
    } catch (error: any) {
      console.log(`  FAIL ${church.name}: ${error?.message ?? error}`);
    }
  }

  console.log(`\nPlaced ${placed} of ${orphans.filter((c) => c.ownerId).length} with an owner.\n`);
  process.exit(0);
}
run().catch((error) => { console.error(error); process.exit(1); });
