import { randomBytes } from "crypto";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { ReferralRequest } from "./referral.model.js";
import { User } from "../auth/auth.model.js";
import { Organization } from "../organization/organization.model.js";
import { sendAdminCredentialsEmail } from "../auth/email.service.js";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function generateTempPassword() {
  return randomBytes(12).toString("base64url");
}

export function generateReferralCode() {
  const suffix = randomBytes(6).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return `QW-${suffix}`;
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
      referralCode: generateReferralCode(),
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

function toRefereeRow(user: any) {
  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    countryCode: user.countryCode,
    phoneNumber: user.phoneNumber,
    referralCode: user.referralCode ?? null,
    isActive: !!user.isActive,
    mustChangePassword: !!user.mustChangePassword,
    lastLogin: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
  };
}

export const listReferees = async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const query: any = { role: "referee" };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      query.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
    }
    const referees = await User.find(query).select("-password").sort({ createdAt: -1 }).lean();
    return res.json({ success: true, referees: referees.map(toRefereeRow) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getRefereeDetail = async (req: Request, res: Response) => {
  try {
    const referee = await User.findOne({ _id: req.params.id, role: "referee" }).select("-password").lean();
    if (!referee) return res.status(404).json({ success: false, message: "Referral partner account not found" });

    const application = await ReferralRequest.findOne({ refereeUserId: referee._id })
      .populate("reviewedBy", "firstName lastName email")
      .lean();

    return res.json({
      success: true,
      referee: toRefereeRow(referee),
      application: application
        ? {
            id: application._id,
            country: application.country,
            state: application.state,
            product: application.product,
            about: application.about,
            appliedAt: application.createdAt,
            approvedAt: application.reviewedAt,
            approvedBy: application.reviewedBy
              ? {
                  firstName: (application.reviewedBy as any).firstName,
                  lastName: (application.reviewedBy as any).lastName,
                  email: (application.reviewedBy as any).email,
                }
              : null,
          }
        : null,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const suspendReferee = async (req: Request, res: Response) => {
  try {
    const target = await User.findOne({ _id: req.params.id, role: "referee" });
    if (!target) return res.status(404).json({ success: false, message: "Referral partner account not found" });
    target.isActive = !target.isActive;
    await target.save();
    return res.json({ success: true, referee: toRefereeRow(target) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

async function listReferredOrganizations(refereeId: string) {
  const organizations = await Organization.find({ referredBy: refereeId })
    .sort({ createdAt: -1 })
    .select("name city country subscriptionType subscriptionStatus createdAt")
    .lean();
  return organizations.map((org: any) => ({
    id: org._id,
    church: org.name,
    city: org.city || "",
    country: org.country || "",
    plan: org.subscriptionType,
    status: org.subscriptionStatus,
    date: org.createdAt,
  }));
}

export const getReferredOrganizationsForAdmin = async (req: Request, res: Response) => {
  try {
    const referee = await User.findOne({ _id: req.params.id, role: "referee" });
    if (!referee) return res.status(404).json({ success: false, message: "Referral partner account not found" });
    const churches = await listReferredOrganizations(req.params.id);
    return res.json({ success: true, churches });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyReferredOrganizations = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== "referee") return res.status(403).json({ success: false, message: "This endpoint is only available to referral partners" });
    const churches = await listReferredOrganizations(String(user._id));
    return res.json({ success: true, churches });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resetRefereePassword = async (req: Request, res: Response) => {
  try {
    const target = await User.findOne({ _id: req.params.id, role: "referee" });
    if (!target) return res.status(404).json({ success: false, message: "Referral partner account not found" });

    const tempPassword = generateTempPassword();
    target.password = await bcrypt.hash(tempPassword, 12);
    target.mustChangePassword = true;
    await target.save();

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
    let emailSent = true;
    try {
      await sendAdminCredentialsEmail(target.email, target.firstName, tempPassword, {
        roleName: "Referral Partner",
        isReset: true,
        loginUrl: `${frontendUrl}/refer-and-earn/login`,
      });
      console.log("[Referral] password reset email sent to", target.email);
    } catch (emailError: any) {
      emailSent = false;
      console.error("[Referral] failed to send password reset email:", emailError.message);
    }

    return res.json({
      success: true,
      emailSent,
      warning: emailSent ? undefined : "Password was reset, but the notification email failed to send.",
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
