import type { Request, Response, NextFunction } from "express";
import { FEATURES, type FeatureId } from "@qworship/shared";
import { capabilitiesFor } from "./capability.service.js";

/**
 * Route gates for individual premium capabilities.
 *
 * Replaces blanket `requireProductAccess` on the routes where free keeps
 * SOME of what a module offers — Bible search still works on free, it is
 * just KJV; media still works, it is just My Media. A whole-module gate
 * cannot express that, and leaving one in place after free became a usable
 * plan would have locked free users out of features they are supposed to
 * have.
 *
 * These enforce from the moment they are mounted. There is no shadow or
 * dry-run mode, because the thing such a mode would protect against cannot
 * happen here: a paying account is granted EVERY capability, so no verdict
 * this file reaches can take a feature from somebody who bought it. The one
 * real risk is a request whose church cannot be resolved, and that is
 * handled below by letting it through rather than by disabling the gate.
 *
 * Grace for people part-way through the old user-level trial is a separate
 * matter entirely, and is handled in the DATA by `trialGrantFor` — their
 * remaining days are carried onto the account, so they are trialing and hold
 * Standard's capabilities. Nothing here needs to be softened for them.
 */

/**
 * Refuse this route unless the caller's plan includes `featureId`.
 *
 * Answers 402 with the feature id and its upgrade line, so the client can
 * open the plan modal on the right thing rather than a generic wall. 402 and
 * not 403: this is "payment would fix it", which is exactly what the status
 * is for and what the existing client-side handling already expects.
 */
export const requireFeature = (featureId: FeatureId) => requireFeatureWhen(featureId, () => true);

/**
 * Gate a route only when the REQUEST is a premium use of it.
 *
 * Some routes serve both plans and differ only by a parameter. Bible search
 * is the clearest: free keeps it, in KJV, on the same endpoint that serves
 * every other version. A whole-route gate there would take Scripture away
 * from the free plan entirely, which is not what free loses.
 *
 * So the predicate decides whether this particular request is the premium
 * shape. It must be cheap and synchronous — it runs ahead of the capability
 * lookup, and a request that is not premium never pays for one.
 */
export const requireFeatureWhen =
  (featureId: FeatureId, appliesTo: (req: Request) => boolean) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!appliesTo(req)) return next();

    const feature = FEATURES[featureId];

    let allowed = true;
    try {
      const capabilities = await capabilitiesFor(req);

      // A church we could not identify is not refused. This is the same
      // trade hours and storage already make: an attribution gap is a
      // reporting problem, not a reason to stop somebody mid-service. Only a
      // CONFIDENT verdict — an account we found, on a plan without this
      // feature — is allowed to say no.
      if (!capabilities.resolved) {
        console.warn(
          `[Capabilities] ${featureId} allowed: could not resolve a church for user ${(req as any).user?._id}`,
        );
        return next();
      }

      allowed = capabilities.features[featureId] === true;
    } catch (error) {
      // Never let a lookup failure refuse a request. The capability service
      // already returns an unresolved verdict on error; an outright throw
      // here is a bug on our side, and a bug on our side must not stop a
      // service.
      console.error(`[Capabilities] Gate ${featureId} failed open:`, error);
      return next();
    }

    if (allowed) return next();

    res.status(402).json({
      success: false,
      message: feature.blurb,
      errorType: "FEATURE_NOT_IN_PLAN",
      feature: featureId,
      featureLabel: feature.label,
    });
  };
