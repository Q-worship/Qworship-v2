import mongoose from "mongoose";
import { TranscriptionSession } from "./usage.model.js";

/**
 * Usage over a chosen stretch of time, bucketed for a chart or a table.
 *
 * The monthly `UsageCounter` cannot answer "last 7 days" or "which Sundays" —
 * it holds one number per church per month. Sessions can: each carries
 * `startedAt` and `billableSeconds`, and there is an index on exactly that
 * pair. So everything here reads sessions and shapes them, and nothing here
 * changes what is billed.
 *
 * A session counts in the bucket it BEGAN in. A service running past midnight
 * belongs to the day it started, not split across two — the alternative makes
 * a Sunday evening service look like two short ones.
 */

/** How finely a range is cut up. */
export type Granularity = "day" | "week" | "sunday" | "month";

/** The ranges the UI offers. `custom` carries its own from/to. */
export type RangePreset = "7d" | "30d" | "90d" | "weekly" | "monthly" | "custom";

export interface UsageBucket {
  /** Start of the bucket, UTC, ISO. */
  startsAt: string;
  /** Exclusive end, so a caller never has to guess the bucket's width. */
  endsAt: string;
  hours: number;
  /** Ready to print: the chart and the table should not both invent one. */
  label: string;
}

export interface UsageSeries {
  buckets: UsageBucket[];
  granularity: Granularity;
  from: string;
  to: string;
  totalHours: number;
  /**
   * Hours per Sunday that had any usage, which is what a church recognises as
   * "a service". Averaging over every Sunday in the range would quietly punish
   * a church for the weeks it did not stream.
   */
  averageSundayHours: number;
  sundaysWithUsage: number;
}

/** A range can be asked for by preset, or by explicit dates. */
export interface RangeRequest {
  preset?: RangePreset;
  from?: string;
  to?: string;
  granularity?: Granularity;
}

/**
 * The longest span that may be asked for.
 *
 * Sessions are read, not pre-aggregated, so an unbounded range is an unbounded
 * scan. Two years is well past anything the screen offers and still cheap.
 */
const MAX_SPAN_DAYS = 732;

/** Buckets are capped too: nobody reads a 700-bar chart, and building one costs. */
const MAX_BUCKETS = 400;

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfUtcDay = (d: Date): Date => {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
};

/** Back up to the most recent Sunday, which is where a church's week starts. */
const startOfSunday = (d: Date): Date => {
  const out = startOfUtcDay(d);
  out.setUTCDate(out.getUTCDate() - out.getUTCDay());
  return out;
};

const startOfUtcMonth = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

/**
 * Turns what the UI asked for into a concrete window and bucket size.
 *
 * Defaults are chosen so each range shows a useful number of bars: a week of
 * days, three months of weeks. An explicit granularity always wins, so a
 * church can ask for its Sundays over any span.
 */
export function resolveRange(request: RangeRequest): {
  from: Date;
  to: Date;
  granularity: Granularity;
} {
  const now = new Date();
  // Exclusive end at tomorrow's midnight, so today is a complete bucket rather
  // than a half-one that looks like a collapse in usage.
  const defaultTo = startOfUtcDay(new Date(now.getTime() + DAY_MS));

  const preset = request.preset ?? "weekly";
  let from: Date;
  let to = defaultTo;
  let granularity: Granularity;

  switch (preset) {
    case "7d":
      from = new Date(defaultTo.getTime() - 7 * DAY_MS);
      granularity = "day";
      break;
    case "30d":
      from = new Date(defaultTo.getTime() - 30 * DAY_MS);
      granularity = "day";
      break;
    case "90d":
      from = new Date(defaultTo.getTime() - 90 * DAY_MS);
      granularity = "week";
      break;
    case "monthly":
      from = startOfUtcMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)));
      granularity = "month";
      break;
    case "custom": {
      const parsedFrom = request.from ? new Date(request.from) : null;
      const parsedTo = request.to ? new Date(request.to) : null;
      from = parsedFrom && !Number.isNaN(parsedFrom.getTime())
        ? startOfUtcDay(parsedFrom)
        : new Date(defaultTo.getTime() - 30 * DAY_MS);
      if (parsedTo && !Number.isNaN(parsedTo.getTime())) {
        // The caller means the whole of their end day, so the exclusive end is
        // the midnight after it.
        to = new Date(startOfUtcDay(parsedTo).getTime() + DAY_MS);
      }
      // A span picked by hand gets a sensible default cut: days for a short
      // window, weeks for a season, months for a year or more.
      const spanDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS));
      granularity = spanDays <= 31 ? "day" : spanDays <= 120 ? "week" : "month";
      break;
    }
    case "weekly":
    default:
      from = new Date(defaultTo.getTime() - 28 * DAY_MS);
      granularity = "week";
      break;
  }

  if (to <= from) to = new Date(from.getTime() + DAY_MS);

  // Clamped rather than rejected: a range that is too long is a UI mistake, and
  // showing the most recent two years of it beats showing an error.
  if (to.getTime() - from.getTime() > MAX_SPAN_DAYS * DAY_MS) {
    from = new Date(to.getTime() - MAX_SPAN_DAYS * DAY_MS);
  }

  return { from, to, granularity: request.granularity ?? granularity };
}

/** Where a bucket containing this instant begins. */
function bucketStart(at: Date, granularity: Granularity): Date {
  switch (granularity) {
    case "day":
      return startOfUtcDay(at);
    case "sunday":
    case "week":
      return startOfSunday(at);
    case "month":
      return startOfUtcMonth(at);
  }
}

/** The start of the bucket after this one. */
function nextBucket(start: Date, granularity: Granularity): Date {
  const out = new Date(start);
  switch (granularity) {
    case "day":
      out.setUTCDate(out.getUTCDate() + 1);
      return out;
    case "sunday":
    case "week":
      out.setUTCDate(out.getUTCDate() + 7);
      return out;
    case "month":
      out.setUTCMonth(out.getUTCMonth() + 1);
      return out;
  }
}

/** What the bar or row is called. Built here so chart and table agree. */
function labelFor(start: Date, granularity: Granularity): string {
  const d = (opts: Intl.DateTimeFormatOptions) =>
    start.toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
  switch (granularity) {
    case "day":
      return d({ weekday: "short", day: "numeric", month: "short" });
    case "sunday":
      return `Sun ${d({ day: "numeric", month: "short" })}`;
    case "week":
      return `W/c ${d({ day: "numeric", month: "short" })}`;
    case "month":
      return d({ month: "short", year: "numeric" });
  }
}

/**
 * Billable hours across a range, bucketed, with empty buckets kept.
 *
 * Empty buckets matter: a quiet week that vanishes turns four weeks of data
 * into three bars and silently redraws the shape of the chart.
 *
 * `organizationIds` is the set to count. Passing one church's id is how the
 * per-church view and the "All branches" filter are both served.
 */
export async function usageSeries(
  organizationIds: (mongoose.Types.ObjectId | string)[],
  request: RangeRequest = {},
): Promise<UsageSeries> {
  const { from, to, granularity } = resolveRange(request);

  const buckets: UsageBucket[] = [];
  let cursor = bucketStart(from, granularity);
  while (cursor < to && buckets.length < MAX_BUCKETS) {
    const end = nextBucket(cursor, granularity);
    buckets.push({
      startsAt: cursor.toISOString(),
      endsAt: end.toISOString(),
      hours: 0,
      label: labelFor(cursor, granularity),
    });
    cursor = end;
  }

  // No churches means no sessions to find; the empty buckets are still the
  // right answer, and they keep the chart's axes stable.
  const sessions = organizationIds.length
    ? await TranscriptionSession.find({
        organizationId: { $in: organizationIds.map((id) => new mongoose.Types.ObjectId(String(id))) },
        startedAt: { $gte: buckets[0] ? new Date(buckets[0].startsAt) : from, $lt: to },
      })
        .select("startedAt billableSeconds")
        .lean()
    : [];

  // Sundays are tracked separately from the buckets: the range may be cut into
  // months, and "average Sunday run" still has to mean a Sunday.
  const sundayHours = new Map<string, number>();

  for (const session of sessions) {
    const startedAt = new Date(session.startedAt);
    const hours = (session.billableSeconds || 0) / 3600;
    if (hours <= 0) continue;

    const key = bucketStart(startedAt, granularity).toISOString();
    const bucket = buckets.find((b) => b.startsAt === key);
    if (bucket) bucket.hours += hours;

    if (startedAt.getUTCDay() === 0) {
      const day = startOfUtcDay(startedAt).toISOString();
      sundayHours.set(day, (sundayHours.get(day) ?? 0) + hours);
    }
  }

  for (const bucket of buckets) bucket.hours = Number(bucket.hours.toFixed(2));

  const sundayTotals = [...sundayHours.values()];
  const sundaysWithUsage = sundayTotals.length;
  const averageSundayHours = sundaysWithUsage
    ? Number((sundayTotals.reduce((a, b) => a + b, 0) / sundaysWithUsage).toFixed(2))
    : 0;

  return {
    buckets,
    granularity,
    from: from.toISOString(),
    to: to.toISOString(),
    totalHours: Number(buckets.reduce((sum, b) => sum + b.hours, 0).toFixed(2)),
    averageSundayHours,
    sundaysWithUsage,
  };
}
