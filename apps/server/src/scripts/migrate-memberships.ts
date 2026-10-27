import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../core/db.js';
import { User } from '../modules/auth/auth.model.js';
import { Organization } from '../modules/organization/organization.model.js';
import { Membership } from '../modules/organization/membership.model.js';

dotenv.config();

/**
 * Backfills a Membership row for every church that predates memberships, and
 * points each user's activeOrganizationId at the church they already had.
 *
 * Safe to run more than once: every write is an idempotent upsert, and a church
 * that already has an owner membership is left alone.
 *
 * Not strictly required — resolveActiveOrganization() adopts a legacy ownerId
 * church the first time it sees one — but running it means no user pays that
 * one-off repair on their first request after deploy.
 */
async function migrate() {
  await connectDB();

  const organizations = await Organization.find({ ownerId: { $exists: true, $ne: null } });
  console.log(`Found ${organizations.length} organizations with an ownerId.`);

  let membershipsCreated = 0;
  let membershipsSkipped = 0;
  let activeOrgSet = 0;

  for (const organization of organizations) {
    const result = await Membership.updateOne(
      { userId: organization.ownerId, organizationId: organization._id },
      {
        $setOnInsert: {
          userId: organization.ownerId,
          organizationId: organization._id,
          role: 'owner',
        },
      },
      { upsert: true },
    );

    if (result.upsertedCount > 0) {
      membershipsCreated += 1;
    } else {
      membershipsSkipped += 1;
    }

    // Give the owner an active church, but never overwrite a choice already made.
    const userResult = await User.updateOne(
      { _id: organization.ownerId, $or: [{ activeOrganizationId: null }, { activeOrganizationId: { $exists: false } }] },
      { $set: { activeOrganizationId: organization._id } },
    );
    if (userResult.modifiedCount > 0) activeOrgSet += 1;
  }

  // A user with several churches is the one case the resolver cannot decide for
  // itself: without an active church set it refuses rather than guess. The
  // migration gives each of them one, but they are worth knowing about.
  const multiChurchOwners = await Membership.aggregate([
    { $group: { _id: '$userId', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  console.log(`Memberships created: ${membershipsCreated}`);
  console.log(`Memberships already present: ${membershipsSkipped}`);
  console.log(`Users given an active church: ${activeOrgSet}`);
  console.log(`Users belonging to more than one church: ${multiChurchOwners.length}`);
  for (const owner of multiChurchOwners) {
    console.log(`  user ${owner._id}: ${owner.count} churches`);
  }

  await mongoose.connection.close();
  console.log('Done.');
}

migrate().catch(async (error) => {
  console.error('Membership migration failed:', error);
  await mongoose.connection.close();
  process.exit(1);
});
