import { IAccount } from "../organization/account.model.js";
import { User } from "../auth/auth.model.js";
import { createNotification } from "../notifications/notification.service.js";

/**
 * Telling a church what just happened to its billing.
 *
 * The notification service already had subscription events; nothing in billing
 * ever called them, so a failed payment, a lapsed plan and a received gift all
 * happened in silence. The first a church heard of a declined card was when
 * the product stopped working.
 *
 * Addressed to the ACCOUNT OWNER rather than broadcast to every member: a
 * volunteer running slides on a Sunday does not need to see that the card on
 * file expired, and sending it to them makes it likelier the person who can
 * act on it misses it.
 *
 * Every notice honours the person's preferences, and nothing here throws — a
 * webhook must not be retried because a notification failed.
 */

type NoticeKind = "trial" | "login" | "email" | "streamPeak" | "autoRefill";

/** Kinds nobody receives until they ask. */
const OPT_IN = new Set<NoticeKind>(["autoRefill"]);

/**
 * The owner, if they want to hear about this.
 *
 * `notificationPreferences` defaults to on, so an account created before the
 * field existed still gets told.
 */
async function recipient(account: IAccount, kind: NoticeKind) {
  const owner = await User.findById(account.ownerId).select(
    "_id notificationPreferences",
  );
  if (!owner) return null;
  const prefs = owner.notificationPreferences;

  // OPT-IN kinds must be switched on explicitly. Everything else is opt-out,
  // where an absent preference means yes — an account created before the field
  // existed still gets told its card failed. Reading an absent `autoRefill` the
  // same way would send buffer prompts to every owner who never asked for one,
  // while their toggle reads off.
  if (OPT_IN.has(kind)) return prefs?.[kind] === true ? owner : null;

  if (prefs && prefs[kind] === false) return null;
  return owner;
}

/**
 * The trial is running out, with the count of days left.
 *
 * Sent at 7 days, 1 day, and on the day itself. The trial expires exactly
 * thirty times twenty-four hours after sign-up, to the minute, which can land
 * mid-service on a Sunday morning — so the point of these is that nobody is
 * ever surprised by it. A church that knows buys on Friday; a church that
 * does not discovers it when the lower thirds stop working.
 *
 * Note what this does NOT say: it never threatens. Nothing is deleted when a
 * trial ends, the free plan carries on working, and saying otherwise to sell
 * a subscription would be a lie we would have to keep telling.
 */
export async function notifyTrialEnding(
  account: IAccount,
  daysLeft: number,
): Promise<void> {
  try {
    const owner = await recipient(account, "trial");
    if (!owner) return;

    const when =
      daysLeft === 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;

    await createNotification({
      userId: owner._id as any,
      type: "trial_ending",
      category: "subscription",
      title:
        daysLeft === 0
          ? "Your free trial ends today"
          : `Your free trial ends ${when}`,
      message:
        `Your trial of the full product ends ${when}. Upgrade to keep every Bible version, ` +
        `lower thirds, sermons and the cloud collections — or carry on free, which keeps your ` +
        `work and your KJV hands-free Bible.`,
      icon: "Clock",
      actionUrl: "/dashboard-subscription/plans",
    });
  } catch (error) {
    console.error("[Billing] Could not notify trial ending:", error);
  }
}

/** A card was declined. Stripe will retry; the owner should know regardless. */
export async function notifyPaymentFailed(account: IAccount): Promise<void> {
  try {
    const owner = await recipient(account, "trial");
    if (!owner) return;
    await createNotification({
      userId: owner._id as any,
      type: "payment_failed",
      category: "subscription",
      title: "A payment did not go through",
      message:
        "Your card was declined. We will try again over the next few days — update your payment method to avoid losing your plan.",
      icon: "AlertTriangle",
      actionUrl: "/dashboard-subscription",
    });
  } catch (error) {
    console.error("[Billing] Could not notify payment failure:", error);
  }
}

/** A retry succeeded, or the plan is healthy again. */
export async function notifyPaymentRecovered(account: IAccount): Promise<void> {
  try {
    const owner = await recipient(account, "trial");
    if (!owner) return;
    await createNotification({
      userId: owner._id as any,
      type: "payment_recovered",
      category: "subscription",
      title: "Payment received",
      message: "Your plan is active again. Nothing further to do.",
      icon: "CreditCard",
      actionUrl: "/dashboard-subscription",
    });
  } catch (error) {
    console.error("[Billing] Could not notify payment recovery:", error);
  }
}

/** The subscription ended. Churches are kept; the plan is not. */
export async function notifyPlanEnded(account: IAccount): Promise<void> {
  try {
    const owner = await recipient(account, "trial");
    if (!owner) return;
    await createNotification({
      userId: owner._id as any,
      type: "plan_ended",
      category: "subscription",
      title: "Your plan has ended",
      message:
        "You are back on Free. Your churches, songs and media are untouched — only the monthly hours and extra church slots have gone.",
      icon: "Clock",
      actionUrl: "/dashboard-subscription/plans",
    });
  } catch (error) {
    console.error("[Billing] Could not notify plan end:", error);
  }
}

/** A church is close to spending its month's hours. */
export async function notifyHoursLow(
  account: IAccount,
  churchName: string,
  remainingHours: number,
): Promise<void> {
  try {
    const owner = await recipient(account, "trial");
    if (!owner) return;
    await createNotification({
      userId: owner._id as any,
      type: "hours_low",
      category: "subscription",
      title: `${churchName} is running low on hours`,
      message: `${remainingHours.toFixed(1)} hours left this month. Buy more now so a service is never interrupted.`,
      icon: "Clock",
      actionUrl: "/dashboard-subscription/branches",
      metadata: { churchName, remainingHours },
    });
  } catch (error) {
    console.error("[Billing] Could not notify low hours:", error);
  }
}

/**
 * Hours that were paid for have been refunded, so they are gone.
 *
 * Sent even though nobody asked for it from inside the app: a refund is
 * usually issued by support, out of band, and the church would otherwise
 * discover it when a service stops.
 */
export async function notifyTopUpRefunded(
  account: IAccount,
  hours: number,
  churchName?: string,
): Promise<void> {
  try {
    const owner = await recipient(account, "trial");
    if (!owner) return;
    const where = churchName ? ` for ${churchName}` : "";
    await createNotification({
      userId: owner._id as any,
      type: "topup_refunded",
      category: "subscription",
      title: "Extra hours refunded",
      message: `The ${hours} extra hour${hours === 1 ? "" : "s"} bought${where} have been refunded and are no longer available this month.`,
      icon: "Clock",
      actionUrl: "/dashboard-subscription/branches",
      metadata: { hours, churchName },
    });
  } catch (error) {
    console.error("[Billing] Could not notify top-up refund:", error);
  }
}

/**
 * A charge has been disputed with the card issuer.
 *
 * Deliberately a notice and nothing more. Access is NOT withdrawn: the same
 * reasoning as `past_due` — a dispute can be opened in error, or by a treasurer
 * who does not recognise the descriptor, and taking a church off the air over
 * it is a far worse outcome than carrying the balance until the dispute closes.
 */
export async function notifyPaymentDisputed(
  account: IAccount,
  amountUsd: number,
): Promise<void> {
  try {
    const owner = await recipient(account, "trial");
    if (!owner) return;
    await createNotification({
      userId: owner._id as any,
      type: "payment_disputed",
      category: "subscription",
      title: "A payment has been disputed",
      message: `Your bank has opened a dispute over a $${amountUsd.toFixed(2)} charge. Your plan is still active. If this was not intended, withdrawing the dispute with your bank is the quickest way to settle it.`,
      icon: "AlertTriangle",
      actionUrl: "/dashboard-subscription",
      metadata: { amountUsd },
    });
  } catch (error) {
    console.error("[Billing] Could not notify payment dispute:", error);
  }
}

/**
 * A church is close to filling its cloud storage.
 *
 * The warning half of storage enforcement: sent while the church can still
 * act, rather than leaving it to find out when an upload is refused.
 */
export async function notifyStorageLow(
  account: IAccount,
  churchName: string,
  usedGb: number,
  limitGb: number,
): Promise<void> {
  try {
    const owner = await recipient(account, "trial");
    if (!owner) return;
    await createNotification({
      userId: owner._id as any,
      type: "storage_low",
      category: "subscription",
      title: `${churchName} is nearly out of storage`,
      message: `${usedGb} GB of ${limitGb} GB used. Delete some media or upgrade the plan before an upload is refused.`,
      icon: "AlertTriangle",
      actionUrl: "/dashboard-subscription/branches",
      metadata: { churchName, usedGb, limitGb },
    });
  } catch (error) {
    console.error("[Billing] Could not notify low storage:", error);
  }
}

/**
 * Many branches are streaming at once.
 *
 * Sent as a service starts, not afterwards — a peak reported on Monday is
 * trivia; the same figure at 9am on Sunday is something a production lead can
 * still act on.
 */
export async function notifyStreamPeak(
  account: IAccount,
  concurrent: number,
  ceiling: number,
): Promise<void> {
  try {
    const owner = await recipient(account, "streamPeak");
    if (!owner) return;
    await createNotification({
      userId: owner._id as any,
      type: "stream_peak",
      category: "subscription",
      title: `${concurrent} services streaming at once`,
      message: `That is ${Math.round((concurrent / Math.max(1, ceiling)) * 100)}% of your ${ceiling} branches live at the same time. Nothing is throttled — this is a heads-up while the services are running.`,
      icon: "Activity",
      actionUrl: "/dashboard-subscription/usage",
      metadata: { concurrent, ceiling },
    });
  } catch (error) {
    console.error("[Billing] Could not notify stream peak:", error);
  }
}

/**
 * A church has just run out mid-service, and the grace window is running.
 *
 * This is the Emergency Sunday Buffer. No card is stored, so nothing is
 * charged automatically; what the buffer actually buys is TIME — the guard's
 * grace window keeps the service on air while this notice puts a one-click
 * top-up in the owner's hand. Sent only to owners who switched it on.
 */
export async function notifyBufferPrompt(
  account: IAccount,
  churchName: string,
  graceMinutes: number,
): Promise<void> {
  try {
    const owner = await recipient(account, "autoRefill");
    if (!owner) return;
    await createNotification({
      userId: owner._id as any,
      type: "buffer_prompt",
      category: "subscription",
      title: `${churchName} has run out of hours`,
      message: `The service is still running and has about ${graceMinutes} minutes of grace left. Add hours now to keep it on air.`,
      icon: "Zap",
      actionUrl: "/dashboard-subscription/usage",
      metadata: { churchName, graceMinutes },
    });
  } catch (error) {
    console.error("[Billing] Could not send the buffer prompt:", error);
  }
}
