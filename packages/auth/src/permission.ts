import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc, userAc } from "better-auth/plugins/admin/access";

const permissionStatement = {
  ...defaultStatements,
  staff: ["access", "registration_access", "registration_review"],
} as const;

const ac = createAccessControl(permissionStatement);

const authRoleValues = ["superAdmin", "admin", "registrationStaff", "staff", "user"] as const;
export type AuthRole = (typeof authRoleValues)[number];

const admin = ac.newRole({
  staff: ["access", "registration_access", "registration_review"],
  ...adminAc.statements,
});

const superAdmin = ac.newRole({
  staff: ["access", "registration_access", "registration_review"],
  ...adminAc.statements,
});

const staff = ac.newRole({
  staff: ["registration_access"],
  ...userAc.statements,
});

const registrationStaff = ac.newRole({
  staff: ["access", "registration_access", "registration_review"],
  ...userAc.statements,
});

const user = ac.newRole({
  ...userAc.statements,
});

const roles = {
  admin,
  registrationStaff,
  staff,
  superAdmin,
  user,
} as const satisfies Record<AuthRole, unknown>;

function hasAdminAccess(role: string | null | undefined): boolean {
  return role === "admin" || role === "superAdmin";
}

function getManageableRoles(role: string | null | undefined): readonly AuthRole[] {
  if (role === "superAdmin") {
    return authRoleValues;
  }
  if (role === "registrationStaff") {
    return ["staff", "user"];
  }
  return role === "admin" ? ["registrationStaff", "staff", "user"] : [];
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

function hasRegistrationReviewAccess(role: string | null | undefined): boolean {
  if (role === null || role === undefined || role.length === 0 || !isAuthRole(role)) {
    return false;
  }

  return roles[role].authorize({ staff: ["registration_review"] }).success;
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
  authRoleValues,
  isAuthRole,
  hasAdminAccess,
  getManageableRoles,
  hasRegistrationAccess,
  hasRegistrationReviewAccess,
  hasStaffAccess,
  hasUserManagementAccess,
  permissionStatement,
  registrationStaff,
  roles,
  staff,
  superAdmin,
  user,
};
