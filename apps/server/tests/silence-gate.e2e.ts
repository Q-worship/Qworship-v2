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

const FRAME_MS = 100;
function frame(loud: boolean) {
  const b = Buffer.alloc(3200); // 100ms @ 16kHz 16-bit
  if (loud) for (let i = 0; i < b.length; i += 2) b.writeInt16LE(Math.round(9000 * Math.sin(i / 6)), i);
  return b; // silent = all zeros, RMS 0
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  await connectDB();
  const user = await User.create({ email: `gate-${Date.now()}@qworship.test`, emailVerified: true, isActive: true, onboardingStatus: 'pending' });
  const org = await Organization.create({ name: 'Gate Test Church', ownerId: user._id });
  await Membership.updateOne({ userId: user._id, organizationId: org._id }, { $set: { role: 'owner' } }, { upsert: true });
  const token = jwt.sign({ id: String(user._id) }, getJwtSecret(), { expiresIn: '1h' });

  const statuses: string[] = [];
  const ws = new WebSocket(`ws://localhost:5001/api/bible/audio-stream?token=${encodeURIComponent(token)}`);
  await new Promise<void>((res, rej) => { ws.on('open', () => res()); ws.on('error', rej); });
  ws.on('message', (d, isBin) => {
    if (isBin) return;
    try { const m = JSON.parse(d.toString()); if (m.type === 'audio_status') statuses.push(m.status); } catch {}
  });

  console.log('streaming 2s of speech...');
  for (let i = 0; i < 20; i++) { ws.send(frame(true)); await sleep(FRAME_MS); }
  console.log('streaming 9s of silence (gate threshold is 4s)...');
  for (let i = 0; i < 90; i++) { ws.send(frame(false)); await sleep(FRAME_MS); }
  console.log('streaming 2s of speech again...');
  for (let i = 0; i < 20; i++) { ws.send(frame(true)); await sleep(FRAME_MS); }
  await sleep(1000);
  ws.close();
  await sleep(2500);

  const s = await TranscriptionSession.findOne({ userId: user._id }).lean();
  const totalStreamedSeconds = (20 + 90 + 20) * FRAME_MS / 1000;

  console.log('\n--- results ---');
  console.log('audio_status events:', statuses.join(' -> ') || '(none)');
  console.log('total audio streamed by client:', totalStreamedSeconds.toFixed(1), 's');
  console.log('billableSeconds (forwarded to Deepgram):', (s?.billableSeconds ?? 0).toFixed(2), 's');
  console.log('suspendedSeconds (withheld by gate):', (s?.suspendedSeconds ?? 0).toFixed(2), 's');

  let pass = 0, fail = 0;
  const check = (l: string, ok: boolean, d = '') => { ok ? (pass++, console.log(`  PASS  ${l}`)) : (fail++, console.log(`  FAIL  ${l}${d ? ' :: ' + d : ''}`)); };
  console.log('');
  check('the gate reported idle during silence', statuses.includes('idle'), statuses.join(',') || 'no events');
  check('the gate resumed when speech returned', statuses.lastIndexOf('receiving') > statuses.indexOf('idle') && statuses.includes('idle'), statuses.join(','));
  check('silence was withheld from Deepgram', (s?.suspendedSeconds ?? 0) > 2, `withheld ${s?.suspendedSeconds?.toFixed(2)}s`);
  check('billable is well below total streamed', (s?.billableSeconds ?? 0) < totalStreamedSeconds * 0.75,
    `${s?.billableSeconds?.toFixed(2)}s billable of ${totalStreamedSeconds}s streamed`);
  check('speech either side was still counted', (s?.billableSeconds ?? 0) > 3.5, `${s?.billableSeconds?.toFixed(2)}s`);

  const saved = ((s?.suspendedSeconds ?? 0) / totalStreamedSeconds) * 100;
  console.log(`\n  ${saved.toFixed(0)}% of streamed audio was kept off the Deepgram bill`);

  await Promise.all([
    User.deleteOne({ _id: user._id }), Organization.deleteOne({ _id: org._id }),
    Membership.deleteMany({ userId: user._id }), TranscriptionSession.deleteMany({ userId: user._id }),
    UsageCounter.deleteMany({ organizationId: org._id }),
  ]);
  console.log(`\n${pass} passed, ${fail} failed`);
  await mongoose.connection.close();
  process.exit(fail ? 1 : 0);
}
main().catch(async e => { console.error(e); try { await mongoose.connection.close(); } catch {} process.exit(1); });
