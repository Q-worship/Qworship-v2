// Shared Constants will be placed here
export const APP_NAME = "QWorship V2";

/**
 * What a person DOES at their church. Distinct from `User.role`, which is the
 * authorization enum (admin, superadmin, ...) and is never set from a profile
 * form: a job-title dropdown that wrote to `role` would let anyone make
 * themselves an administrator.
 */
export const CHURCH_ROLES = [
  { value: "pastor", label: "Pastor" },
  { value: "administrator", label: "Administrator" },
  { value: "worship_leader", label: "Worship Leader" },
  { value: "technical_lead", label: "Technical Lead" },
] as const;

export type ChurchRole = (typeof CHURCH_ROLES)[number]["value"];

export const churchRoleLabel = (value?: string | null): string | undefined =>
  CHURCH_ROLES.find((r) => r.value === value)?.label;
