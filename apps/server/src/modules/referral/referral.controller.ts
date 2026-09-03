import { randomBytes } from "crypto";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { ReferralRequest } from "./referral.model.js";
import { User } from "../auth/auth.model.js";
import { Organization } from "../organization/organization.model.js";
import { sendAdminCredentialsEmail } from "../auth/email.service.js";
import { CommissionLedgerEntry } from "./commissionLedger.model.js";
import { WithdrawalRequest } from "./withdrawalRequest.model.js";
import { PLAN_MONTHLY_PRICE, computeMonthlyCommission, SubscriptionType } from "../../config/referralCommission.js";
import { notifyReferralCommissionEarned, notifyReferralWithdrawalPaid } from "../notifications/notification.service.js";

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

function monthsBetween(start: Date, end: Date): string[] {
  const periods: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    periods.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return periods;
}

async function accrueCommissionsForReferee(refereeId: string) {
  const activeOrgs = await Organization.find({ referredBy: refereeId, subscriptionStatus: "active", activatedAt: { $exists: true } })
    .select("name subscriptionType activatedAt")
    .lean();

  const now = new Date();
  for (const org of activeOrgs) {
    const subscriptionType = org.subscriptionType as SubscriptionType;
    const commissionAmount = computeMonthlyCommission(subscriptionType);
    if (commissionAmount <= 0 || !org.activatedAt) continue;
    const grossAmount = PLAN_MONTHLY_PRICE[subscriptionType] ?? 0;
    const periods = monthsBetween(org.activatedAt as unknown as Date, now);
    for (const period of periods) {
      try {
        const result = await CommissionLedgerEntry.updateOne(
          { refereeId, organizationId: org._id, period },
          { $setOnInsert: { refereeId, organizationId: org._id, period, grossAmount, commissionAmount, status: "available" } },
          { upsert: true }
        );
        if (result.upsertedCount > 0) {
          notifyReferralCommissionEarned(refereeId, commissionAmount, org.name).catch(() => {});
        }
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
      }
    }
  }
}

async function buildEarningsSummary(refereeId: string) {
  await accrueCommissionsForReferee(refereeId);

  const ledger = await CommissionLedgerEntry.find({ refereeId })
    .sort({ period: -1 })
    .populate("organizationId", "name")
    .lean();

  const round2 = (value: number) => Math.round(value * 100) / 100;

  const availableBalance = ledger.filter((e) => e.status === "available").reduce((sum, e) => sum + e.commissionAmount, 0);
  const totalPaid = ledger.filter((e) => e.status === "paid").reduce((sum, e) => sum + e.commissionAmount, 0);

  const pendingWithdrawals = await WithdrawalRequest.find({ refereeId, status: { $in: ["pending", "processing"] } }).lean();
  const reservedAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  const withdrawableBalance = Math.max(0, round2(availableBalance - reservedAmount));

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const activeOrgs = await Organization.find({ referredBy: refereeId, subscriptionStatus: "active" }).select("subscriptionType").lean();
  const estimatedThisMonth = activeOrgs.reduce((sum, org) => sum + computeMonthlyCommission(org.subscriptionType as SubscriptionType), 0);

  const trendMap = new Map<string, number>();
  for (const entry of ledger) {
    trendMap.set(entry.period, (trendMap.get(entry.period) || 0) + entry.commissionAmount);
  }
  const trendPeriods: string[] = [];
  const cursor = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  for (let i = 0; i < 6; i++) {
    trendPeriods.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const earningsTrend = trendPeriods.map((period) => ({ period, earned: round2(trendMap.get(period) || 0) }));

  return {
    availableBalance: round2(availableBalance),
    withdrawableBalance,
    totalPaid: round2(totalPaid),
    totalEarnedAllTime: round2(availableBalance + totalPaid),
    estimatedThisMonth: round2(estimatedThisMonth),
    currentPeriod,
    earningsTrend,
    ledger: ledger.slice(0, 24).map((e: any) => ({
      id: e._id,
      church: e.organizationId?.name ?? "Unknown church",
      organizationId: e.organizationId?._id ?? e.organizationId,
      period: e.period,
      grossAmount: e.grossAmount,
      commissionAmount: e.commissionAmount,
      status: e.status,
      createdAt: e.createdAt,
    })),
  };
}

async function flipLedgerToPaid(refereeId: string, amount: number) {
  const rows = await CommissionLedgerEntry.find({ refereeId, status: "available" }).sort({ period: 1 }).lean();
  let remaining = amount;
  for (const row of rows) {
    if (remaining <= 0) break;
    await CommissionLedgerEntry.updateOne({ _id: row._id }, { $set: { status: "paid" } });
    remaining -= row.commissionAmount;
  }
}

export const getMyEarnings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== "referee") return res.status(403).json({ success: false, message: "This endpoint is only available to referral partners" });
    const summary = await buildEarningsSummary(String(user._id));
    return res.json({ success: true, ...summary });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== "referee") return res.status(403).json({ success: false, message: "This endpoint is only available to referral partners" });

    const amount = Number(req.body.amount);
    const destination = typeof req.body.destination === "string" ? req.body.destination.trim() : "";

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Enter a valid withdrawal amount" });
    }
    if (!destination) {
      return res.status(400).json({ success: false, message: "Provide a payout destination" });
    }

    const summary = await buildEarningsSummary(String(user._id));
    if (amount > summary.withdrawableBalance) {
      return res.status(400).json({ success: false, message: "Withdrawal amount exceeds your available balance" });
    }

    const request = await WithdrawalRequest.create({
      refereeId: user._id,
      amount: Math.round(amount * 100) / 100,
      destination,
      status: "pending",
    });

    return res.status(201).json({ success: true, request });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyWithdrawals = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== "referee") return res.status(403).json({ success: false, message: "This endpoint is only available to referral partners" });
    const requests = await WithdrawalRequest.find({ refereeId: user._id }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, requests });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getRefereeFinancialsForAdmin = async (req: Request, res: Response) => {
  try {
    const referee = await User.findOne({ _id: req.params.id, role: "referee" });
    if (!referee) return res.status(404).json({ success: false, message: "Referral partner account not found" });
    const summary = await buildEarningsSummary(req.params.id);
    const withdrawals = await WithdrawalRequest.find({ refereeId: req.params.id }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, ...summary, withdrawals });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const adminUpdateWithdrawal = async (req: Request, res: Response) => {
  try {
    const { status, adminNote } = req.body;
    const allowedStatuses = ["pending", "processing", "paid", "rejected"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const request = await WithdrawalRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Withdrawal request not found" });

    const wasPaid = request.status === "paid";
    request.status = status;
    if (adminNote !== undefined) request.adminNote = adminNote;
    if (status === "paid" && !wasPaid) {
      request.processedAt = new Date();
      await flipLedgerToPaid(String(request.refereeId), request.amount);
    }
    await request.save();

    if (status === "paid" && !wasPaid) {
      notifyReferralWithdrawalPaid(request.refereeId, request.amount).catch(() => {});
    }

    return res.json({ success: true, request });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
