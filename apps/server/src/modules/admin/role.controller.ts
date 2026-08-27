import { Request, Response } from "express";
import { Role } from "./role.model.js";
import { User } from "../auth/auth.model.js";

// admin-management (and its Custom Roles / Permissions sub-views) is always
// superadmin-only and can never be granted as a section permission - granting
// it would let an admin manage roles/admins and self-escalate.
const NON_GRANTABLE_SECTION_IDS = new Set(["admin-management"]);

function sanitizePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const unique = new Set(
    input
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim())
  );
  NON_GRANTABLE_SECTION_IDS.forEach((id) => unique.delete(id));
  return [...unique];
}

export const listRoles = async (req: Request, res: Response) => {
  try {
    const roles = await Role.find().sort({ createdAt: -1 }).lean();
    const counts = await User.aggregate([
      { $match: { roleId: { $ne: null } } },
      { $group: { _id: "$roleId", count: { $sum: 1 } } },
    ]);
    const countByRole = new Map(counts.map((row) => [String(row._id), row.count]));
    return res.json({
      success: true,
      roles: roles.map((role) => ({
        id: role._id,
        name: role.name,
        description: role.description || "",
        permissions: role.permissions || [],
        isSystem: !!role.isSystem,
        adminCount: countByRole.get(String(role._id)) || 0,
        createdAt: role.createdAt,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name) return res.status(400).json({ success: false, message: "Role name is required" });
    const role = await Role.create({
      name,
      description: typeof req.body.description === "string" ? req.body.description.trim() : "",
      permissions: sanitizePermissions(req.body.permissions),
      createdBy: (req as any).user?._id,
    });
    return res.status(201).json({ success: true, role });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "A role with this name already exists" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });
    if (role.isSystem) return res.status(400).json({ success: false, message: "System roles cannot be edited" });

    if (typeof req.body.name === "string" && req.body.name.trim()) role.name = req.body.name.trim();
    if (typeof req.body.description === "string") role.description = req.body.description.trim();
    if (req.body.permissions !== undefined) role.permissions = sanitizePermissions(req.body.permissions);

    await role.save();
    return res.json({ success: true, role });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "A role with this name already exists" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });
    if (role.isSystem) return res.status(400).json({ success: false, message: "System roles cannot be deleted" });

    const assignedCount = await User.countDocuments({ roleId: role._id });
    const reassignTo = req.query.reassignTo;
    if (assignedCount > 0 && reassignTo === undefined) {
      return res.status(409).json({
        success: false,
        message: `This role is assigned to ${assignedCount} admin${assignedCount === 1 ? "" : "s"}`,
        adminCount: assignedCount,
      });
    }
    if (assignedCount > 0) {
      const nextRoleId = reassignTo === "null" || !reassignTo ? null : reassignTo;
      await User.updateMany({ roleId: role._id }, { roleId: nextRoleId });
    }

    await role.deleteOne();
    return res.json({ success: true, reassigned: assignedCount });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
