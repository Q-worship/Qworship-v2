/**
 * Recurring background work.
 *
 * There was none: `expireFinishedGifts` existed, was tested, and was never
 * called, so a gifted church stayed on Standard forever. Anything else that
 * depends on time — dunning, expiry reminders, usage digests — had nowhere to
 * live either.
 *
 * Deliberately a plain interval rather than a cron library. There is one
 * process and a handful of jobs; a dependency and a crontab syntax would buy
 * nothing. Every job must therefore be IDEMPOTENT and SAFE TO RUN TWICE, since
 * two app instances will both run it. The jobs registered below are written
 * that way — each one's write is conditional on the state it expects to find.
 */

export interface ScheduledJob {
  name: string;
  /** How often to run, in milliseconds. */
  everyMs: number;
  /** Must be idempotent: two instances will both call it. */
  run: () => Promise<unknown>;
}

const timers: ReturnType<typeof setInterval>[] = [];

/**
 * Runs a job now and on its interval, never letting a failure stop the timer.
 *
 * A job that throws is logged and retried on the next tick rather than killing
 * the schedule — one bad night of gift expiry must not silently stop every
 * other job for the lifetime of the process.
 */
function schedule(job: ScheduledJob): void {
  const run = async () => {
    const started = Date.now();
    try {
      const result = await job.run();
      // Only worth a line when something actually happened.
      if (typeof result === "number" && result > 0) {
        console.log(`[Scheduler] ${job.name}: ${result} in ${Date.now() - started}ms`);
      }
    } catch (error) {
      console.error(`[Scheduler] ${job.name} failed:`, error);
    }
  };

  // A first pass on boot, offset so a restart loop cannot hammer the database
  // and so several jobs do not all fire in the same tick.
  const offset = 15_000 + Math.floor(Math.random() * 15_000);
  setTimeout(() => void run(), offset);
  timers.push(setInterval(() => void run(), job.everyMs));
}

const HOUR = 60 * 60 * 1000;

export function startScheduler(): void {
  if (process.env.DISABLE_SCHEDULER === "true") {
    console.log("[Scheduler] Disabled by DISABLE_SCHEDULER");
    return;
  }

  schedule({
    name: "expire-finished-gifts",
    // Hourly. A gift runs for months, so the hour a lapse is noticed does not
    // matter; what matters is that it is noticed at all.
    everyMs: HOUR,
    run: async () => {
      const { expireFinishedGifts } = await import("../modules/billing/gift.service.js");
      return expireFinishedGifts();
    },
  });

  schedule({
    name: "expire-lapsed-trials",
    // Hourly, for the same reason gifts are: `isTrialing` already checks the
    // date, so the product treats a lapsed trial as lapsed the instant it
    // lapses. This sweep only makes the stored row agree, which matters for
    // reporting and the legacy mirror but not for enforcement.
    everyMs: HOUR,
    run: async () => {
      const { expireLapsedTrials } = await import("../modules/billing/trial.service.js");
      return expireLapsedTrials();
    },
  });

  schedule({
    name: "trial-ending-notices",
    // Hourly, which is the right resolution for a notice measured in days:
    // the day-of notice fires within three hours of the end, and nobody is
    // helped by learning at 09:00 rather than 09:40. Each milestone is
    // claimed with a conditional write, so running on several instances
    // sends one notice, not one per instance.
    everyMs: HOUR,
    run: async () => {
      const { sendTrialEndingNotices } = await import("../modules/billing/trial.service.js");
      return sendTrialEndingNotices();
    },
  });

  console.log("[Scheduler] Started");
}

/** Stops every timer. For tests and clean shutdown. */
export function stopScheduler(): void {
  for (const timer of timers) clearInterval(timer);
  timers.length = 0;
}
