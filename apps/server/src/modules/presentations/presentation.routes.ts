import { Router } from 'express';
import { protect, requireProductAccess } from '../auth/auth.middleware.js';
import * as presentationController from './presentation.controller.js';

export const presentationRouter = Router();
presentationRouter.use(protect, requireProductAccess);

// Retrieve presentations
presentationRouter.get('/', presentationController.getPresentations);
presentationRouter.get('/:id', presentationController.getPresentationById);

// Creation
presentationRouter.post('/', presentationController.createPresentation);
presentationRouter.post('/bulk', presentationController.bulkCreatePresentations);

// Modification
presentationRouter.put('/:id', presentationController.updatePresentation);
presentationRouter.delete('/:id', presentationController.deletePresentation);
