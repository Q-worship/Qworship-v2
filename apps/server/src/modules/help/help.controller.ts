import { Request, Response } from 'express';
import { HelpArticle, FAQ, ResourceLink, SupportTicket, DownloadableFile, DownloadEvent } from './help.model.js';
import { objectStorage } from '../media/s3.service.js';
import path from 'path';
import { randomUUID } from 'crypto';
export const getHelpArticles = async (req: Request, res: Response) => {
  try {
    const articles = await HelpArticle.find({ isPublished: true }).sort({ createdAt: -1 });
    res.json({ articles: articles.map(a => ({
      id: a._id,
      title: a.title,
      slug: a.slug,
      description: a.description,
      content: a.content,
      category: a.category,
      readTime: a.readTime,
      difficulty: a.difficulty,
      tags: a.tags,
      helpful: a.helpful,
      notHelpful: a.notHelpful
    })) });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getHelpArticleBySlug = async (req: Request, res: Response) => {
  try {
    const article = await HelpArticle.findOne({ slug: req.params.slug, isPublished: true });
    if (!article) return res.status(404).json({ message: 'Article not found' });
    
    res.json({ article: {
      id: article._id,
      title: article.title,
      slug: article.slug,
      description: article.description,
      content: article.content,
      category: article.category,
      readTime: article.readTime,
      difficulty: article.difficulty,
      tags: article.tags,
      helpful: article.helpful,
      notHelpful: article.notHelpful
    }});
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getFAQs = async (req: Request, res: Response) => {
  try {
    const faqs = await FAQ.find({ isPublished: true }).sort({ createdAt: -1 });
    res.json({ faqs: faqs.map(f => ({
      id: f._id,
      question: f.question,
      answer: f.answer,
      category: f.category,
      helpful: f.helpful,
      notHelpful: f.notHelpful
    })) });
  } catch (error) {
    console.error('Error fetching faqs:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getResources = async (req: Request, res: Response) => {
  try {
    const resources = await ResourceLink.find({ isPublished: true }).sort({ createdAt: -1 });
    res.json({ resources: resources.map(r => ({
      id: r._id,
      title: r.title,
      description: r.description,
      url: r.url,
      category: r.category,
      icon: r.icon
    })) });
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const mapDownloadableFile = (file: any) => ({
  id: file._id,
  title: file.title,
  description: file.description,
  category: file.category,
  platform: file.platform || 'other',
  version: file.version,
  minOs: file.minOs,
  originalName: file.originalName,
  mimeType: file.mimeType,
  fileSize: file.fileSize,
  isPublished: file.isPublished,
  createdAt: file.createdAt,
  updatedAt: file.updatedAt
});

const sanitizeDownloadFilename = (value: string) =>
  (value || 'download')
    .replace(/["\\\r\n]/g, '')
    .replace(/[^\w.\- ()]/g, '_');

const getLowercaseExtension = (filename: string) => path.extname(filename || '').toLowerCase();

const isAllowedPlatformExtension = (platform: string, filename: string) => {
  const extension = getLowercaseExtension(filename);
  if (platform === 'windows') {
    return extension === '.exe' || extension === '.msi';
  }
  if (platform === 'mac') {
    return extension === '.dmg' || extension === '.pkg';
  }
  return true;
};

const inferSource = (req: Request) => {
  const explicitSource = typeof req.query.source === 'string' ? req.query.source.trim() : '';
  if (explicitSource) return explicitSource;
  const referer = String(req.headers.referer || '');
  if (referer.includes('/download')) return 'user-panel-download-page';
  return 'unknown';
};

/**
 * Build a direct Cloudflare CDN URL for a storage key using the R2 public domain.
 * This allows the browser to download directly from Cloudflare's CDN edge — no backend
 * proxy needed, no gateway timeouts, and no "Access Denied" from the private S3 API endpoint.
 * Returns null if R2_PUBLIC_URL is not configured (private-bucket-only setup).
 */
const buildPublicCdnUrl = (storageKey: string): string | null => {
  const publicBase = process.env.R2_PUBLIC_URL;
  if (!publicBase) return null;
  const base = publicBase.replace(/\/$/, '');
  const key = storageKey.startsWith('/') ? storageKey.slice(1) : storageKey;
  return `${base}/${key}`;
};

const trackDownloadEvent = (req: Request, file: any, platformOverride?: 'windows' | 'mac' | 'other') => {
  const platform = platformOverride || file?.platform || 'other';
  const source = inferSource(req);
  const ip = req.ip || (req.headers['x-forwarded-for'] as string | undefined);
  const userAgent = String(req.headers['user-agent'] || '');
  const referer = String(req.headers.referer || '');

  // Fire-and-forget to avoid slowing down download response.
  void DownloadEvent.create({
    downloadableFileId: file?._id,
    platform,
    source,
    ip,
    userAgent,
    referer
  }).catch((error) => {
    console.error('Failed to log download event:', error);
  });
};

export const getDownloadableFiles = async (req: Request, res: Response) => {
  try {
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const filter: Record<string, unknown> = { isPublished: true };
    if (platform) filter.platform = platform;
    const files = await DownloadableFile.find(filter).sort({ createdAt: -1 });
    res.json({ files: files.map(mapDownloadableFile) });
  } catch (error) {
    console.error('Error fetching downloadable files:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getAdminDownloadableFiles = async (req: Request, res: Response) => {
  try {
    const files = await DownloadableFile.find().sort({ createdAt: -1 });
    res.json({ files: files.map(mapDownloadableFile) });
  } catch (error) {
    console.error('Error fetching admin downloadable files:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const uploadDownloadableFile = async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const title = (req.body.title || file.originalname).trim();
    const description = (req.body.description || '').trim();
    const category = (req.body.category || 'general').trim();
    const platform = (req.body.platform || 'other').trim().toLowerCase();
    const version = (req.body.version || '').trim();
    const minOs = (req.body.minOs || '').trim();
    const isPublished = req.body.isPublished === undefined
      ? true
      : req.body.isPublished === 'true' || req.body.isPublished === true;
    if (!['windows', 'mac', 'other'].includes(platform)) {
      return res.status(400).json({ message: 'platform must be windows, mac, or other' });
    }
    if (!isAllowedPlatformExtension(platform, file.originalname)) {
      return res.status(400).json({
        message: platform === 'windows'
          ? 'Windows uploads must be .exe or .msi files'
          : platform === 'mac'
            ? 'macOS uploads must be .dmg or .pkg files'
            : 'Unsupported file type'
      });
    }

    const { key } = await objectStorage.uploadCloudMedia(file.originalname, file.buffer, file.mimetype);

    if (isPublished && (platform === 'windows' || platform === 'mac')) {
      // Enforce one active build per platform by auto-archiving previous published builds.
      await DownloadableFile.updateMany(
        { platform, isPublished: true },
        { $set: { isPublished: false } }
      );
    }

    const created = await DownloadableFile.create({
      title,
      description,
      category,
      platform,
      version,
      minOs,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      storageKey: key,
      isPublished,
      uploadedBy: (req as any).user?._id?.toString?.() || undefined
    });

    res.status(201).json({ file: mapDownloadableFile(created) });
  } catch (error) {
    console.error('Error uploading downloadable file:', error);
    res.status(500).json({ message: 'Failed to upload file' });
  }
};

export const generatePresignedUploadUrl = async (req: Request, res: Response) => {
  try {
    const { filename, mimeType } = req.body;
    if (!filename) {
      return res.status(400).json({ message: 'Filename is required' });
    }
    
    const fileId = randomUUID();
    const safeFileName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '-');
    const key = `cloud-media/${fileId}-${safeFileName}`;
    
    const presignedUrl = await objectStorage.getSignedUploadUrl(key, mimeType || 'application/octet-stream', 3600);
    
    res.json({ presignedUrl, key });
  } catch (error) {
    console.error('Error generating presigned upload URL:', error);
    res.status(500).json({ message: 'Failed to generate upload URL' });
  }
};

export const confirmUpload = async (req: Request, res: Response) => {
  try {
    const {
      key, title, description, category, platform, version, minOs, originalName, mimeType, fileSize, isPublished
    } = req.body;
    
    if (!key || !platform || !originalName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['windows', 'mac', 'other'].includes(platform)) {
      return res.status(400).json({ message: 'platform must be windows, mac, or other' });
    }

    // Verify file actually exists in S3
    const exists = await objectStorage.fileExists(key);
    if (!exists) {
      return res.status(404).json({ message: 'File not found in storage. Upload may have failed.' });
    }

    const targetPublished = isPublished === undefined ? true : (isPublished === 'true' || isPublished === true);

    if (targetPublished && (platform === 'windows' || platform === 'mac')) {
      // Enforce one active build per platform by auto-archiving previous published builds.
      await DownloadableFile.updateMany(
        { platform, isPublished: true },
        { $set: { isPublished: false } }
      );
    }

    const created = await DownloadableFile.create({
      title: title || originalName,
      description: description || '',
      category: category || 'general',
      platform,
      version: version || '',
      minOs: minOs || '',
      originalName,
      mimeType: mimeType || 'application/octet-stream',
      fileSize: fileSize || 0,
      storageKey: key,
      isPublished: targetPublished,
      uploadedBy: (req as any).user?._id?.toString?.() || undefined
    });

    res.status(201).json({ file: mapDownloadableFile(created) });
  } catch (error) {
    console.error('Error confirming upload:', error);
    res.status(500).json({ message: 'Failed to confirm upload' });
  }
};


export const updateDownloadableFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await DownloadableFile.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'File not found' });
    }

    const update: Record<string, unknown> = {};
    if (typeof req.body.title === 'string') update.title = req.body.title.trim();
    if (typeof req.body.description === 'string') update.description = req.body.description.trim();
    if (typeof req.body.category === 'string') update.category = req.body.category.trim();
    if (typeof req.body.platform === 'string') {
      const platform = req.body.platform.trim().toLowerCase();
      if (!['windows', 'mac', 'other'].includes(platform)) {
        return res.status(400).json({ message: 'platform must be windows, mac, or other' });
      }
      update.platform = platform;
    }
    if (typeof req.body.version === 'string') update.version = req.body.version.trim();
    if (typeof req.body.minOs === 'string') update.minOs = req.body.minOs.trim();
    if (typeof req.body.isPublished === 'boolean') update.isPublished = req.body.isPublished;

    const targetPlatform = (update.platform as string | undefined) || existing.platform;
    const targetPublished = typeof update.isPublished === 'boolean' ? update.isPublished : existing.isPublished;
    if (targetPublished && (targetPlatform === 'windows' || targetPlatform === 'mac')) {
      // Enforce one active build per platform by auto-archiving other published builds.
      await DownloadableFile.updateMany(
        { _id: { $ne: id }, platform: targetPlatform, isPublished: true },
        { $set: { isPublished: false } }
      );
    }

    const updated = await DownloadableFile.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!updated) return res.status(404).json({ message: 'File not found' });

    res.json({ file: mapDownloadableFile(updated) });
  } catch (error) {
    console.error('Error updating downloadable file:', error);
    res.status(500).json({ message: 'Failed to update file' });
  }
};

export const deleteDownloadableFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await DownloadableFile.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'File not found' });
    }

    await objectStorage.deleteFile(existing.storageKey);
    await DownloadableFile.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting downloadable file:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
};

export const downloadPublishedFile = async (req: Request, res: Response) => {
  try {
    const file = await DownloadableFile.findOne({ _id: req.params.id, isPublished: true });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const safeName = sanitizeDownloadFilename(file.originalName);
    trackDownloadEvent(req, file);

    // Prefer a direct CDN redirect via the R2 public domain (pub-xxx.r2.dev).
    // This serves the file from Cloudflare's CDN edge — no backend proxy, no
    // gateway timeouts, and no "Access Denied" from the private S3 API endpoint.
    const cdnUrl = buildPublicCdnUrl(file.storageKey);
    if (cdnUrl) {
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      return res.redirect(302, cdnUrl);
    }

    // Fallback: stream through the backend if no public CDN URL is configured
    // (i.e. fully private bucket setup). Data flows continuously so Cloudflare's
    // read-timeout won't trigger for actively transferring files.
    const { stream, contentLength } = await objectStorage.streamFile(file.storageKey);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Cache-Control', 'no-store');
    (stream as any).pipe(res);
  } catch (error) {
    console.error('Error downloading published file:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to download file' });
    }
  }
};

export const getDesktopDownloads = async (req: Request, res: Response) => {
  try {
    const [windowsFile, macFile] = await Promise.all([
      DownloadableFile.findOne({ isPublished: true, platform: 'windows' }).sort({ createdAt: -1 }),
      DownloadableFile.findOne({ isPublished: true, platform: 'mac' }).sort({ createdAt: -1 })
    ]);

    res.json({
      windows: windowsFile ? mapDownloadableFile(windowsFile) : null,
      mac: macFile ? mapDownloadableFile(macFile) : null
    });
  } catch (error) {
    console.error('Error fetching desktop downloads:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const downloadDesktopByPlatform = async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform;
    if (platform !== 'windows' && platform !== 'mac') {
      return res.status(400).json({ message: 'Invalid platform' });
    }

    const file = await DownloadableFile.findOne({ isPublished: true, platform }).sort({ createdAt: -1 });
    if (!file) {
      return res.status(404).json({ message: `No published ${platform} build found` });
    }

    const safeName = sanitizeDownloadFilename(file.originalName);
    trackDownloadEvent(req, file, platform);

    // Prefer a direct CDN redirect via the R2 public domain (pub-xxx.r2.dev).
    // This serves the file from Cloudflare's CDN edge — no backend proxy, no
    // gateway timeouts, and no "Access Denied" from the private S3 API endpoint.
    const cdnUrl = buildPublicCdnUrl(file.storageKey);
    if (cdnUrl) {
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      return res.redirect(302, cdnUrl);
    }

    // Fallback: stream through the backend if no public CDN URL is configured
    // (i.e. fully private bucket setup). Data flows continuously so Cloudflare's
    // read-timeout won't trigger for actively transferring files.
    const { stream, contentLength } = await objectStorage.streamFile(file.storageKey);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Cache-Control', 'no-store');
    (stream as any).pipe(res);
  } catch (error) {
    console.error('Error downloading desktop file by platform:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to download file' });
    }
  }
};

export const submitSupportTicket = async (req: Request, res: Response) => {
  try {
    const { subject, message, priority, category } = req.body;
    const userId = (req as any).user._id;

    const newTicket = new SupportTicket({
      subject,
      message,
      priority,
      category,
      submittedBy: userId
    });

    await newTicket.save();
    
    res.status(201).json({ success: true, message: 'Support ticket submitted successfully. We will be in touch soon.' });
  } catch (error) {
    console.error('Error submitting ticket:', error);
    res.status(500).json({ message: 'Failed to submit support ticket' });
  }
};

export const getDownloadAnalytics = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      total,
      last7Days,
      last30Days,
      windowsTotal,
      macTotal,
      userPanelTotal,
      recentEventsRaw
    ] = await Promise.all([
      DownloadEvent.countDocuments(),
      DownloadEvent.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      DownloadEvent.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      DownloadEvent.countDocuments({ platform: 'windows' }),
      DownloadEvent.countDocuments({ platform: 'mac' }),
      DownloadEvent.countDocuments({ source: 'user-panel-download-page' }),
      DownloadEvent.find()
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('downloadableFileId', 'title originalName version platform')
    ]);

    const recentEvents = recentEventsRaw.map((event: any) => ({
      id: event._id,
      createdAt: event.createdAt,
      platform: event.platform,
      source: event.source,
      fileTitle: event.downloadableFileId?.title || event.downloadableFileId?.originalName || 'Unknown file',
      version: event.downloadableFileId?.version || null
    }));

    res.json({
      totals: {
        allTime: total,
        last7Days,
        last30Days,
        windows: windowsTotal,
        mac: macTotal,
        fromUserPanel: userPanelTotal
      },
      recentEvents
    });
  } catch (error) {
    console.error('Error fetching download analytics:', error);
    res.status(500).json({ message: 'Failed to fetch download analytics' });
  }
};

export const seedHelpData = async (req: Request, res: Response) => {
  try {
    // Only allow if empty to prevent duplicates
    const count = await HelpArticle.countDocuments();
    if (count > 0) return res.status(400).json({ message: 'Already seeded' });

    await HelpArticle.create({
      title: "Getting Started with Q-worship",
      slug: "getting-started",
      description: "Learn the basics of setting up your first presentation.",
      content: "Welcome to Q-worship! Here is how to create a presentation...",
      category: "getting-started",
      readTime: "5 min",
      difficulty: "Beginner",
      tags: ["basics", "onboarding"]
    });

    await FAQ.create({
      question: "How do I reset my password?",
      answer: "Go to settings and click reset.",
      category: "billing"
    });

    await ResourceLink.create({
      title: "Video Tutorials",
      description: "Watch comprehensive unlisted tutorials.",
      url: "https://youtube.com/qworship",
      category: "guides",
      icon: "Video"
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'error seeding' });
  }
};
