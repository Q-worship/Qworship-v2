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
    const churches = await Organization.find({ accountId: account._id })
      .select("_id ownerId")
      .lean();

    /*
     * AN ACCOUNT WITH NO CHURCHES SPEAKS FOR NOBODY.
     *
     * Kept from the original, and worth keeping deliberately rather than by
     * accident: removing a branch from a network, or joining one
     * (`branches.routes.ts` repoints `organization.accountId`), can leave an
     * account behind with no Organizations on it. When such an orphan lapses,
     * the sweep settles it and would mirror `subscriptionStatus: "inactive"`
     * onto its owner — who may be a branch owner inside a paying Standard
     * network, holding their entitlement through a DIFFERENT account. The
     * flags feed admin listings and reporting, so that is a wrong answer
     * about a paying customer.
     *
     * This is the one case the owner union below must not reach. The churches
     * are what make an account speak for anybody; the union decides WHO,
     * among the people a real church accounts for.
     */
    if (churches.length === 0) return;

    const memberships = await Membership.find({
      organizationId: { $in: churches.map((c) => c._id) },
    })
      .select("userId")
      .lean();

    /*
     * OWNERS COUNT, MEMBERSHIP ROW OR NOT.
     *
     * This used to read Memberships alone and return early on an empty set,
     * which left a whole class of people permanently on the trial-ended
     * screen: four accounts in production own a church and have NO
     * membership row at all. For them the settle wrote the account, the
     * route called this mirror, and it returned before touching
     * `trialStatus` — so "Continue with the free plan" answered 200, the
     * screen said the free plan was in place, `/me` still said "expired",
     * and the next route bounced them back. Pressing it again changed
     * nothing, because nothing here depended on the press.
     *
     * An owner is entitled to their own account's plan whether or not
     * anybody ever wrote them a Membership, so the account owner and each
     * church's owner are unioned in. This only ever ADDS people who already
     * hold the entitlement being mirrored; it cannot reach a stranger.
     */
    const userIds = [
      ...new Set(
        [
          account.ownerId,
          ...churches.map((c) => c.ownerId),
          ...memberships.map((m) => m.userId),
        ]
          .filter(Boolean)
          .map((id) => String(id)),
      ),
    ];
    if (userIds.length === 0) return;

    const paid = account.planId === "standard" && account.status !== "cancelled";

    // An account that has SETTLED onto free is no longer a lapsed trial, and
    // saying otherwise locked people out of the product they had just chosen:
    // the client's trial-ended redirect reads this flag, nothing ever cleared
    // it, and so "Continue with the free plan" led back to the trial-ended
    // screen forever. `cancelled` rather than a new value because the trial
    // eligibility check already treats it exactly like `expired` — one trial
    // per account, still forever — while nothing reads it as a lock-out.
    const settledOnFree =
      account.planId === "free" && account.status === "active" && !paid;

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

    // Matched on `expired` rather than set unconditionally: this only ever
    // moves a LAPSED flag, so a member whose own trial is still running —
    // on another church, under another account — keeps it untouched. This
    // cannot shorten anybody's run.
    if (settledOnFree) {
      await User.updateMany(
        { _id: { $in: userIds }, trialStatus: "expired" },
        { $set: { trialStatus: "cancelled" } },
      );
    }
  } catch (error) {
    // Never fatal: the Account already carries the truth, and a webhook that
    // threw here would be retried and re-grant entitlements it had granted.
    console.error("[Entitlement] Could not sync legacy user flags:", error);
  }
}
