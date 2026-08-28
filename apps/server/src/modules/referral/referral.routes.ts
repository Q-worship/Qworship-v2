import { Router } from "express";
import { submitReferralRequest } from "./referral.controller.js";
import { rateLimit } from "../auth/rate-limit.middleware.js";

export const referralRouter = Router();

referralRouter.post("/apply", rateLimit("referral-apply", 10, 60 * 60 * 1000), submitReferralRequest);
