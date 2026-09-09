import { describe, expect, it } from "vitest";

import {
  getManageableRoles,
  hasRegistrationAccess,
  hasStaffAccess,
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

  it("rejects unknown and combined roles at application boundaries", () => {
    expect(hasStaffAccess("admin,user")).toBeFalsy();
    expect(hasRegistrationAccess("unknown")).toBeFalsy();
    expect(hasStaffAccess(null)).toBeFalsy();
  });
});
