import { Account, IAccount } from "../organization/account.model.js";
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
     * This is the one case the owner union below must not reach — in the
     * LAPSE direction only, which is the direction that does harm. Returning
     * outright, as this first did, also skipped the `paid` write: an account
     * that converts to Standard while holding no Organization row (a branch
     * move repoints `accountId`; `ensureAccountFor` returns an unattached
     * account when the church lookup comes back empty) would leave its owner
     * reading `inactive` in the very listings this mirror exists to correct.
     * So widening still happens, narrowing does not. See `canNarrow` below.
     */
    const canNarrow = churches.length > 0;

    const memberships = churches.length
      ? await Membership.find({
          organizationId: { $in: churches.map((c) => c._id) },
        })
          .select("userId")
          .lean()
      : [];

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

    /*
     * An account with no churches may narrow only its OWNER, and only when
     * nothing else is keeping them entitled.
     *
     * `canNarrow` alone was too blunt in both directions. Skipping the write
     * entirely left the owner of an orphaned Standard account reading
     * `active` and `converted` for good once Stripe cancelled it — nothing
     * else would ever correct that row. Writing unconditionally was the
     * original bug: a branch owner whose church moved onto somebody else's
     * account would be stamped `inactive` while working inside a paying
     * network.
     *
     * Both are the same person in different circumstances, so the question is
     * not who they are but whether any OTHER live account still speaks for
     * them. One query answers it, and only on this path.
     */
    if (!paid && !canNarrow) {
      const theirChurches = await Organization.find({ ownerId: account.ownerId })
        .select("accountId")
        .lean();
      const elsewhere = await Membership.find({ userId: account.ownerId })
        .select("organizationId")
        .lean();
      const reachable = await Organization.find({
        _id: { $in: elsewhere.map((m) => m.organizationId) },
      })
        .select("accountId")
        .lean();

      const otherAccountIds = [...theirChurches, ...reachable]
        .map((c: any) => String(c.accountId))
        .filter((id) => id && id !== "undefined" && id !== String(account._id));

      if (otherAccountIds.length > 0) {
        const live = await Account.countDocuments({
          _id: { $in: otherAccountIds },
          status: { $ne: "cancelled" },
        });
        // Somebody else's plan still covers them; this orphan does not get to
        // say otherwise.
        if (live > 0) return;
      }
    }

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
