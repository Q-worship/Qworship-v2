import type { Request, Response, NextFunction } from "express";
import { FREE_SONG_LIMIT } from "@qworship/shared";
import { Song } from "./song.model.js";
import { capabilitiesFor } from "../billing/capability.service.js";
import { resolveActiveOrganization } from "../organization/organization.service.js";

/**
 * Caps how many songs a free church may KEEP, not what it may do with them.
 *
 * Free gets a real song book — search, projection, editing, the verse and
 * chorus builder, all of it — up to FREE_SONG_LIMIT titles. What Standard
 * sells is room to grow, plus bulk import.
 *
 * THE CAP IS ONLY EVER CHECKED ON CREATE. Nothing here hides, deletes or
 * refuses to serve a song that already exists, so a church that built forty
 * during its trial keeps all forty and simply cannot add a forty-first. A
 * library that silently shrinks when a trial ends is indistinguishable from
 * data loss, and it would be the single thing most likely to lose a church
 * permanently.
 */
export const enforceSongLimit = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const capabilities = await capabilitiesFor(req);

    // Standard, a live trial, or a church we could not identify: carry on.
    // The unresolved case follows the house rule — an attribution gap is a
    // reporting problem, not a reason to stop somebody adding a song an hour
    // before a service.
    if (capabilities.features["songs.full"] || !capabilities.resolved) return next();

    const resolved = await resolveActiveOrganization(req as any);
    const organizationId = resolved?.organization?._id;
    if (!organizationId) return next();

    // Only songs that still count: a deactivated one is not in the library.
    const held = await Song.countDocuments({ organizationId, isActive: { $ne: false } });
    if (held < FREE_SONG_LIMIT) return next();

    res.status(402).json({
      success: false,
      message:
        `The free plan holds ${FREE_SONG_LIMIT} songs, and you have ${held}. ` +
        `Standard removes the limit — your existing songs all stay either way.`,
      errorType: "FEATURE_NOT_IN_PLAN",
      feature: "songs.full",
      featureLabel: "Full song book",
      held,
      limit: FREE_SONG_LIMIT,
    });
  } catch (error) {
    // A counting failure must never stop somebody building a service.
    console.error("[Songs] Limit check failed open:", error);
    next();
  }
};
