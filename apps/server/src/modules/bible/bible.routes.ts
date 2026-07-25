import { Router } from 'express';
import { searchBible, handleVoiceCommand, structuredSearchBible, exportBibleVersion, getBibleRevisions } from './bible.controller.js';
import { BibleService } from './bible.service.js';
import { protect, requireProductAccess } from '../auth/auth.middleware.js';

export const bibleRouter = Router();

bibleRouter.get('/search', protect, requireProductAccess, searchBible);
bibleRouter.post('/search', protect, requireProductAccess, structuredSearchBible);
bibleRouter.post('/voice-command', protect, requireProductAccess, handleVoiceCommand);
bibleRouter.get('/export/:version', protect, requireProductAccess, exportBibleVersion);
bibleRouter.get('/revisions', protect, requireProductAccess, getBibleRevisions);

// Diagnostic endpoint: verify in-memory store is loaded
bibleRouter.get('/store-status', (_req, res) => {
  const status = BibleService.getStoreStatus();
  res.json(status);
});
