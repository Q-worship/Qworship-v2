import mongoose from "mongoose";
import { BYTES_PER_GB } from "@qworship/shared";
import { Media } from "../media/media.model.js";
import { Membership } from "../organization/membership.model.js";

/**
 * How much cloud storage a church is using.
 *
 * Real measurement, not an estimate: every media row carries the byte count
 * recorded when it was uploaded, so this is a sum of what is actually stored.
 *
 * LEGACY ROWS: assets uploaded before media carried an organizationId are
 * attributed through the uploader's membership instead. Without that fallback
 * every existing library would read as zero, and a storage bar that ignores
 * the files already in it is worse than no bar at all.
 *
 * Admin-distributed cloud media (`isCloud`) is excluded throughout — it is
 * shipped to everyone and belongs to no church's allowance.
 */

export interface StorageUsage {
  usedBytes: number;
  usedGb: number;
  limitGb: number;
  remainingGb: number;
  percentUsed: number;
}

/** The user ids that can upload on behalf of a church. */
async function uploaderIdsFor(organizationId: mongoose.Types.ObjectId | string): Promise<string[]> {
  const memberships = await Membership.find({ organizationId }).select("userId").lean();
  return memberships.map((m) => String(m.userId));
}

/** Bytes stored by one church, counting both attributed and legacy rows. */
export async function storageBytesFor(
  organizationId: mongoose.Types.ObjectId | string,
): Promise<number> {
  const uploaders = await uploaderIdsFor(organizationId);

  const [result] = await Media.aggregate([
    {
      $match: {
        isCloud: { $ne: true },
        $or: [
          { organizationId: new mongoose.Types.ObjectId(String(organizationId)) },
          // Legacy: no church recorded, but uploaded by one of its members.
          { organizationId: null, uploadedBy: { $in: uploaders } },
        ],
      },
    },
    { $group: { _id: null, bytes: { $sum: "$fileSize" } } },
  ]);

  return result?.bytes ?? 0;
}

/** One church's storage against its plan's allowance. */
export async function storageUsage(
  organizationId: mongoose.Types.ObjectId | string,
  limitGb: number,
): Promise<StorageUsage> {
  const usedBytes = await storageBytesFor(organizationId);
  const usedGb = usedBytes / BYTES_PER_GB;
  return {
    usedBytes,
    usedGb: Number(usedGb.toFixed(2)),
    limitGb,
    remainingGb: Number(Math.max(0, limitGb - usedGb).toFixed(2)),
    percentUsed: limitGb > 0 ? Math.min(100, Math.round((usedGb / limitGb) * 100)) : 0,
  };
}

/**
 * Storage for every church on an account, in one pass.
 *
 * Batched rather than looped: a network of thirty branches would otherwise be
 * thirty aggregations and thirty membership lookups every time the billing
 * screen is opened.
 */
export async function storageByOrganization(
  organizationIds: (mongoose.Types.ObjectId | string)[],
): Promise<Map<string, number>> {
  const ids = organizationIds.map((id) => new mongoose.Types.ObjectId(String(id)));

  const [attributed, memberships] = await Promise.all([
    Media.aggregate([
      { $match: { isCloud: { $ne: true }, organizationId: { $in: ids } } },
      { $group: { _id: "$organizationId", bytes: { $sum: "$fileSize" } } },
    ]),
    Membership.find({ organizationId: { $in: ids } }).select("organizationId userId").lean(),
  ]);

  const totals = new Map<string, number>();
  for (const id of ids) totals.set(String(id), 0);
  for (const row of attributed) totals.set(String(row._id), row.bytes ?? 0);

  // One aggregation for every legacy row, then split by who uploaded it.
  const uploaderToOrgs = new Map<string, string[]>();
  for (const m of memberships) {
    const key = String(m.userId);
    uploaderToOrgs.set(key, [...(uploaderToOrgs.get(key) ?? []), String(m.organizationId)]);
  }

  if (uploaderToOrgs.size > 0) {
    const legacy = await Media.aggregate([
      {
        $match: {
          isCloud: { $ne: true },
          organizationId: null,
          uploadedBy: { $in: [...uploaderToOrgs.keys()] },
        },
      },
      { $group: { _id: "$uploadedBy", bytes: { $sum: "$fileSize" } } },
    ]);

    for (const row of legacy) {
      const orgs = uploaderToOrgs.get(String(row._id)) ?? [];
      // A person on several churches has no recorded intent for these rows, so
      // the bytes go to the first church rather than being counted repeatedly.
      const target = orgs[0];
      if (target) totals.set(target, (totals.get(target) ?? 0) + (row.bytes ?? 0));
    }
  }

  return totals;
}
