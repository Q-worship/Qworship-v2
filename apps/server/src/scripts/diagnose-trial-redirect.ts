import dotenv from 'dotenv';
import { connectDB } from '../core/db.js';
import { Account } from '../modules/organization/account.model.js';
import { Organization } from '../modules/organization/organization.model.js';
import { Membership } from '../modules/organization/membership.model.js';
import { User } from '../modules/auth/auth.model.js';
import { bestOfTheirChurches, capabilitiesForAccount } from '../modules/billing/capability.service.js';

dotenv.config();

/**
 * READ ONLY. Why one person is — or is not — held on the trial-ended screen.
 *
 * Writes nothing, anywhere. It replays the decision by hand against the rows
 * as they actually are.
 *
 * WHAT THE GUARD READS, AND WHAT IT NO LONGER READS.
 *
 * `AuthGuard` used to redirect on `user.trialStatus === "expired"` — a
 * per-user flag that no system owned. It now asks `capabilities.trialExpired`,
 * computed from the ACCOUNT. This script asks the same way, by calling
 * `capabilitiesForAccount` rather than reimplementing it: a diagnostic
 * carrying its own copy of the rule is how you end up confidently reporting a
 * lock-out that no longer exists.
 *
 * `trialStatus` is still printed, because admin listings and reporting read
 * it and a stale one is worth noticing. It is NOT what gates anybody. If it
 * disagrees with the account below, the account is right and
 * `backfill:settled-trials` is how you reconcile it.
 *
 * Run with: pnpm --filter @qworship/server diagnose:redirect <email>
 *           pnpm --filter @qworship/server diagnose:redirect --stuck
 *
 * Note --stuck selects on the LEGACY flag, so it finds people whose flag is
 * stale as well as anybody actually held — which is the point. Read the
 * verdict, not the selection.
 */

async function diagnose(user: any) {
  const line = (k: string, v: unknown) => console.log(`  ${k.padEnd(26)} ${String(v)}`);
  console.log(`\n────────────────────────────────────────────────────────`);
  console.log(`USER  ${user.email}  (${user._id})`);
  line('trialStatus (legacy)', `${user.trialStatus}  — reporting only, gates nothing`);
  line('trialEndDate (legacy)', user.trialEndDate ?? '—');
  line('subscriptionStatus', user.subscriptionStatus);
  line('onboardingStatus', user.onboardingStatus);
  line('activeOrganizationId', user.activeOrganizationId ?? '— (none)');

  const memberships = await Membership.find({ userId: user._id }).lean();
  const ownedOrgs = await Organization.find({ ownerId: user._id }).select('_id name accountId').lean();
  line('memberships', memberships.length);
  line('churches owned', ownedOrgs.length);

  // --- 1. Which church a request of theirs resolves. ---
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
  console.log(`\n  RESOLVES CHURCH VIA: ${resolution}`);

  const org: any = resolvedOrgId
    ? await Organization.findById(resolvedOrgId).select('_id name accountId ownerId').lean()
    : null;
  if (org) {
    line('church', `${org.name} (${org._id})`);
    line('church.accountId', org.accountId ?? '— (none yet)');
  }

  // --- 2. The account, exactly as the capabilities endpoint would find it. ---
  //
  // `capabilitiesFor` reads `organization.accountId` and nothing else. A
  // church without one answers UNRESOLVED, so the owner's other accounts are
  // deliberately NOT consulted here: guessing would report a verdict the
  // product never reaches.
  const account: any = org?.accountId ? await Account.findById(org.accountId).lean() : null;

  // Staff first, because `capabilitiesFor` short-circuits them before it
  // reads a church at all — so the no-account narrative below never applies
  // to them, whatever their own account says.
  const staff = user.role === 'admin' || user.role === 'superadmin';
  if (staff) {
    console.log('\n  STAFF: capabilities answer standard, not trialing, no days left, and');
    console.log('    the church is never read. NOT held, and no gate refuses them.');
    return;
  }

  /*
   * Ambiguous: several churches and none marked active, so resolution
   * returns nothing and capabilities are answered from the BEST plan among
   * their own churches. Printed by calling that function, not by describing
   * it — the script said "the feature gates refuse" for these callers while
   * the endpoint was handing some of them the whole Standard set.
   */
  if (!org && memberships.length > 1) {
    const best = await bestOfTheirChurches(user._id);
    console.log('  AMBIGUOUS: several churches, none active. Resolution returns nothing,');
    console.log('    so capabilities answer with the best plan among their churches:');
    line('  planId', best.planId);
    line('  trialing', best.trialing);
    line('  trialExpired', best.trialExpired);
    line('  resolved', best.resolved);
    console.log(`  CLIENT GUARD: ${best.trialExpired ? 'HOLDS them on /account' : 'lets them through'}`);
    console.log(`  FEATURE GATES: ${best.resolved
      ? 'enforce that plan'
      : 'pass — their churches could not be loaded at all'}`);
    return;
  }

  if (!account) {
    console.log('  ACCOUNT: none on the church yet.');
    console.log('  => NOT held. `GET /billing/capabilities` — the route the guard reads —');
    console.log('     goes through `requireAccount`, so `ensureAccountFor` CREATES the');
    console.log('     account on that very request. It is free, or inherits a legacy');
    console.log('     trial; never a fresh thirty days, since `trialGrantFor` reads the');
    console.log('     owner\'s lapsed flag.');
    console.log('     THE FEATURE GATES REFUSE, THOUGH, and that is current: a resolved');
    console.log('     church with no account now reads as FREE confidently rather than');
    console.log('     unresolved, so premium features answer 402 FEATURE_NOT_IN_PLAN');
    console.log('     until the account exists. New churches are placed at creation');
    console.log('     (`placeOnAccount`); `backfill:church-accounts` covers the legacy');
    console.log('     rows, including a church whose owner never signs in.');
    return;
  }

  line('account', account._id);
  line('account.planId / status', `${account.planId} / ${account.status}`);
  line('account.trialEndsAt', account.trialEndsAt ?? '—');

  // Staff returned above, before any of this: `capabilitiesFor` replaces
  // their verdict whole rather than patching a field of the account's.
  const caps = capabilitiesForAccount(account);
  console.log('');
  line('capabilities.planId', caps.planId);
  line('capabilities.trialing', caps.trialing);
  line('capabilities.trialExpired', caps.trialExpired);

  // --- 3. The verdict, from the one field the guard actually reads. ---
  console.log(`\n  CLIENT GUARD: ${caps.trialExpired
    ? 'HOLDS them on /account — every route but /dashboard-subscription'
    : 'lets them through'}`);

  if (caps.trialExpired) {
    console.log('    The trial has lapsed and the account has not settled. This is the');
    console.log('    window before the hourly sweep (`expireLapsedTrials`) moves it onto');
    console.log('    free — or it is a sweep that is not running. Check the scheduler');
    console.log('    before assuming anybody is stuck: settling is what releases them,');
    console.log('    and "Continue with the free plan" does the same thing on demand.');
  } else if (caps.planId === 'free' && !caps.trialing) {
    console.log('    Settled on free. A free church is a customer in good standing, not');
    console.log('    a lapsed trial, so there is nothing to clear and nothing to press.');
  }

  if (user.trialStatus === 'expired' && !caps.trialExpired) {
    console.log('\n  STALE FLAG: `trialStatus` still reads "expired" while the account says');
    console.log('    otherwise. Harmless to the guard, which no longer reads it, but admin');
    console.log('    listings and reporting do. `backfill:settled-trials` reconciles it.');
  }
}

async function run() {
  await connectDB();
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const stuckMode = process.argv.includes('--stuck');

  const users = stuckMode
    ? await User.find({ trialStatus: 'expired' }).select('email role trialStatus trialEndDate subscriptionStatus onboardingStatus activeOrganizationId').lean()
    : await User.find({ email: { $in: args.map((a) => a.toLowerCase()) } }).lean();

  if (!users.length) { console.log('No matching user. Pass an email, or --stuck for everyone carrying the legacy flag.'); process.exit(1); }
  console.log(`\n${users.length} user(s) to look at. Nothing below writes anything.`);
  for (const user of users) await diagnose(user);
  console.log('\n');
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
