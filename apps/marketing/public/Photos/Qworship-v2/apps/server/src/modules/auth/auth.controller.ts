import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "./auth.model.js";
import {
  notifyWelcome,
  notifyPasswordChange,
} from "../notifications/notification.service.js";
import {
  generateVerificationCode,
  sendVerificationCode,
  storeVerificationCode,
  storePendingSignup,
  getPendingSignup,
  clearPendingSignup,
  verifyStoredCode,
} from "./verification.service.js";

const JWT_SECRET = process.env.JWT_SECRET || "qworship-super-secret-key-123!";

// Sign Up — stores pending signup and sends verification code (no User row until OTP verified)
export const signUp = async (req: Request, res: Response) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      countryCode,
      phoneNumber,
      agreeToMarketing,
      organizationName,
      accountType,
      isActive,
      role,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingVerified = await User.findOne({
      email: normalizedEmail,
      emailVerified: true,
    });
    if (existingVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
        errorType: "DUPLICATE_EMAIL",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    storePendingSignup(normalizedEmail, {
      firstName,
      lastName,
      hashedPassword,
      username: username || normalizedEmail,
      countryCode,
      phoneNumber,
      agreeToMarketing,
      organizationName,
      accountType: accountType || "free",
      isActive: isActive !== undefined ? isActive : true,
      role: role || "user",
    });

    const code = generateVerificationCode();
    storeVerificationCode(normalizedEmail, code);
    sendVerificationCode(normalizedEmail, code);

    res.status(201).json({
      success: true,
      email: normalizedEmail,
      message: "Verification code sent to your email.",
      nextStep: "/verify",
    });
  } catch (error) {
    console.error("Sign-up error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during sign up" });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const pending = getPendingSignup(normalizedEmail);

    if (!pending) {
      return res.status(404).json({
        success: false,
        message: "No pending sign-up found for this email. Please sign up again.",
      });
    }

    const existingVerified = await User.findOne({
      email: normalizedEmail,
      emailVerified: true,
    });
    if (existingVerified) {
      clearPendingSignup(normalizedEmail);
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const isValid = verifyStoredCode(normalizedEmail, String(code));
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
      });
    }

    const newUser = await User.create({
      username: pending.username || normalizedEmail,
      email: normalizedEmail,
      password: pending.hashedPassword,
      firstName: pending.firstName,
      lastName: pending.lastName,
      countryCode: pending.countryCode,
      phoneNumber: pending.phoneNumber,
      agreeToMarketing: pending.agreeToMarketing,
      organizationName: pending.organizationName,
      accountType: pending.accountType || "free",
      isActive: pending.isActive !== undefined ? pending.isActive : true,
      emailVerified: true,
      role: pending.role || "user",
    });

    clearPendingSignup(normalizedEmail);

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    notifyWelcome(newUser._id, newUser.firstName).catch(() => {});

    res.status(200).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        organizationName: newUser.organizationName,
      },
      nextStep: "/dashboard",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during email verification",
    });
  }
};

export const resendVerification = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const pending = getPendingSignup(normalizedEmail);

    if (!pending) {
      return res.status(404).json({
        success: false,
        message: "No pending sign-up found for this email. Please sign up again.",
      });
    }

    const existingVerified = await User.findOne({
      email: normalizedEmail,
      emailVerified: true,
    });
    if (existingVerified) {
      clearPendingSignup(normalizedEmail);
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const code = generateVerificationCode();
    storeVerificationCode(normalizedEmail, code);
    sendVerificationCode(normalizedEmail, code);

    res.status(200).json({
      success: true,
      message: "Verification code resent.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error resending verification code",
    });
  }
};

// Normal & Admin Sign In Handler
export const signIn = async (req: Request, res: Response) => {
  try {
    // Note: The UI might send { username, password } or { email, password }
    const email = req.body.email || req.body.username;
    const password = req.body.password;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    // Find User
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // Different success mapping based on role
    const nextStep =
      user.role === "superadmin"
        ? "/super-admin"
        : user.role === "admin"
          ? "/super-admin"
          : "/project-selection";

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        role: user.role,
        organizationName: user.organizationName,
      },
      admin: user.role !== "user" ? { adminType: user.role } : undefined,
      nextStep,
    });
  } catch (error) {
    console.error("Sign-in error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during sign in" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId =
      (req as any).user?._id || (req as any).user?.id || req.body.userId;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { firstName, lastName, role, profilePicture, phone, bio, username } =
      req.body;
    let updateObject: any = { firstName, lastName, role };
    if (profilePicture !== undefined)
      updateObject.profilePicture = profilePicture;
    if (phone !== undefined) updateObject.phoneNumber = phone;
    if (bio !== undefined) updateObject.bio = bio;
    if (username !== undefined) updateObject.username = username;

    const updatedUser = await User.findByIdAndUpdate(userId, updateObject, {
      new: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        username: updatedUser.username,
        role: updatedUser.role,
        bio: updatedUser.bio,
        phoneNumber: updatedUser.phoneNumber,
        profilePicture: updatedUser.profilePicture,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error updating profile" });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const userId =
      (req as any).user?._id || (req as any).user?.id || req.body.userId;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current and new password are required",
      });
    }

    const user = await User.findById(userId);
    if (!user || !user.password) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect current password" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    // Fire-and-forget: Password change notification
    notifyPasswordChange(user._id).catch(() => {});

    return res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Update password error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error updating password" });
  }
};
