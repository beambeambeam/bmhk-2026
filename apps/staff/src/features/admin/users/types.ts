import type { AdminUserRole } from "@bmhk-2026/api";

type AuthRole = AdminUserRole;
type EmailDomainFilter = "all" | "kmutt.ac.th";
type RoleFilter = AuthRole | "all";

function getAuthRoleLabel(role: string | null | undefined): string {
  switch (role ?? "user") {
    case "superAdmin": {
      return "ผู้ดูแลระบบสูงสุด";
    }
    case "admin": {
      return "ผู้ดูแลระบบ";
    }
    case "registrationStaff": {
      return "ทีมงานลงทะเบียน";
    }
    case "staff": {
      return "ทีมงาน";
    }
    case "user": {
      return "ผู้ใช้";
    }
    default: {
      return "ผู้ใช้";
    }
  }
}

function isAuthRole(role: string, roles: readonly AuthRole[]): role is AuthRole {
  return roles.some((allowedRole) => allowedRole === role);
}

export type { AdminUser } from "@bmhk-2026/api";
export { getAuthRoleLabel, isAuthRole, type AuthRole, type EmailDomainFilter, type RoleFilter };
