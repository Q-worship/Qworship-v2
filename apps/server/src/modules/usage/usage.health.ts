import mongoose from "mongoose";
import { TranscriptionSession } from "./usage.model.js";

/**
 * The two figures the Usage design asks for that are not hours.
 *
 * Both are MEASURED, not estimated. The design draws "Peak Sunday Streams" and
 * "Stream Uptime", and the temptation is to print a plausible 99.8% — but a
 * church reading its own dashboard has no way to tell an invented number from
 * a real one, which is exactly why it must not be invented. Sessions already
 * carry what is needed: `startedAt`/`endedAt` bound each stream, and
 * `endReason` records whether it ended cleanly or failed.
 */

export interface StreamHealth {
  /** Most streams running at the same instant in the range. */
  peakConcurrent: number;
  /** When that peak happened, so it can be checked against a service time. */
  peakAt: string | null;
  /** Peak across Sundays only — the design's "Peak Sunday Streams". */
  peakSundayConcurrent: number;
  /** Sessions that ended without error, as a percentage of those that ended. */
  uptimePercent: number;
  sessionsEnded: number;
  sessionsFailed: number;
}

/**
 * Peak concurrency by sweep line.
 *
 * Every start is +1 and every end is -1; sorted together, the running total's
 * high-water mark is the answer. Counting "sessions that overlap each other"
 * pairwise would be quadratic and would still need this to get the peak.
 *
 * A session with no `endedAt` is still running (or was never closed cleanly),
 * so it is bounded at the end of the range rather than dropped — dropping it
 * would under-report exactly the live services this figure is about.
 */
function peakOf(spans: { start: number; end: number }[]): { peak: number; at: number | null } {
  if (spans.length === 0) return { peak: 0, at: null };

  const events: { t: number; delta: number }[] = [];
  for (const s of spans) {
    events.push({ t: s.start, delta: 1 });
    events.push({ t: s.end, delta: -1 });
  }
  // Ends before starts at the same instant: a stream that stops exactly as
  // another begins is a handover, not two concurrent feeds.
  events.sort((a, b) => a.t - b.t || a.delta - b.delta);

  let running = 0;
  let peak = 0;
  let at: number | null = null;
  for (const e of events) {
    running += e.delta;
    if (running > peak) {
      peak = running;
      at = e.t;
    }
  }
  return { peak, at };
}

export async function streamHealth(
  organizationIds: (mongoose.Types.ObjectId | string)[],
  from: Date,
  to: Date,
): Promise<StreamHealth> {
  if (organizationIds.length === 0) {
    return {
      peakConcurrent: 0,
      peakAt: null,
      peakSundayConcurrent: 0,
      uptimePercent: 100,
      sessionsEnded: 0,
      sessionsFailed: 0,
    };
  }

  const sessions = await TranscriptionSession.find({
    organizationId: { $in: organizationIds.map((id) => new mongoose.Types.ObjectId(String(id))) },
    startedAt: { $gte: from, $lt: to },
  })
    .select("startedAt endedAt endReason")
    .lean();

  const spans = sessions.map((s) => {
    const start = new Date(s.startedAt).getTime();
    const end = s.endedAt ? new Date(s.endedAt).getTime() : Math.min(Date.now(), to.getTime());
    // A zero-length or reversed span would vanish from the sweep; give it an
    // instant so a session that started is never invisible.
    return { start, end: Math.max(end, start + 1000) };
  });

  const overall = peakOf(spans);
  const sundays = peakOf(spans.filter((s) => new Date(s.start).getUTCDay() === 0));

  // Uptime is measured over sessions that ENDED. One still running has not yet
  // succeeded or failed, and counting it either way would be a guess.
  const ended = sessions.filter((s) => s.endedAt || s.endReason);
  const failed = ended.filter((s) => s.endReason === "error");
  const uptimePercent = ended.length
    ? Number((((ended.length - failed.length) / ended.length) * 100).toFixed(1))
    : 100;

  return {
    peakConcurrent: overall.peak,
    peakAt: overall.at ? new Date(overall.at).toISOString() : null,
    peakSundayConcurrent: sundays.peak,
    uptimePercent,
    sessionsEnded: ended.length,
    sessionsFailed: failed.length,
  };
}

/** The same two figures per church, for the consumption table's columns. */
export async function streamHealthByOrganization(
  organizationIds: (mongoose.Types.ObjectId | string)[],
  from: Date,
  to: Date,
): Promise<Map<string, StreamHealth>> {
  const out = new Map<string, StreamHealth>();
  // One query per church would be N round trips for a thirty-branch network;
  // one query, then split, is a single pass.
  const sessions = organizationIds.length
    ? await TranscriptionSession.find({
        organizationId: { $in: organizationIds.map((id) => new mongoose.Types.ObjectId(String(id))) },
        startedAt: { $gte: from, $lt: to },
      })
        .select("organizationId startedAt endedAt endReason")
        .lean()
    : [];

  const byOrg = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const key = String(s.organizationId);
    byOrg.set(key, [...(byOrg.get(key) ?? []), s]);
  }

  for (const id of organizationIds) {
    const key = String(id);
    const rows = byOrg.get(key) ?? [];
    const spans = rows.map((s) => {
      const start = new Date(s.startedAt).getTime();
      const end = s.endedAt ? new Date(s.endedAt).getTime() : Math.min(Date.now(), to.getTime());
      return { start, end: Math.max(end, start + 1000) };
    });
    const overall = peakOf(spans);
    const sundays = peakOf(spans.filter((s) => new Date(s.start).getUTCDay() === 0));
    const ended = rows.filter((s) => s.endedAt || s.endReason);
    const failed = ended.filter((s) => s.endReason === "error");

    out.set(key, {
      peakConcurrent: overall.peak,
      peakAt: overall.at ? new Date(overall.at).toISOString() : null,
      peakSundayConcurrent: sundays.peak,
      uptimePercent: ended.length
        ? Number((((ended.length - failed.length) / ended.length) * 100).toFixed(1))
        : 100,
      sessionsEnded: ended.length,
      sessionsFailed: failed.length,
    });
  }

  return out;
}
