import { Router } from 'express';
import {
  getHelpArticles,
  getHelpArticleBySlug,
  getFAQs,
  getResources,
  getDownloadableFiles,
  downloadPublishedFile,
  getDesktopDownloads,
  downloadDesktopByPlatform,
  submitSupportTicket,
  seedHelpData
} from './help.controller.js';
import { protect } from '../auth/auth.middleware.js';

export const helpRouter = Router();

// Public routes for help content
helpRouter.get('/articles', getHelpArticles);
helpRouter.get('/articles/:slug', getHelpArticleBySlug);
helpRouter.get('/faqs', getFAQs);
helpRouter.get('/resources', getResources);
helpRouter.get('/download-files', getDownloadableFiles);
helpRouter.get('/download-files/:id/download', downloadPublishedFile);
helpRouter.get('/desktop-downloads', getDesktopDownloads);
helpRouter.get('/desktop-downloads/:platform/download', downloadDesktopByPlatform);

// Seed data (in a real app, protect this or remove it)
helpRouter.post('/seed', protect, seedHelpData);

// Protected routes
helpRouter.post('/support-tickets', protect, submitSupportTicket);
