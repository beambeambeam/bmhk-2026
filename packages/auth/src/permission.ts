import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc, userAc } from "better-auth/plugins/admin/access";

const permissionStatement = {
  ...defaultStatements,
  staff: ["access", "registration_access", "academic_access"],
} as const;

const ac = createAccessControl(permissionStatement);

const authRoleValues = [
  "superAdmin",
  "admin",
  "academicStaff",
  "registrationStaff",
  "staff",
  "user",
] as const;
export type AuthRole = (typeof authRoleValues)[number];

const admin = ac.newRole({
  staff: ["access", "registration_access", "academic_access"],
  ...adminAc.statements,
});

const superAdmin = ac.newRole({
  staff: ["access", "registration_access", "academic_access"],
  ...adminAc.statements,
});

const academicStaff = ac.newRole({
  staff: ["academic_access"],
});

const staff = ac.newRole({
  staff: ["registration_access"],
  ...userAc.statements,
});

const registrationStaff = ac.newRole({
  staff: ["access", "registration_access"],
  ...userAc.statements,
});

const user = ac.newRole({
  ...userAc.statements,
});

const roles = {
  academicStaff,
  admin,
  registrationStaff,
  staff,
  superAdmin,
  user,
} as const satisfies Record<AuthRole, unknown>;

function hasAdminAccess(role: string | null | undefined): boolean {
  return role === "admin" || role === "superAdmin";
}

function hasAcademicAccess(role: string | null | undefined): boolean {
  if (role === null || role === undefined || role.length === 0 || !isAuthRole(role)) {
    return false;
  }

  return roles[role].authorize({ staff: ["academic_access"] }).success;
}

function getManageableRoles(role: string | null | undefined): readonly AuthRole[] {
  if (role === "superAdmin") {
    return authRoleValues;
  }
  if (role === "registrationStaff") {
    return ["staff", "user"];
  }
  return role === "admin" ? ["academicStaff", "registrationStaff", "staff", "user"] : [];
}

function isAuthRole(role: string): role is AuthRole {
  return Object.hasOwn(roles, role);
}

function hasRegistrationAccess(role: string | null | undefined): boolean {
  if (role === null || role === undefined || role.length === 0 || !isAuthRole(role)) {
    return false;
  }

  return roles[role].authorize({ staff: ["registration_access"] }).success;
}

function hasTeamRemovalAccess(role: string | null | undefined): boolean {
  return role === "registrationStaff" || hasAdminAccess(role);
}

function hasUserManagementAccess(role: string | null | undefined): boolean {
  return getManageableRoles(role).length > 0;
}

function hasStaffAccess(role: string | null | undefined): boolean {
  if (role === null || role === undefined || role.length === 0 || !isAuthRole(role)) {
    return false;
  }

  return roles[role].authorize({ staff: ["access"] }).success;
}

export {
  ac,
  admin,
  academicStaff,
  authRoleValues,
  isAuthRole,
  hasAdminAccess,
  hasAcademicAccess,
  getManageableRoles,
  hasRegistrationAccess,
  hasStaffAccess,
  hasTeamRemovalAccess,
  hasUserManagementAccess,
  permissionStatement,
  registrationStaff,
  roles,
  staff,
  superAdmin,
  user,
};
