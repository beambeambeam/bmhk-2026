import type { AdminUserRole } from "@bmhk-2026/api";

type AuthRole = AdminUserRole;
type EmailDomainFilter = "all" | "kmutt.ac.th";
type RoleFilter = AuthRole | "all";

function isAuthRole(role: string, roles: readonly AuthRole[]): role is AuthRole {
  return roles.some((allowedRole) => allowedRole === role);
}

export type { AdminUser } from "@bmhk-2026/api";
export { isAuthRole, type AuthRole, type EmailDomainFilter, type RoleFilter };
