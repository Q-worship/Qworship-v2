import { Router } from 'express';
import multer from 'multer';
import { protect, requireProductAccess } from '../auth/auth.middleware.js';
import * as songsController from './songs.controller.js';

export const songsRouter = Router();
songsRouter.use(protect, requireProductAccess);

// Configure multer for legacy song file import buffers
const songUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ["text/plain", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type. Only TEXT, PDF, and DOCX are allowed."));
  },
});

// Retrieve library
songsRouter.get('/', songsController.getSongs);
songsRouter.get('/revision', songsController.getSongsRevision);
songsRouter.get('/:id', songsController.getSongById);

// Creation and modification
songsRouter.post('/', songsController.createSong);
songsRouter.put('/:id', songsController.updateSong);
songsRouter.delete('/:id', songsController.deleteSong);

// Utilities
songsRouter.post('/projection', songsController.getSongForProjection);
songsRouter.post('/search', songsController.searchSongs);
songsRouter.post('/import', songUpload.single('file'), songsController.importSong);
