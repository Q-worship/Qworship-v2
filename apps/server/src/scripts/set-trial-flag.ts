import dotenv from 'dotenv';
import { connectDB } from '../core/db.js';
import { User } from '../modules/auth/auth.model.js';

dotenv.config();

/**
 * TEST HELPER. Sets ONE user's legacy trial flag, by email.
 *
 * This is the flag that decides the trial-ended screen. `App.tsx` redirects
 * to /account on `user.trialStatus === 'expired'` and reads nothing else, so
 * expiring the ACCOUNT (`tmp-trial-toggle.ts`) does NOT produce that screen —
 * it changes the plan and the allowance and lets the person walk straight in.
 * If you are trying to see the screen, this is the script.
 *
 * UPDATE ONLY, one document, one field. No hidden state: the value you want
 * is an argument both ways, so putting somebody back is the same command with
 * a different status rather than a restore that depends on what this script
 * happened to remember.
 *
 *   pnpm --filter @qworship/server set:trial-flag -- --email a@b.com --status expired
 *   pnpm --filter @qworship/server set:trial-flag -- --email a@b.com --status active
 *
 * After flipping, RELOAD the app: the client caches the user, and the guard
 * re-reads it from /auth/me on mount.
 *
 * Note that clicking "Continue with Free Plan" during a test moves the flag
 * to `cancelled` and the screen stops appearing — re-run with `expired` to
 * test it again.
 */
const VALID = ['not_started', 'active', 'expired', 'converted', 'cancelled'] as const;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function run() {
  const email = arg('email');
  const status = arg('status') as (typeof VALID)[number] | undefined;

  if (!email || !status || !VALID.includes(status)) {
    console.error('Usage: --email <address> --status <' + VALID.join('|') + '>');
    process.exit(1);
  }

  await connectDB();
  const user: any = await User.findOne({ email });
  if (!user) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }

  console.log('BEFORE:', {
    email: user.email,
    trialStatus: user.trialStatus,
    trialEndDate: user.trialEndDate,
  });

  // A trial flag reading `active` with an end date in the past is flipped
  // straight back to `expired` by /auth/me on the next request, so say so
  // rather than letting a test look as though it failed.
  if (status === 'active' && user.trialEndDate && user.trialEndDate <= new Date()) {
    console.warn(
      `\nWARNING: trialEndDate (${user.trialEndDate.toISOString()}) is in the past.\n` +
      `"active" will be flipped back to "expired" on this user's next request.\n`,
    );
  }

  user.trialStatus = status;
  await user.save();

  console.log('AFTER: ', { email: user.email, trialStatus: user.trialStatus });
  console.log('\nReload the app for the change to take effect.');
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
