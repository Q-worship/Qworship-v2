import mongoose from "mongoose";
import { Organization, IOrganization } from "./organization.model.js";
import {
  Membership,
  MembershipRole,
  MEMBERSHIP_WRITE_ROLES,
} from "./membership.model.js";

/**
 * Resolving "which church is this request about".
 *
 * Before memberships there was one answer: `Organization.findOne({ ownerId })`.
 * A user may now belong to several churches, so the question has to be asked
 * properly. Resolution order, most explicit first:
 *
 *   1. an organization id named by the request (header or body/query);
 *   2. the user's stored active church;
 *   3. their only membership, when they have exactly one.
 *
 * Every path is checked against a membership row, so naming an id is never a
 * way to reach a church you do not belong to.
 */

/** Header a client sends to act on a specific church. */
export const ACTIVE_ORG_HEADER = "x-organization-id";

export interface ResolvedOrganization {
  organization: IOrganization;
  role: MembershipRole;
}

function readRequestedOrgId(req: any): string | null {
  const candidate =
    req?.headers?.[ACTIVE_ORG_HEADER] ??
    req?.body?.organizationId ??
    req?.query?.organizationId;
  if (typeof candidate !== "string" || !mongoose.isValidObjectId(candidate)) return null;
  return candidate;
}

/** The membership a user holds at a church, or null if they hold none. */
export async function getMembership(
  userId: mongoose.Types.ObjectId | string,
  organizationId: mongoose.Types.ObjectId | string,
): Promise<MembershipRole | null> {
  const membership = await Membership.findOne({ userId, organizationId }).lean();
  return membership ? membership.role : null;
}

/** True when the role may change the church's own settings. */
export function canWrite(role: MembershipRole | null): boolean {
  return !!role && MEMBERSHIP_WRITE_ROLES.includes(role);
}

/**
 * Backfills the membership implied by a legacy `ownerId` church.
 *
 * This change ships before the backfill script has necessarily run everywhere,
 * and a user whose only church predates memberships would otherwise be locked
 * out of their own data. Resolving such a church repairs it in passing, so the
 * script is a convenience rather than a hard prerequisite.
 */
async function adoptLegacyOwnerChurch(
  userId: mongoose.Types.ObjectId | string,
): Promise<ResolvedOrganization | null> {
  const organization = await Organization.findOne({ ownerId: userId });
  if (!organization) return null;
  await Membership.updateOne(
    { userId, organizationId: organization._id },
    { $setOnInsert: { userId, organizationId: organization._id, role: "owner" } },
    { upsert: true },
  );
  console.log(
    `[Membership] Backfilled owner membership for user ${userId} at church ${organization._id}`,
  );
  return { organization, role: "owner" };
}

/**
 * The church this request acts on, with the caller's role at it.
 * Returns null when the caller belongs to no church, or named one they do not
 * belong to — the caller decides whether that is a 400 or a 404.
 */
export async function resolveActiveOrganization(
  req: any,
): Promise<ResolvedOrganization | null> {
  const userId = req?.user?._id ?? req?.user?.id;
  if (!userId) return null;

  // 1. Named explicitly by the request.
  const requestedId = readRequestedOrgId(req);
  if (requestedId) {
    const role = await getMembership(userId, requestedId);
    if (!role) return null;
    const organization = await Organization.findById(requestedId);
    return organization ? { organization, role } : null;
  }

  // 2. The user's stored active church.
  const activeId = req.user?.activeOrganizationId;
  if (activeId) {
    const role = await getMembership(userId, activeId);
    if (role) {
      const organization = await Organization.findById(activeId);
      if (organization) return { organization, role };
    }
  }

  // 3. Their only membership.
  const memberships = await Membership.find({ userId }).limit(2).lean();
  if (memberships.length === 1) {
    const organization = await Organization.findById(memberships[0].organizationId);
    if (organization) return { organization, role: memberships[0].role };
  }
  if (memberships.length > 1) {
    // Several churches and nothing to choose between them. The client must say
    // which, rather than have one picked for it.
    return null;
  }

  // 4. Nothing yet — a church from before memberships existed.
  return adoptLegacyOwnerChurch(userId);
}

/** Every church a user belongs to, each with the role they hold there. */
export async function listUserOrganizations(
  userId: mongoose.Types.ObjectId | string,
): Promise<Array<{ organization: IOrganization; role: MembershipRole }>> {
  const memberships = await Membership.find({ userId }).lean();
  if (memberships.length === 0) {
    const adopted = await adoptLegacyOwnerChurch(userId);
    return adopted ? [{ organization: adopted.organization, role: adopted.role }] : [];
  }
  const organizations = await Organization.find({
    _id: { $in: memberships.map((m) => m.organizationId) },
  });
  const roleById = new Map(
    memberships.map((m) => [String(m.organizationId), m.role as MembershipRole]),
  );
  return organizations.map((organization) => ({
    organization,
    role: roleById.get(String(organization._id)) ?? "member",
  }));
}

/** Grants a user a role at a church, creating or updating the membership row. */
export async function grantMembership(
  userId: mongoose.Types.ObjectId | string,
  organizationId: mongoose.Types.ObjectId | string,
  role: MembershipRole,
): Promise<void> {
  await Membership.updateOne(
    { userId, organizationId },
    { $set: { role } },
    { upsert: true },
  );
}
