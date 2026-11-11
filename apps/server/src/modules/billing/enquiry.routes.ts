import { Router } from "express";
import { protect, authorizeAdmin } from "../auth/auth.middleware.js";
import { rateLimit } from "../auth/rate-limit.middleware.js";
import { EnterpriseEnquiry } from "./enquiry.model.js";

export const enquiryRouter = Router();

/** Where the sales team is told to look, until there is an email transport. */
const SALES_INBOX_NOTE = "Enterprise enquiries are listed in the admin area.";

/**
 * Submit an enterprise enquiry.
 *
 * PUBLIC, and rate limited because of it: a prospect reaching this from the
 * marketing site has no account yet, so requiring a token would turn the
 * Talk to sales button into a sign-up wall for the largest customers we
 * have.
 *
 * Takes only what sales needs to make contact. Nothing here is trusted into
 * a plan — an enquiry grants no entitlement and creates no account.
 */
enquiryRouter.post(
  "/enterprise-enquiry",
  rateLimit("enterprise-enquiry", 5, 60 * 60 * 1000),
  async (req: any, res: any) => {
    try {
      const { name, email, organizationName, churches, phone, message } = req.body || {};

      // Validated here rather than relied on from the form: this endpoint is
      // public, so the browser's `required` attributes prove nothing.
      const missing = ["name", "email", "organizationName"].filter(
        (field) => !String(req.body?.[field] || "").trim(),
      );
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Please provide: ${missing.join(", ")}`,
        });
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email).trim())) {
        return res.status(400).json({ success: false, message: "That email address does not look right" });
      }

      await EnterpriseEnquiry.create({
        name: String(name).trim(),
        email: String(email).trim(),
        organizationName: String(organizationName).trim(),
        churches: churches ? String(churches).trim() : undefined,
        phone: phone ? String(phone).trim() : undefined,
        message: message ? String(message).trim() : undefined,
        // Attributed when they happen to be signed in; never required.
        userId: req.user?._id ?? null,
      });

      console.log(`[Sales] Enterprise enquiry from ${String(email).trim()}. ${SALES_INBOX_NOTE}`);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error recording enterprise enquiry:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

/** The sales queue, newest first. Staff only. */
enquiryRouter.get("/enterprise-enquiries", protect, authorizeAdmin, async (_req: any, res: any) => {
  try {
    const enquiries = await EnterpriseEnquiry.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ success: true, enquiries });
  } catch (error) {
    console.error("Error listing enterprise enquiries:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/** Move an enquiry along the queue. Staff only. */
enquiryRouter.patch("/enterprise-enquiries/:id", protect, authorizeAdmin, async (req: any, res: any) => {
  try {
    const status = String(req.body?.status || "");
    if (!["new", "contacted", "closed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Unknown status" });
    }
    const enquiry = await EnterpriseEnquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    ).lean();
    if (!enquiry) return res.status(404).json({ success: false, message: "No such enquiry" });
    res.json({ success: true, enquiry });
  } catch (error) {
    console.error("Error updating enterprise enquiry:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
