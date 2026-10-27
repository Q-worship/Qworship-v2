import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { connectDB } from '../src/core/db.js';
import { getJwtSecret } from '../src/modules/auth/auth.middleware.js';
import { User } from '../src/modules/auth/auth.model.js';
import { Organization } from '../src/modules/organization/organization.model.js';
import { Membership } from '../src/modules/organization/membership.model.js';
import { Account } from '../src/modules/organization/account.model.js';
import { BranchInvite } from '../src/modules/organization/branch-invite.model.js';
dotenv.config();

const BASE = process.env.TEST_BASE || 'http://localhost:5001';
let pass = 0, fail = 0;
const check = (l: string, ok: boolean, d = '') => { ok ? (pass++, console.log(`  PASS  ${l}`)) : (fail++, console.log(`  FAIL  ${l}${d ? ' :: ' + d : ''}`)); };

async function api(path: string, token: string, method = 'GET', body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function makeChurch(label: string) {
  const user = await User.create({ email: `br-${label}-${Date.now()}@qworship.test`, emailVerified: true, isActive: true, onboardingStatus: 'pending' });
  const org = await Organization.create({ name: `${label} Church`, ownerId: user._id });
  await Membership.updateOne({ userId: user._id, organizationId: org._id }, { $set: { role: 'owner' } }, { upsert: true });
  await User.updateOne({ _id: user._id }, { $set: { activeOrganizationId: org._id } });
  const token = jwt.sign({ id: String(user._id) }, getJwtSecret(), { expiresIn: '1h' });
  return { user, org, token };
}

async function main() {
  await connectDB();
  const parent = await makeChurch('Parent');
  const branch = await makeChurch('Branch');
  const cleanup: any[] = [parent, branch];

  console.log('--- Plan catalog and default subscription ---');
  const plans = await api('/api/plans', parent.token);
  check('GET /plans returns the catalog', plans.status === 200 && plans.json?.plans?.length === 2, JSON.stringify(plans.json?.plans?.map((p: any) => p.id)));

  const sub0 = await api('/api/subscription', parent.token);
  check('a church starts on the free plan', sub0.json?.subscription?.planId === 'free', JSON.stringify(sub0.json?.subscription));
  check('free plan has 1 slot', sub0.json?.subscription?.slots?.total === 1, JSON.stringify(sub0.json?.subscription?.slots));

  console.log('\n--- Free plan cannot hold a branch ---');
  const tooMany = await api('/api/branches/invite', parent.token, 'POST', { method: 'code' });
  check('inviting on a full free plan is refused', tooMany.status === 409, `status ${tooMany.status} ${tooMany.json?.message}`);

  console.log('\n--- Upgrading to Standard ---');
  const up = await api('/api/subscription/plan', parent.token, 'POST', { planId: 'standard', packs: 1 });
  check('upgrade succeeds', up.status === 200, `status ${up.status} ${JSON.stringify(up.json)}`);
  check('10 slots now', up.json?.subscription?.slots?.total === 10, JSON.stringify(up.json?.subscription?.slots));
  check('price is 15.99', up.json?.subscription?.monthlyPrice === 15.99, `${up.json?.subscription?.monthlyPrice}`);
  check('20 pooled hours', up.json?.subscription?.hours?.allowance === 20, JSON.stringify(up.json?.subscription?.hours));

  const twoPacks = await api('/api/subscription/plan', parent.token, 'POST', { planId: 'standard', packs: 2 });
  check('two packs give 20 slots at 31.98', twoPacks.json?.subscription?.slots?.total === 20 && twoPacks.json?.subscription?.monthlyPrice === 31.98,
    `${twoPacks.json?.subscription?.slots?.total} slots, $${twoPacks.json?.subscription?.monthlyPrice}`);
  await api('/api/subscription/plan', parent.token, 'POST', { planId: 'standard', packs: 1 });

  console.log('\n--- Inviting a branch by code ---');
  const inv = await api('/api/branches/invite', parent.token, 'POST', { method: 'code' });
  check('invite created with a code', inv.status === 201 && !!inv.json?.invite?.code, JSON.stringify(inv.json));
  check('the pending invite reserves a slot', inv.json?.slots?.pendingInvites === 1 && inv.json?.slots?.used === 2,
    JSON.stringify(inv.json?.slots));
  const code = inv.json?.invite?.code;

  console.log('\n--- Only the invited church can accept ---');
  const selfAccept = await api('/api/branches/accept', parent.token, 'POST', { code });
  check('a church cannot make itself its own branch', selfAccept.status >= 400, `status ${selfAccept.status}`);

  const accepted = await api('/api/branches/accept', branch.token, 'POST', { code });
  check('the invited church accepts', accepted.status === 200, `status ${accepted.status} ${JSON.stringify(accepted.json)}`);

  const afterJoin = await api('/api/branches', parent.token);
  check('the network now lists two churches', afterJoin.json?.branches?.length === 2, JSON.stringify(afterJoin.json?.branches?.map((b: any) => b.name)));
  check('one is marked the parent', afterJoin.json?.branches?.filter((b: any) => b.isParent).length === 1,
    JSON.stringify(afterJoin.json?.branches?.map((b: any) => ({ n: b.name, p: b.isParent }))));
  check('the invite no longer holds a slot', afterJoin.json?.slots?.pendingInvites === 0 && afterJoin.json?.slots?.used === 2,
    JSON.stringify(afterJoin.json?.slots));

  console.log('\n--- A used code cannot be reused ---');
  const third = await makeChurch('Third'); cleanup.push(third);
  const reuse = await api('/api/branches/accept', third.token, 'POST', { code });
  check('reusing a spent code is refused', reuse.status === 404, `status ${reuse.status}`);

  console.log('\n--- Downgrade is blocked while churches are in use ---');
  const down = await api('/api/subscription/plan', parent.token, 'POST', { planId: 'free' });
  check('downgrade that would strand a branch is refused', down.status === 409, `status ${down.status}`);
  check('the refusal explains what to release', /release/i.test(down.json?.message || ''), down.json?.message);

  console.log('\n--- Removing a branch frees its slot and restores its independence ---');
  const removed = await api(`/api/branches/${branch.org._id}`, parent.token, 'DELETE');
  check('branch removed', removed.status === 200, `status ${removed.status} ${JSON.stringify(removed.json)}`);
  check('slot released', removed.json?.slots?.used === 1, JSON.stringify(removed.json?.slots));
  const branchSub = await api('/api/subscription', branch.token);
  check('the removed branch is back on its own free plan', branchSub.json?.subscription?.planId === 'free',
    JSON.stringify(branchSub.json?.subscription));
  const branchDoc = await Organization.findById(branch.org._id).lean();
  check('its parent link is cleared', !branchDoc?.parentOrganizationId, `${branchDoc?.parentOrganizationId}`);

  console.log('\n--- Cleanup ---');
  const userIds = cleanup.map(c => c.user._id);
  const orgIds = cleanup.map(c => c.org._id);
  const accountIds = (await Organization.find({ _id: { $in: orgIds } }).select('accountId').lean()).map(o => o.accountId).filter(Boolean);
  await Promise.all([
    User.deleteMany({ _id: { $in: userIds } }),
    Organization.deleteMany({ _id: { $in: orgIds } }),
    Membership.deleteMany({ userId: { $in: userIds } }),
    Account.deleteMany({ $or: [{ _id: { $in: accountIds as any } }, { ownerId: { $in: userIds } }] }),
    BranchInvite.deleteMany({ invitedBy: { $in: userIds } }),
  ]);
  console.log('  test data removed');
  console.log(`\n${pass} passed, ${fail} failed`);
  await mongoose.connection.close();
  process.exit(fail ? 1 : 0);
}
main().catch(async e => { console.error(e); try { await mongoose.connection.close(); } catch {} process.exit(1); });
