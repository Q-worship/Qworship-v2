import { Router } from 'express';
import { createOrganization, selectPlan, getOrganization, updateOrganization } from './organization.controller.js';
import { protect } from '../auth/auth.middleware.js';

export const organizationRouter = Router();

organizationRouter.post('/organizations', protect, createOrganization);
organizationRouter.post('/plans/select', protect, selectPlan);
organizationRouter.get('/organization/:id', protect, getOrganization);
organizationRouter.put('/organization/:id', protect, updateOrganization);
