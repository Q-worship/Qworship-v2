/**
 * What each plan may actually DO — the capability catalog.
 *
 * Prices and allowances live in plans.ts; this is the other half, and it was
 * missing. Entitlement used to be one boolean: may you use the paid product,
 * yes or no. Free therefore meant LOCKED OUT, which is why a free account
 * landed on `402 TRIAL_EXPIRED` instead of a working app.
 *
 * Free now means IN, but less. That only works if "less" is written down in
 * exactly one place. Two copies of this list — one gating the server, one
 * greying out buttons — would drift, and the failure mode of drift here is
 * ugly in both directions: a control that looks available and 402s when a
 * volunteer presses it mid-service, or a paying church quietly losing a
 * feature it bought.
 *
 * So: this file is the only answer. The server gates on it, the client greys
 * out on it, and the plan cards are rendered from it.
 */

import { SLOT_PRICE_USD } from "./plans.js";
import type { PlanId } from "./plans.js";

/**
 * Everything that can be withheld.
 *
 * Deliberately coarse. One id per thing a person would notice losing, not one
 * per endpoint — a volunteer does not experience "POST /lower-third/push",
 * they experience "I can't put a name on the screen". Fine-grained ids would
 * also make the plan cards and the lock badges disagree with each other.
 *
 * NOT HERE, AND DELIBERATELY: the slide canvas. Every one of its tools —
 * text, shapes, images, layers, QR codes, effects — is free, because the
 * editor is entirely client-side and saves its slides as JSON. The only way
 * to enforce a split would be to reject a save, which loses somebody's work
 * mid-build: a far worse failure than a free church getting a drop shadow.
 * We do not advertise a line we cannot hold, so there is no line.
 */
export type FeatureId =
  | "bible.allVersions"
  | "sermons"
  | "lowerThird.builder"
  | "media.cloudCollections"
  | "powerpoint.import"
  | "projection.multiWindow"
  | "songs.full"
  | "branches"
  | "usage.perBranch"
  | "support.priority";

export interface Feature {
  id: FeatureId;
  /** What the lock badge and the plan card call it. */
  label: string;
  /**
   * The one line shown when somebody presses a locked control.
   *
   * Written as what they GET, never as what they lack: "Every Bible version
   * on Standard", not "Your plan does not include this". The second reads as
   * a telling-off, and it is being read by a volunteer in front of a
   * congregation.
   */
  blurb: string;
  /**
   * Whether the server can actually refuse this.
   *
   * Priority support is a promise about people, not a route, and multi-window
   * projection happens in a desktop client the server never sees. Marking
   * them false keeps anyone from believing there is a gate here that isn't.
   */
  enforceable: boolean;
}

export const FEATURES: Record<FeatureId, Feature> = {
  "bible.allVersions": {
    id: "bible.allVersions",
    label: "Every Bible version",
    blurb: "Standard opens every Bible version, hands-free and on-screen. Free is KJV.",
    enforceable: true,
  },
  sermons: {
    id: "sermons",
    label: "Q-worship sermons",
    blurb: "Sermon tools come with Standard.",
    enforceable: true,
  },
  "lowerThird.builder": {
    id: "lowerThird.builder",
    label: "Lower third builder",
    blurb: "Build your own lower thirds, or start from a template, on Standard.",
    enforceable: true,
  },
  "media.cloudCollections": {
    id: "media.cloudCollections",
    label: "Cloud media collections",
    blurb: "Standard adds the shared cloud collections. Free keeps My Media.",
    enforceable: true,
  },
  "powerpoint.import": {
    id: "powerpoint.import",
    label: "PowerPoint import",
    blurb: "Bring PowerPoint decks in, and keep a backup, on Standard.",
    enforceable: true,
  },
  "projection.multiWindow": {
    id: "projection.multiWindow",
    label: "Multi-window projection",
    blurb: "Drive more than one output at once with Standard.",
    // The desktop console owns its own windows; there is no request to refuse.
    enforceable: false,
  },
  "songs.full": {
    id: "songs.full",
    label: "Full song builder",
    blurb: "The complete song book and builder come with Standard.",
    enforceable: true,
  },
  branches: {
    id: "branches",
    label: "Branches and campuses",
    blurb: `Add a branch for $${SLOT_PRICE_USD} a month each on Standard.`,
    enforceable: true,
  },
  "usage.perBranch": {
    id: "usage.perBranch",
    label: "Usage per branch",
    blurb: "See what every branch is using, on Standard.",
    enforceable: true,
  },
  "support.priority": {
    id: "support.priority",
    label: "Priority support",
    blurb: "Standard customers go to the front of the queue.",
    enforceable: false,
  },
};

export const FEATURE_IDS = Object.keys(FEATURES) as FeatureId[];

/**
 * The one Bible version the free plan keeps.
 *
 * Free does not lose Bible search — it loses the OTHER versions — so this is
 * what both the server gate and the client's locked tabs measure against.
 * Lower case because that is the form the Bible service keys on; compare
 * case-insensitively.
 */
export const FREE_BIBLE_VERSION = "kjv";

/** Whether a requested Bible version needs a paid plan. */
export function bibleVersionNeedsPlan(version?: string | null): boolean {
  if (!version) return false;
  return version.trim().toLowerCase() !== FREE_BIBLE_VERSION;
}

/**
 * What each plan grants.
 *
 * Free grants NOTHING from this list — every id here is a premium capability
 * by definition, and what free keeps (KJV, My Media, the order of service
 * builder, the whole slide canvas) is simply everything that was never gated. That
 * is why free is an empty array rather than a list of leftovers: a leftovers
 * list would have to be maintained in step with every unrelated feature we
 * ever ship, and forgetting to add to it would silently take something away.
 */
export const PLAN_FEATURES: Record<PlanId, readonly FeatureId[]> = {
  free: [],
  standard: FEATURE_IDS,
};

/**
 * The capability set for an account, trial included.
 *
 * A trial is Standard, free, for thirty days — so it grants Standard's set
 * outright. Note that running the trial's HOURS out does not come into this:
 * hours are metered separately and silence hands-free Bible alone, while
 * every feature here stays open until the day count expires. See
 * TRIAL_KEEPS_FEATURES_UNTIL_EXPIRY in plans.ts for why.
 */
export function featuresFor(planId: PlanId, isTrialing = false): readonly FeatureId[] {
  if (isTrialing) return PLAN_FEATURES.standard;
  return PLAN_FEATURES[planId] ?? PLAN_FEATURES.free;
}

/** Whether a given account state may use one feature. */
export function hasFeature(
  planId: PlanId,
  featureId: FeatureId,
  isTrialing = false,
): boolean {
  return featuresFor(planId, isTrialing).includes(featureId);
}

/**
 * The capability set as a plain object, for sending to a browser.
 *
 * An object rather than the array because the client asks "can I?" per
 * control, hundreds of times a render, and because a missing key then reads
 * as false instead of throwing.
 */
export type FeatureMap = Record<FeatureId, boolean>;

export function featureMapFor(planId: PlanId, isTrialing = false): FeatureMap {
  const granted = new Set(featuresFor(planId, isTrialing));
  return FEATURE_IDS.reduce((map, id) => {
    map[id] = granted.has(id);
    return map;
  }, {} as FeatureMap);
}
