import dotenv from 'dotenv';
import { connectDB } from '../core/db.js';
import { Account } from '../modules/organization/account.model.js';
import { User } from '../modules/auth/auth.model.js';

dotenv.config();

/**
 * READ ONLY. Every account carrying a trial, and how long it has left.
 *
 * Worth keeping rather than being a one-off, because the two things it shows
 * are both easy to get wrong and invisible otherwise.
 *
 * LEFT is the number that matters. RAN can look alarming on accounts whose
 * `trialStartedAt` was carried over from the old user-level trial — a trial
 * reading 196 days did not run for 196 days of OUR trial, it inherited a
 * start date from May. Nothing is wrong with those rows; read the right
 * column.
 *
 * It also flags more than one account under a single owner, which should not
 * happen: an Account owns the subscription and Organizations consume its
 * slots, so a second account for the same person is a second free plan.
 *
 * Run with: pnpm --filter @qworship/server audit:trials
 */
const DAY = 24 * 60 * 60 * 1000;

async function run() {
  await connectDB();
  const accounts = await Account.find({ trialEndsAt: { $exists: true } })
    .select('_id ownerId planId status trialStartedAt trialEndsAt trialHours')
    .lean();

  const now = Date.now();
  console.log(`\n${accounts.length} accounts carry trial dates.\n`);
  // Count LIVE accounts only. A retired duplicate is already dealt with —
  // merge:duplicate-accounts cancels rather than deletes them — and flagging
  // it forever would train everybody to ignore this column.
  const byOwner = new Map<string, number>();
  for (const a of accounts) {
    if (a.status === 'cancelled') continue;
    byOwner.set(String(a.ownerId), (byOwner.get(String(a.ownerId)) ?? 0) + 1);
  }
  console.log('ACCOUNT                   OWNER                      STATUS     STARTED     ENDS        RAN   LEFT');

  for (const a of accounts) {
    const owner = await User.findById(a.ownerId).select('email').lean();
    const started = a.trialStartedAt ? new Date(a.trialStartedAt) : null;
    const ends = new Date(a.trialEndsAt!);
    const ran = started ? Math.round((ends.getTime() - started.getTime()) / DAY) : NaN;
    const left = Math.round((ends.getTime() - now) / DAY);
    console.log(
      `${String(a._id).padEnd(25)} ${String(owner?.email ?? '?').padEnd(26)} ` +
      `${String(a.status).padEnd(10)} ${started ? started.toISOString().slice(0,10) : '?'.padEnd(10)}  ` +
      `${ends.toISOString().slice(0,10)}  ${String(ran).padStart(4)}d ${String(left).padStart(5)}d` +
      `${left > 30 ? '   <-- over a month left' : ''}` +
      `${a.status === 'cancelled' ? '   (retired duplicate)' : ''}` +
      `${(byOwner.get(String(a.ownerId)) ?? 0) > 1 ? '   <-- owner has several LIVE accounts' : ''}`,
    );
  }

  const duplicated = [...byOwner.values()].filter((n) => n > 1).length;
  if (duplicated > 0) {
    console.log(
      `\n${duplicated} owner(s) hold more than one LIVE account. An Account owns ` +
      `the subscription and Organizations consume its slots, so a second account ` +
      `is a second free plan. ensureAccountFor no longer creates these; clear up ` +
      `existing ones with merge:duplicate-accounts (which only retires EMPTY ` +
      `duplicates, and reports any that still hold a church).`,
    );
  } else {
    console.log('\nNo owner holds more than one live account.');
  }
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
