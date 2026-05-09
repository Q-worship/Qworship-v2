import { Router } from 'express';
import { searchBible, handleVoiceCommand, structuredSearchBible, exportBibleVersion } from './bible.controller.js';
import { BibleService } from './bible.service.js';

export const bibleRouter = Router();

bibleRouter.get('/search', searchBible);
bibleRouter.post('/search', structuredSearchBible);
bibleRouter.post('/voice-command', handleVoiceCommand);
bibleRouter.get('/export/:version', exportBibleVersion);

// Diagnostic endpoint: verify in-memory store is loaded
bibleRouter.get('/store-status', (_req, res) => {
  const status = BibleService.getStoreStatus();
  res.json(status);
});
