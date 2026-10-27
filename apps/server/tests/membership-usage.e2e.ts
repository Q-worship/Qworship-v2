import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import WebSocket from 'ws';
import { connectDB } from '../src/core/db.js';
import { getJwtSecret } from '../src/modules/auth/auth.middleware.js';
import { User } from '../src/modules/auth/auth.model.js';
import { Organization } from '../src/modules/organization/organization.model.js';
import { Membership } from '../src/modules/organization/membership.model.js';
import { TranscriptionSession, UsageCounter } from '../src/modules/usage/usage.model.js';

dotenv.config();

const BASE = process.env.TEST_BASE || 'http://localhost:5000';
const WS_BASE = BASE.replace('http', 'ws');
const EMAIL = `e2e-${Date.now()}@qworship.test`;

let pass = 0, fail = 0;
function check(label: string, ok: boolean, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? ' :: ' + detail : ''}`); }
}

async function api(path: string, token: string, method = 'GET', body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function main() {
  await connectDB();
  console.log(`database: ${mongoose.connection.name}\n`);

  // A verified user, created directly so the test does not depend on email flows.
  const user = await User.create({
    email: EMAIL, firstName: 'E2E', lastName: 'Test',
    emailVerified: true, isActive: true, onboardingStatus: 'pending',
  });
  const token = jwt.sign({ id: String(user._id) }, getJwtSecret(), { expiresIn: '1h' });
  console.log(`test user: ${EMAIL} (${user._id})\n`);

  console.log('--- Onboarding creates a church and an owner membership ---');
  const before = await api('/api/onboarding', token);
  check('GET /onboarding works with no church yet', before.status === 200 && !before.json?.onboarding?.organization,
    `status ${before.status}, org ${JSON.stringify(before.json?.onboarding?.organization)}`);

  const created = await api('/api/onboarding/organization', token, 'PUT', {
    churchName: 'E2E First Church', denomination: 'Baptist', country: 'Nigeria', city: 'Lagos', zip: '100001',
  });
  check('PUT /onboarding/organization creates the church', created.status === 200 && !!created.json?.organization?._id,
    `status ${created.status} ${JSON.stringify(created.json)}`);

  const orgId = created.json?.organization?._id;
  const membership = await Membership.findOne({ userId: user._id, organizationId: orgId }).lean();
  check('an owner Membership row was created', membership?.role === 'owner', `got ${JSON.stringify(membership)}`);

  const refreshed = await User.findById(user._id).lean();
  check('activeOrganizationId was set on the user', !!orgId && String((refreshed as any)?.activeOrganizationId) === String(orgId),
    `got ${(refreshed as any)?.activeOrganizationId}`);

  console.log('\n--- Editing the church updates it, never creates a second one ---');
  const edited = await api('/api/onboarding/organization', token, 'PUT', {
    churchName: 'E2E Renamed Church', denomination: 'Baptist', country: 'Nigeria', city: 'Lagos', zip: '100001',
  });
  check('rename returns 200', edited.status === 200, `status ${edited.status}`);
  check('rename kept the same church id', !!orgId && String(edited.json?.organization?._id) === String(orgId),
    `was ${orgId}, now ${edited.json?.organization?._id}`);
  const orgCount = await Organization.countDocuments({ ownerId: user._id });
  check('exactly one church exists for this user', orgCount === 1, `found ${orgCount}`);
  const memCount = await Membership.countDocuments({ userId: user._id });
  check('exactly one membership exists', memCount === 1, `found ${memCount}`);

  console.log('\n--- /api/auth/me resolves churches through memberships ---');
  const me = await api('/api/auth/me', token);
  check('GET /auth/me returns 200', me.status === 200, `status ${me.status}`);
  // organizations is a sibling of user in this response, not nested inside it.
  check('it lists the church', !!orgId && me.json?.organizations?.some((o: any) => String(o.id) === String(orgId)),
    JSON.stringify(me.json?.organizations));

  console.log('\n--- A church the user does not belong to is invisible ---');
  const stranger = await Organization.create({ name: 'Someone Elses Church', ownerId: new mongoose.Types.ObjectId() });
  const forbidden = await api(`/api/organization/${stranger._id}`, token);
  check('GET /organization/:id on a foreign church is 404', forbidden.status === 404, `status ${forbidden.status}`);
  const forbiddenWrite = await api(`/api/organization/${stranger._id}`, token, 'PUT', { name: 'Hijacked' });
  check('PUT /organization/:id on a foreign church is refused', forbiddenWrite.status === 404 || forbiddenWrite.status === 403,
    `status ${forbiddenWrite.status}`);
  const stillNamed = await Organization.findById(stranger._id).lean();
  check('the foreign church was not renamed', stillNamed?.name === 'Someone Elses Church', `name is ${stillNamed?.name}`);

  console.log('\n--- Own church is readable and writable ---');
  const own = await api(`/api/organization/${orgId}`, token);
  check('GET own church is 200', own.status === 200, `status ${own.status}`);
  const ownWrite = await api(`/api/organization/${orgId}`, token, 'PUT', { city: 'Abuja' });
  check('PUT own church is 200', ownWrite.status === 200, `status ${ownWrite.status}`);
  check('the update applied', ownWrite.json?.organization?.city === 'Abuja', `city ${ownWrite.json?.organization?.city}`);

  console.log('\n--- Usage metering ---');
  const usageBefore = await api('/api/usage/me', token);
  check('GET /usage/me is 200', usageBefore.status === 200, `status ${usageBefore.status} ${JSON.stringify(usageBefore.json)}`);
  check('usage starts at zero', usageBefore.json?.usage?.billableSeconds === 0, JSON.stringify(usageBefore.json?.usage));

  // Stream 2 seconds of loud audio. Deepgram may reject the key; the meter counts
  // bytes forwarded regardless, which is what is under test here.
  const ws = new WebSocket(`${WS_BASE}/api/bible/audio-stream?token=${encodeURIComponent(token)}`);
  let opened = false;
  let closeCode = 0;
  const streamed = await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), 15000);
    ws.on('open', async () => {
      opened = true;
      const frame = Buffer.alloc(3200); // 100ms at 16kHz 16-bit
      for (let i = 0; i < frame.length; i += 2) frame.writeInt16LE(Math.round(8000 * Math.sin(i / 6)), i);
      for (let n = 0; n < 20; n++) {
        ws.send(frame);
        await new Promise((r) => setTimeout(r, 50));
      }
      await new Promise((r) => setTimeout(r, 1500));
      ws.close();
    });
    ws.on('close', (code) => { clearTimeout(timer); closeCode = code; resolve(true); });
    ws.on('error', () => { clearTimeout(timer); resolve(false); });
  });
  check('authenticated socket was accepted (not 4401/4403)', opened && closeCode !== 4401 && closeCode !== 4403,
    `opened ${opened}, close code ${closeCode}`);
  check('the stream completed', streamed, `close code ${closeCode}`);

  await new Promise((r) => setTimeout(r, 2500)); // let the final flush land

  const session = await TranscriptionSession.findOne({ userId: user._id }).lean();
  check('a TranscriptionSession was recorded', !!session, 'none found');
  check('it is attributed to the church', !!orgId && !!session?.organizationId && String(session?.organizationId) === String(orgId),
    `got ${session?.organizationId}`);
  check('billable seconds ~2s were counted', (session?.billableSeconds ?? 0) > 1.5 && (session?.billableSeconds ?? 0) < 3,
    `got ${session?.billableSeconds}`);
  check('the session was closed with a reason', !!session?.endedAt && !!session?.endReason,
    `endedAt ${session?.endedAt} reason ${session?.endReason}`);

  const counter = await UsageCounter.findOne({ organizationId: orgId }).lean();
  check('the monthly UsageCounter was incremented', (counter?.billableSeconds ?? 0) > 1.5, `got ${counter?.billableSeconds}`);

  const usageAfter = await api('/api/usage/me', token);
  check('GET /usage/me reflects the usage', (usageAfter.json?.usage?.billableSeconds ?? 0) >= 1,
    JSON.stringify(usageAfter.json?.usage));

  console.log('\n--- Cleanup ---');
  await Promise.all([
    User.deleteOne({ _id: user._id }),
    Organization.deleteMany({ _id: { $in: [orgId, stranger._id] } }),
    Membership.deleteMany({ userId: user._id }),
    TranscriptionSession.deleteMany({ userId: user._id }),
    UsageCounter.deleteMany({ organizationId: orgId }),
  ]);
  console.log('  test data removed');

  console.log(`\n${pass} passed, ${fail} failed`);
  await mongoose.connection.close();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => { console.error(e); try { await mongoose.connection.close(); } catch {} process.exit(1); });
