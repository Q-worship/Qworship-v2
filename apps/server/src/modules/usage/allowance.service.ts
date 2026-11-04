import mongoose from "mongoose";
import { Account } from "../organization/account.model.js";
import { Organization } from "../organization/organization.model.js";
import { hourUsage } from "../organization/account.service.js";

/**
 * Whether a church may start transcribing, and for how much longer.
 *
 * Kept out of the socket so the policy can be read, reasoned about and tested
 * without opening a WebSocket. The socket owns timing; this owns the rules.
 *
 * THE GOVERNING RULE: nothing here may end a service that is already running
 * without warning first. A church that runs out mid-sermon gets a grace window
 * and two explicit messages before the stream stops. Refusing to START is
 * safe — nobody is mid-sentence — so that is where enforcement really bites.
 */

/**
 * How far past its allowance a RUNNING session may continue.
 *
 * Thirty minutes at $0.46/hour is about 23 cents of provider cost, which is
 * cheap against the alternative: cutting the transcription off in the middle
 * of a sermon because the month ticked over mid-service. The grace is per
 * session, not per month, so it cannot be farmed by staying connected.
 */
const GRACE_MINUTES = Number(process.env.HFB_GRACE_MINUTES ?? 30);

/** Fraction of the allowance at which the church is told it is running low. */
const WARN_AT = Number(process.env.HFB_WARN_AT ?? 0.8);

export interface Allowance {
  organizationId: string;
  churchName: string;
  allowanceHours: number;
  usedHours: number;
  /** Unrounded, and the only figure enforcement is allowed to compare. */
  usedSeconds: number;
  remainingHours: number;
  percentUsed: number;
}

/**
 * What one church has left this month.
 *
 * Returns null when the church or its account cannot be found. Callers treat
 * that as "do not enforce" rather than "deny": an attribution gap is a
 * reporting problem, and taking a service off the air over one would be a far
 * worse failure than letting an unmeasured session through.
 */
export async function allowanceForOrganization(
  organizationId: mongoose.Types.ObjectId | string,
): Promise<Allowance | null> {
  const church = await Organization.findById(organizationId)
    .select("_id name accountId")
    .lean();
  if (!church?.accountId) return null;

  const account = await Account.findById(church.accountId);
  if (!account) return null;

  const usage = await hourUsage(account, church._id as any);
  return {
    organizationId: String(church._id),
    churchName: church.name,
    allowanceHours: usage.allowance,
    usedHours: usage.usedHours,
    usedSeconds: usage.usedSeconds,
    remainingHours: usage.remainingHours,
    percentUsed: usage.percentUsed,
  };
}

/** What the guard decided on the last second of audio it was handed. */
export type AllowanceVerdict =
  /** Within allowance, nothing to say. */
  | { state: "ok" }
  /** Past WARN_AT but still inside the allowance. Sent once. */
  | { state: "warn"; remainingHours: number }
  /** Allowance spent; the grace window is now running. Sent once. */
  | { state: "grace"; graceMinutes: number }
  /** Grace spent. The caller must stop the stream. */
  | { state: "stop" };

/**
 * One session's view of its church's allowance.
 *
 * Seeded with what the month had already consumed, then fed the same seconds
 * the meter records — so enforcement and billing can never disagree about how
 * much was used. Each state is announced once; a guard does not nag.
 */
export class AllowanceGuard {
  private readonly allowanceSeconds: number;
  private usedSeconds: number;
  private readonly graceSeconds = GRACE_MINUTES * 60;
  private announcedWarn = false;
  private announcedGrace = false;
  private stopped = false;

  constructor(private readonly allowance: Allowance) {
    this.allowanceSeconds = allowance.allowanceHours * 3600;
    // Raw seconds, never the rounded display hours.
    this.usedSeconds = allowance.usedSeconds;
  }

  /** False when the church has nothing left before it has streamed anything. */
  canStart(): boolean {
    return this.usedSeconds < this.allowanceSeconds;
  }

  get churchName(): string {
    return this.allowance.churchName;
  }

  get organizationId(): string {
    return this.allowance.organizationId;
  }

  get allowanceHours(): number {
    return this.allowance.allowanceHours;
  }

  /** Hours left, floored at zero, for the refusal message. */
  remainingHours(): number {
    return Math.max(0, (this.allowanceSeconds - this.usedSeconds) / 3600);
  }

  /**
   * Accounts for audio that was actually forwarded, and says what to do next.
   *
   * Fed from the same place the meter is fed, so a session cannot be billed
   * for audio the guard did not see, or stopped over audio the meter missed.
   */
  consume(seconds: number): AllowanceVerdict {
    if (this.stopped) return { state: "stop" };
    this.usedSeconds += seconds;

    const over = this.usedSeconds - this.allowanceSeconds;

    if (over >= this.graceSeconds) {
      this.stopped = true;
      return { state: "stop" };
    }

    if (over >= 0) {
      if (this.announcedGrace) return { state: "ok" };
      this.announcedGrace = true;
      return { state: "grace", graceMinutes: GRACE_MINUTES };
    }

    if (this.usedSeconds >= this.allowanceSeconds * WARN_AT) {
      if (this.announcedWarn) return { state: "ok" };
      this.announcedWarn = true;
      return { state: "warn", remainingHours: this.remainingHours() };
    }

    return { state: "ok" };
  }
}
