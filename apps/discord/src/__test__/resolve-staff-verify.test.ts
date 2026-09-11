import { describe, expect, it } from "vitest";

import { planStaffVerify } from "../lib/resolve-staff-verify";

describe(planStaffVerify, () => {
  it("plans the admin role for an admin request", () => {
    const plan = planStaffVerify(
      { categoryId: null, discordUserId: "discord-1", isAdmin: true, nickname: "[Admin] Somchai" },
      { adminRoleId: "role-admin", staffRoleId: "role-staff" },
    );

    expect(plan).toStrictEqual({
      categoryId: null,
      nickname: "[Admin] Somchai",
      roleId: "role-admin",
    });
  });

  it("plans the staff role for a non-admin request", () => {
    const plan = planStaffVerify(
      {
        categoryId: "category-9",
        discordUserId: "discord-1",
        isAdmin: false,
        nickname: "[3] Somchai",
      },
      { adminRoleId: "role-admin", staffRoleId: "role-staff" },
    );

    expect(plan).toStrictEqual({
      categoryId: "category-9",
      nickname: "[3] Somchai",
      roleId: "role-staff",
    });
  });

  it("plans a null role when the matching setting has not been configured", () => {
    const plan = planStaffVerify(
      { categoryId: null, discordUserId: "discord-1", isAdmin: false, nickname: "[Staff] Somchai" },
      { adminRoleId: "role-admin", staffRoleId: null },
    );

    expect(plan.roleId).toBeNull();
  });
});
