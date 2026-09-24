import { describe, expect, it } from "vitest";

import {
  hasAcademicAccess,
  getManageableRoles,
  hasTeamRemovalAccess,
  hasRegistrationAccess,
  hasStaffAccess,
  hasUserManagementAccess,
  isAuthRole,
  roles,
} from "../permission";

describe("role permissions", () => {
  it.each(["staff", "registrationStaff", "academicStaff"] as const)(
    "does not grant Better Auth administrator operations to %s",
    (role) => {
      expect(roles[role].authorize({ user: ["set-role"] }).success).toBeFalsy();
      expect(roles[role].authorize({ session: ["revoke"] }).success).toBeFalsy();
    },
  );

  it.each([
    ["staff", true, false, false],
    ["registrationStaff", true, true, false],
    ["academicStaff", true, false, true],
    ["admin", true, true, true],
    ["superAdmin", true, true, true],
    ["user", false, false, false],
    ["unknown", false, false, false],
    ["staff,admin", false, false, false],
    [null, false, false, false],
  ] as const)(
    "enforces the staff permission matrix for %s",
    (role, access, registration, academic) => {
      expect(hasStaffAccess(role)).toBe(access);
      expect(hasRegistrationAccess(role)).toBe(registration);
      expect(hasAcademicAccess(role)).toBe(academic);
    },
  );

  it("limits admins to lower roles and gives superAdmins the complete role set", () => {
    expect(getManageableRoles("admin")).toStrictEqual([
      "academicStaff",
      "registrationStaff",
      "staff",
      "user",
    ]);
    expect(getManageableRoles("superAdmin")).toStrictEqual([
      "superAdmin",
      "admin",
      "academicStaff",
      "registrationStaff",
      "staff",
      "user",
    ]);
    expect(getManageableRoles("registrationStaff")).toStrictEqual(["staff", "user"]);
    expect(getManageableRoles("staff")).toStrictEqual([]);
    expect(getManageableRoles("admin,superAdmin")).toStrictEqual([]);
  });

  it("recognizes superAdmin and grants administrative and staff permissions", () => {
    expect(isAuthRole("superAdmin")).toBeTruthy();
    expect(hasRegistrationAccess("superAdmin")).toBeTruthy();
    expect(hasStaffAccess("superAdmin")).toBeTruthy();
    expect(
      roles.superAdmin.authorize({ session: ["revoke"], user: ["set-role", "set-password"] })
        .success,
    ).toBeTruthy();
  });

  it("gives registration staff registration and staff permissions", () => {
    expect(hasRegistrationAccess("registrationStaff")).toBeTruthy();
    expect(hasStaffAccess("registrationStaff")).toBeTruthy();
  });

  it.each([
    ["registrationStaff", true],
    ["admin", true],
    ["superAdmin", true],
    ["staff", false],
    ["user", false],
    ["unknown", false],
  ] as const)("returns %s for all-team removal access", (role, expected) => {
    expect(hasTeamRemovalAccess(role)).toBe(expected);
  });

  it("only grants user management access to roles with manageable accounts", () => {
    expect(hasUserManagementAccess("registrationStaff")).toBeTruthy();
    expect(hasUserManagementAccess("admin")).toBeTruthy();
    expect(hasUserManagementAccess("superAdmin")).toBeTruthy();
    expect(hasUserManagementAccess("staff")).toBeFalsy();
    expect(hasUserManagementAccess("user")).toBeFalsy();
  });

  it("rejects unknown and combined roles at application boundaries", () => {
    expect(hasStaffAccess("admin,user")).toBeFalsy();
    expect(hasRegistrationAccess("unknown")).toBeFalsy();
    expect(hasStaffAccess(null)).toBeFalsy();
  });
});
