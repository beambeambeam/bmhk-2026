import type { RoleSettings } from "./role-settings.js";

const ADMIN_ROLES = new Set(["admin", "superAdmin"]);

export interface StaffVerifyRequest {
  categoryId: string | null;
  discordUserId: string;
  nickname: string;
  role: string;
}

export interface StaffVerifyPlan {
  categoryId: string | null;
  nickname: string;
  roleIds: string[];
}

/** Discord roles a linked staff account should hold, by their DB role. Unconfigured roles are left out. */
export function staffDiscordRoleIds(role: string | null, roles: RoleSettings): string[] {
  if (role !== null && ADMIN_ROLES.has(role)) {
    return roles.admin === null ? [] : [roles.admin];
  }
  const roleIds =
    role === "registrationStaff" ? [roles.staff, roles.registrationStaff] : [roles.staff];
  return roleIds.filter((roleId): roleId is string => roleId !== null);
}

export function planStaffVerify(request: StaffVerifyRequest, roles: RoleSettings): StaffVerifyPlan {
  return {
    categoryId: request.categoryId,
    nickname: request.nickname,
    roleIds: staffDiscordRoleIds(request.role, roles),
  };
}
