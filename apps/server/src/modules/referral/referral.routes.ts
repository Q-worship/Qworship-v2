import { Router } from "express";
import {
  submitReferralRequest,
  getMyReferredOrganizations,
  getMyEarnings,
  requestWithdrawal,
  getMyWithdrawals,
  trackReferralVisit,
  getMyCampaigns,
  createCampaign,
  getMyVisitStats,
} from "./referral.controller.js";
import { rateLimit } from "../auth/rate-limit.middleware.js";
import { protect } from "../auth/auth.middleware.js";

export const referralRouter = Router();

referralRouter.post("/apply", rateLimit("referral-apply", 10, 60 * 60 * 1000), submitReferralRequest);
referralRouter.get("/my-organizations", protect, getMyReferredOrganizations);
referralRouter.get("/my-earnings", protect, getMyEarnings);
referralRouter.post("/withdrawals", protect, requestWithdrawal);
referralRouter.get("/my-withdrawals", protect, getMyWithdrawals);
referralRouter.post("/track-visit", rateLimit("referral-visit", 30, 10 * 60 * 1000), trackReferralVisit);
referralRouter.get("/campaigns", protect, getMyCampaigns);
referralRouter.post("/campaigns", protect, createCampaign);
referralRouter.get("/my-visit-stats", protect, getMyVisitStats);
