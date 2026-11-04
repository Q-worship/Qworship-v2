import { IAccount } from "../organization/account.model.js";
import { Organization } from "../organization/organization.model.js";
import { Membership } from "../organization/membership.model.js";
import { User } from "../auth/auth.model.js";

/**
 * Mirrors an account's plan onto the old per-user entitlement flags.
 *
 * The Account is the source of truth; `user.subscriptionStatus` is a legacy
 * field that admin listings, reporting and a handful of older screens still
 * read. Leaving it stale meant a paying church showed as inactive everywhere
 * except the billing page.
 *
 * This is a mirror, not a second system: nothing should ever START here, and
 * `requireProductAccess` asks the account first. It exists so the old readers
 * stop lying, and so it can be deleted once they are gone.
 */
export async function syncLegacyEntitlement(account: IAccount): Promise<void> {
  try {
    const churches = await Organization.find({ accountId: account._id }).select("_id").lean();
    if (churches.length === 0) return;

    const memberships = await Membership.find({
      organizationId: { $in: churches.map((c) => c._id) },
    })
      .select("userId")
      .lean();

    const userIds = [...new Set(memberships.map((m) => String(m.userId)))];
    if (userIds.length === 0) return;

    const paid = account.planId === "standard" && account.status !== "cancelled";

    await User.updateMany(
      { _id: { $in: userIds } },
      {
        $set: {
          subscriptionStatus: paid ? "active" : "inactive",
          // A paid account has converted, whatever its trial once said. Left
          // alone, an expired trial keeps refusing a church that is paying.
          ...(paid ? { trialStatus: "converted" } : {}),
        },
      },
    );
  } catch (error) {
    // Never fatal: the Account already carries the truth, and a webhook that
    // threw here would be retried and re-grant entitlements it had granted.
    console.error("[Entitlement] Could not sync legacy user flags:", error);
  }
}
