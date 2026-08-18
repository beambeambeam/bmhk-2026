import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc, userAc } from "better-auth/plugins/admin/access";

const permissionStatement = {
  ...defaultStatements,
  staff: ["access", "registration_access"],
} as const;

const ac = createAccessControl(permissionStatement);

const authRoleValues = ["admin", "registrationStaff", "staff", "user"] as const;
export type AuthRole = (typeof authRoleValues)[number];

const admin = ac.newRole({
  staff: ["access", "registration_access"],
  ...adminAc.statements,
});

const staff = ac.newRole({
  staff: ["registration_access"],
  ...userAc.statements,
});

const registrationStaff = ac.newRole({
  staff: ["access"],
  ...userAc.statements,
});

const user = ac.newRole({
  ...userAc.statements,
});

const roles = {
  admin,
  registrationStaff,
  staff,
  user,
} as const satisfies Record<AuthRole, unknown>;

function isAuthRole(role: string): role is AuthRole {
  return Object.hasOwn(roles, role);
}

function hasRegistrationAccess(role: string | null | undefined): boolean {
  if (role === null || role === undefined || role.length === 0 || !isAuthRole(role)) {
    return false;
  }

  return roles[role].authorize({ staff: ["registration_access"] }).success;
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
  hasRegistrationAccess,
  hasStaffAccess,
  permissionStatement,
  registrationStaff,
  roles,
  staff,
  user,
};
