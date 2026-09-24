import { describe, expect, it } from "vitest";

import { planStaffVerify } from "../lib/resolve-staff-verify";

const roles = {
  admin: "role-admin",
  participant: "role-participant",
  registrationStaff: "role-registration",
  staff: "role-staff",
};

describe(planStaffVerify, () => {
  it("plans the admin role for an admin request", () => {
    const plan = planStaffVerify(
      { categoryId: null, discordUserId: "discord-1", nickname: "[Admin] Somchai", role: "admin" },
      roles,
    );

    expect(plan).toStrictEqual({
      categoryId: null,
      nickname: "[Admin] Somchai",
      roleIds: ["role-admin"],
    });
  });

  it("plans the admin role for a superAdmin request", () => {
    const plan = planStaffVerify(
      {
        categoryId: null,
        discordUserId: "discord-1",
        nickname: "[Admin] Somchai",
        role: "superAdmin",
      },
      roles,
    );

    expect(plan.roleIds).toStrictEqual(["role-admin"]);
  });

  it("plans the staff role for a staff request", () => {
    const plan = planStaffVerify(
      {
        categoryId: "category-9",
        discordUserId: "discord-1",
        nickname: "[3] Somchai",
        role: "staff",
      },
      roles,
    );

    expect(plan).toStrictEqual({
      categoryId: "category-9",
      nickname: "[3] Somchai",
      roleIds: ["role-staff"],
    });
  });

  it("plans both staff and registration staff roles for a registrationStaff request", () => {
    const plan = planStaffVerify(
      {
        categoryId: null,
        discordUserId: "discord-1",
        nickname: "[Staff] Somchai",
        role: "registrationStaff",
      },
      roles,
    );

    expect(plan.roleIds).toStrictEqual(["role-staff", "role-registration"]);
  });

  it("plans only the staff role when the registration staff role is not configured", () => {
    const plan = planStaffVerify(
      {
        categoryId: null,
        discordUserId: "discord-1",
        nickname: "[Staff] Somchai",
        role: "registrationStaff",
      },
      { ...roles, registrationStaff: null },
    );

    expect(plan.roleIds).toStrictEqual(["role-staff"]);
  });

  it("plans no role when the matching setting has not been configured", () => {
    const plan = planStaffVerify(
      { categoryId: null, discordUserId: "discord-1", nickname: "[Staff] Somchai", role: "staff" },
      { ...roles, staff: null },
    );

    expect(plan.roleIds).toStrictEqual([]);
  });
});
