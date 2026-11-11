import { Router } from 'express';
import { searchBible, handleVoiceCommand, structuredSearchBible, exportBibleVersion, getBibleRevisions, getBibleTranslations } from './bible.controller.js';
import { BibleService } from './bible.service.js';
import { protect, requireProductAccess } from '../auth/auth.middleware.js';
import { requireFeatureWhen } from '../billing/capability.middleware.js';
import { bibleVersionNeedsPlan } from '@qworship/shared';

export const bibleRouter = Router();

/**
 * Bible search is NOT a premium feature; the versions beyond KJV are.
 *
 * So the gate is conditional on the version asked for. A free church
 * searching KJV never meets it; the same church asking for NIV does. Gating
 * these routes outright would have taken Scripture off the free plan, which
 * is not what free gives up.
 *
 * The version arrives as a query parameter on the GETs and in the body on
 * the POSTs, so both are checked. Anything unparseable reads as KJV and is
 * allowed — an unreadable request is not a reason to refuse somebody mid
 * service, and the Bible service defaults to KJV anyway.
 */
const paidVersion = requireFeatureWhen('bible.allVersions', (req: any) =>
  bibleVersionNeedsPlan(req.query?.version ?? req.body?.version ?? req.params?.version),
);

bibleRouter.get('/search', protect, requireProductAccess, paidVersion, searchBible);
bibleRouter.post('/search', protect, requireProductAccess, paidVersion, structuredSearchBible);
bibleRouter.post('/voice-command', protect, requireProductAccess, paidVersion, handleVoiceCommand);
bibleRouter.get('/export/:version', protect, requireProductAccess, paidVersion, exportBibleVersion);
bibleRouter.get('/revisions', protect, requireProductAccess, getBibleRevisions);
bibleRouter.get('/translations', protect, requireProductAccess, getBibleTranslations);

// Diagnostic endpoint: verify in-memory store is loaded
bibleRouter.get('/store-status', (_req, res) => {
  const status = BibleService.getStoreStatus();
  res.json(status);
});
