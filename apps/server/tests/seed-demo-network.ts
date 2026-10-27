import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectDB } from '../src/core/db.js';
import { getJwtSecret } from '../src/modules/auth/auth.middleware.js';
import { User } from '../src/modules/auth/auth.model.js';
import { Organization } from '../src/modules/organization/organization.model.js';
import { Membership } from '../src/modules/organization/membership.model.js';
import { Account } from '../src/modules/organization/account.model.js';
import { BranchInvite, INVITE_TTL_DAYS, generateInviteCode } from '../src/modules/organization/branch-invite.model.js';
import { UsageCounter, usagePeriod } from '../src/modules/usage/usage.model.js';
dotenv.config();

/**
 * Seeds a demo network on the LOCAL test database so the account screens can be
 * looked at with realistic data.
 *
 * Sign in with DEMO_EMAIL / DEMO_PASSWORD below. These are throwaway test
 * credentials for a local database and are deliberately committed, so anyone
 * can reproduce the demo; they are refused against any non-local MONGODB_URI.
 */
export const DEMO_EMAIL = 'pastor@demo.qworship.test';
export const DEMO_PASSWORD = 'DemoPass123!';

async function main() {
  await connectDB();
  if (!/127\.0\.0\.1|localhost/.test(process.env.MONGODB_URI || '')) {
    throw new Error('Refusing to seed: MONGODB_URI is not a local database');
  }
  await Promise.all([
    User.deleteMany({ email: /@demo\.qworship\.test$/ }),
    Organization.deleteMany({ name: /^Demo / }),
  ]);

  const now = new Date();
  const user = await User.create({
    email: DEMO_EMAIL,
    password: await bcrypt.hash(DEMO_PASSWORD, 10),
    firstName: 'Ade', lastName: 'Okafor',
    emailVerified: true, isActive: true,
    // The guards send a user with no trial to onboarding, so this account is
    // seeded as already converted rather than freshly signed up.
    onboardingStatus: 'completed', onboardingCompletedAt: now,
    selectedFeatures: ['presentations', 'bible'],
    trialStatus: 'converted', subscriptionStatus: 'active',
    accountType: 'premium', planType: 'cloud_pro',
    trialActivatedAt: now, trialStartDate: now,
    trialEndDate: new Date(now.getTime() + 365 * 86400000),
  });
  const account = await Account.create({
    ownerId: user._id, planId: 'standard', packs: 1,
    slots: 10, monthlyHours: 20, monthlyPrice: 15.99, status: 'active',
  });

  const names: Array<[string, string, string, number]> = [
    ['Demo Grace Chapel', 'Lagos', 'Nigeria', 6.4],
    ['Demo Grace Chapel Ikeja', 'Ikeja', 'Nigeria', 3.1],
    ['Demo Grace Chapel Lekki', 'Lekki', 'Nigeria', 2.2],
    ['Demo Grace Chapel Abuja', 'Abuja', 'Nigeria', 0.6],
  ];
  let parentId: any = null;
  for (const [name, city, country, hours] of names) {
    const org = await Organization.create({
      name, city, country, ownerId: user._id, accountId: account._id,
      parentOrganizationId: parentId,
    });
    if (!parentId) parentId = org._id;
    await Membership.updateOne({ userId: user._id, organizationId: org._id }, { $set: { role: 'owner' } }, { upsert: true });
    await UsageCounter.updateOne(
      { organizationId: org._id, period: usagePeriod() },
      { $set: { billableSeconds: hours * 3600 } }, { upsert: true },
    );
  }
  await User.updateOne({ _id: user._id }, { $set: { activeOrganizationId: parentId } });

  await BranchInvite.create({
    accountId: account._id, parentOrganizationId: parentId, method: 'code',
    code: generateInviteCode(), invitedBy: user._id, state: 'pending',
    expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86400000),
  });
  await BranchInvite.create({
    accountId: account._id, parentOrganizationId: parentId, method: 'email',
    email: 'office@portharcourt.example', invitedBy: user._id, state: 'pending',
    expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86400000),
  });

  const token = jwt.sign({ id: String(user._id) }, getJwtSecret(), { expiresIn: '12h' });
  console.log('');
  console.log('Demo network seeded. Sign in at /login with:');
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log('');
  console.log('Then open /dashboard-organization or /dashboard-subscription.');
  console.log(`Bearer token (12h), for curl: ${token}`);
  await mongoose.connection.close();
}
main().catch(async e => { console.error(e); try { await mongoose.connection.close(); } catch {} process.exit(1); });
