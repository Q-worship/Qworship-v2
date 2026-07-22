import { Router } from "express";
import {
  getSections,
  initializeSections,
  createServiceItem,
} from "./service-sections.controller.js";
import { protect, requireProductAccess } from "../auth/auth.middleware.js";

export const serviceSectionsRouter = Router();

// Section endpoints
serviceSectionsRouter.get("/service-sections", protect, requireProductAccess, getSections);
serviceSectionsRouter.post("/service-sections/initialize", protect, requireProductAccess, initializeSections);

// Item endpoints (grouped here since they interact intimately)
serviceSectionsRouter.post("/service-items", protect, requireProductAccess, createServiceItem);
