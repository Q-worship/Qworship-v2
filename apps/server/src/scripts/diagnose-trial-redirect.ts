import dotenv from 'dotenv';
import { connectDB } from '../core/db.js';
import { Account } from '../modules/organization/account.model.js';
import { Organization } from '../modules/organization/organization.model.js';
import { Membership } from '../modules/organization/membership.model.js';
import { User } from '../modules/auth/auth.model.js';

dotenv.config();

/**
 * READ ONLY. Why one person is — or is not — stuck on the trial-ended screen.
 *
 * Writes nothing, anywhere. It replays the two decisions by hand against the
 * rows as they actually are:
 *
 *   1. AuthGuard, which redirects to /account on `user.trialStatus ===
 *      "expired"` and reads NOTHING else — not the account, not the plan.
 *   2. "Continue with the free plan", which is the only thing that ever
 *      clears that flag, and which clears it only under conditions this
 *      prints one by one.
 *
 * Run with: pnpm --filter @qworship/server diagnose:redirect <email>
 *           pnpm --filter @qworship/server diagnose:redirect --stuck
 */

async function diagnose(user: any) {
  const line = (k: string, v: unknown) => console.log(`  ${k.padEnd(26)} ${String(v)}`);
  console.log(`\n────────────────────────────────────────────────────────`);
  console.log(`USER  ${user.email}  (${user._id})`);
  line('trialStatus', user.trialStatus);
  line('trialEndDate', user.trialEndDate ?? '—');
  line('subscriptionStatus', user.subscriptionStatus);
  line('onboardingStatus', user.onboardingStatus);
  line('activeOrganizationId', user.activeOrganizationId ?? '— (none)');

  const memberships = await Membership.find({ userId: user._id }).lean();
  const ownedOrgs = await Organization.find({ ownerId: user._id }).select('_id name accountId').lean();
  line('memberships', memberships.length);
  line('churches owned', ownedOrgs.length);

  // --- 1. What the client guard does, on this row alone. ---
  const guardBlocks = user.trialStatus === 'expired';
  console.log(`\n  CLIENT GUARD: ${guardBlocks
    ? 'REDIRECTS every route except /dashboard-subscription to /account'
    : 'lets them through'}`);

  // --- 2. Which church (and account) a billing call would resolve. ---
  let resolvedOrgId: any = null;
  let resolution = '';
  if (user.activeOrganizationId) {
    const ok = memberships.find((m) => String(m.organizationId) === String(user.activeOrganizationId));
    if (ok) { resolvedOrgId = user.activeOrganizationId; resolution = 'stored active church'; }
  }
  if (!resolvedOrgId) {
    if (memberships.length === 1) { resolvedOrgId = memberships[0].organizationId; resolution = 'their only membership'; }
    else if (memberships.length > 1) { resolution = 'SEVERAL churches and no active one — resolver returns null'; }
    else if (ownedOrgs.length) { resolvedOrgId = ownedOrgs[0]._id; resolution = 'legacy owner church, adopted in passing'; }
    else { resolution = 'no church at all'; }
  }
  console.log(`  RESOLVES CHURCH VIA: ${resolution}`);

  if (!resolvedOrgId) {
    console.log('  => /billing/continue-free answers 400 "No church resolved for this request".');
    console.log('     The button shows an error toast and the flag is NEVER cleared. STUCK.');
    return;
  }

  const org: any = await Organization.findById(resolvedOrgId).select('_id name accountId ownerId').lean();
  line('church', `${org?.name} (${org?._id})`);
  line('church.accountId', org?.accountId ?? '— (none yet)');

  // --- 3. The account that church sits on. ---
  const ownersAccounts = await Account.find({ ownerId: org?.ownerId }).sort({ createdAt: 1 }).lean();
  const account: any = org?.accountId
    ? await Account.findById(org.accountId).lean()
    : ownersAccounts.filter((a) => a.status !== 'cancelled').find((a) => a.planId === 'standard')
      ?? ownersAccounts.filter((a) => a.status !== 'cancelled')[0]
      ?? ownersAccounts[0];

  if (!account) { console.log('  => No account at all; one would be created on the next billing call.'); return; }
  line('account', account._id);
  line('account.planId / status', `${account.planId} / ${account.status}`);
  line('account.trialEndsAt', account.trialEndsAt ?? '—');
  line("owner's live accounts", ownersAccounts.filter((a) => a.status !== 'cancelled').length);

  // --- 4. Replay settleToFree + syncLegacyEntitlement, without writing. ---
  const wouldSettle = !(account.planId === 'standard')
    && !(account.status === 'active' && account.planId === 'free');
  const paid = account.planId === 'standard' && account.status !== 'cancelled';
  const settledOnFree = account.planId === 'free' && account.status === 'active' && !paid;

  const churchesOnAccount = await Organization.find({ accountId: account._id }).select('_id').lean();
  const memberIds = churchesOnAccount.length
    ? (await Membership.find({ organizationId: { $in: churchesOnAccount.map((c) => c._id) } }).select('userId').lean())
        .map((m) => String(m.userId))
    : [];
  const mirrorReachesUser = memberIds.includes(String(user._id));

  console.log('\n  PRESSING "Continue with the free plan":');
  console.log(`    settleToFree would change the account   ${wouldSettle}`);
  console.log(`    mirror sees it as settled-on-free       ${wouldSettle ? true : settledOnFree}`);
  console.log(`    churches found under the account        ${churchesOnAccount.length}`);
  console.log(`    this user is among its members          ${mirrorReachesUser}`);

  const clears = (wouldSettle || settledOnFree) && mirrorReachesUser && user.trialStatus === 'expired';
  if (!guardBlocks) {
    console.log('    => Nothing to clear; this person is not being redirected.');
  } else if (clears) {
    console.log('    => The flag WOULD be cleared to "cancelled". They get out.');
  } else if (paid) {
    console.log('    => Account is PAID, so the mirror sets trialStatus "converted". They get out,');
    console.log('       but only once a billing call runs the mirror — the guard never asks the account.');
  } else {
    console.log('    => NOTHING CLEARS THE FLAG. The screen says the free plan is in place,');
    console.log('       /me still answers "expired", and the next route bounces them back. STUCK.');
  }
}

async function run() {
  await connectDB();
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const stuckMode = process.argv.includes('--stuck');

  const users = stuckMode
    ? await User.find({ trialStatus: 'expired' }).select('email trialStatus trialEndDate subscriptionStatus onboardingStatus activeOrganizationId').lean()
    : await User.find({ email: { $in: args.map((a) => a.toLowerCase()) } }).lean();

  if (!users.length) { console.log('No matching user. Pass an email, or --stuck for everyone carrying the flag.'); process.exit(1); }
  console.log(`\n${users.length} user(s) to look at. Nothing below writes anything.`);
  for (const user of users) await diagnose(user);
  console.log('\n');
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
