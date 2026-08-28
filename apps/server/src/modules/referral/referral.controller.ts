import { randomBytes } from "crypto";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { ReferralRequest } from "./referral.model.js";
import { User } from "../auth/auth.model.js";
import { sendAdminCredentialsEmail } from "../auth/email.service.js";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function generateTempPassword() {
  return randomBytes(12).toString("base64url");
}

export const submitReferralRequest = async (req: Request, res: Response) => {
  try {
    const firstName = typeof req.body.firstName === "string" ? req.body.firstName.trim() : "";
    const lastName = typeof req.body.lastName === "string" ? req.body.lastName.trim() : "";
    const email = normalizeEmail(req.body.email);
    const country = typeof req.body.country === "string" ? req.body.country.trim() : "";
    const state = typeof req.body.state === "string" ? req.body.state.trim() : undefined;
    const phoneNumber = typeof req.body.phoneNumber === "string" ? req.body.phoneNumber.trim() : "";
    const product = req.body.product === "go-green" ? "go-green" : req.body.product === "qworship" ? "qworship" : null;
    const about = typeof req.body.about === "string" ? req.body.about.trim() : undefined;

    if (!firstName || !lastName || !email || !country || !phoneNumber || !product) {
      return res.status(400).json({ success: false, message: "First name, last name, email, country, phone number, and product are required" });
    }

    if (await ReferralRequest.findOne({ email })) {
      return res.status(409).json({ success: false, message: "You have already submitted an application with this email address." });
    }
    if (await User.findOne({ email })) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }

    const request = await ReferralRequest.create({
      firstName,
      lastName,
      email,
      country,
      state,
      phoneNumber,
      product,
      about,
    });

    return res.status(201).json({ success: true, id: request._id });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "You have already submitted an application with this email address." });
    }
    console.error("[Referral] submit error:", error);
    return res.status(500).json({ success: false, message: "Unable to submit your application. Please try again." });
  }
};

export const listReferralRequests = async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const query: any = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) query.status = status;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      query.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
    }
    const requests = await ReferralRequest.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, requests });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const approveReferralRequest = async (req: Request, res: Response) => {
  try {
    const request = await ReferralRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Referral request not found" });
    if (request.status !== "pending") {
      return res.status(409).json({ success: false, message: `This request has already been ${request.status}` });
    }
    if (await User.findOne({ email: request.email })) {
      return res.status(409).json({ success: false, message: "An account with this email already exists" });
    }

    const tempPassword = generateTempPassword();
    const referee = await User.create({
      username: request.email,
      email: request.email,
      password: await bcrypt.hash(tempPassword, 12),
      firstName: request.firstName,
      lastName: request.lastName,
      countryCode: request.country,
      phoneNumber: request.phoneNumber,
      role: "referee",
      isActive: true,
      emailVerified: true,
      mustChangePassword: true,
    });

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
    let emailSent = true;
    try {
      await sendAdminCredentialsEmail(request.email, request.firstName, tempPassword, {
        roleName: "Referral Partner",
        loginUrl: `${frontendUrl}/refer-and-earn/login`,
      });
      console.log("[Referral] credentials email sent to", request.email);
    } catch (emailError: any) {
      emailSent = false;
      console.error("[Referral] failed to send credentials email:", emailError.message);
    }

    request.status = "approved";
    request.reviewedBy = (req as any).user._id;
    request.reviewedAt = new Date();
    request.refereeUserId = referee._id as any;
    await request.save();

    return res.json({ success: true, request, emailSent });
  } catch (error: any) {
    console.error("[Referral] approve error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectReferralRequest = async (req: Request, res: Response) => {
  try {
    const request = await ReferralRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Referral request not found" });
    if (request.status !== "pending") {
      return res.status(409).json({ success: false, message: `This request has already been ${request.status}` });
    }
    request.status = "rejected";
    request.reviewedBy = (req as any).user._id;
    request.reviewedAt = new Date();
    await request.save();
    return res.json({ success: true, request });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
