import { describe, expect, it } from "vitest";

import {
  getManageableRoles,
  hasTeamRemovalAccess,
  hasRegistrationAccess,
  hasStaffAccess,
  hasUserManagementAccess,
  isAuthRole,
  roles,
} from "../permission";

describe("super administrator permissions", () => {
  it("limits admins to lower roles and gives superAdmins the complete role set", () => {
    expect(getManageableRoles("admin")).toStrictEqual(["registrationStaff", "staff", "user"]);
    expect(getManageableRoles("superAdmin")).toStrictEqual([
      "superAdmin",
      "admin",
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
