import { describe, expect, it } from "vitest";

import { firstNameOf, staffNicknameOf } from "../staff-nickname";

describe(firstNameOf, () => {
  it("takes the text before the first space", () => {
    expect(firstNameOf("Somchai Test")).toBe("Somchai");
  });

  it("returns the whole trimmed name when there is no space", () => {
    expect(firstNameOf("  Somchai  ")).toBe("Somchai");
  });
});

describe(staffNicknameOf, () => {
  it("prefixes admins with [Admin], regardless of any overseer group", () => {
    const result = staffNicknameOf({
      overseerGroup: { categoryId: "cat-1", index: 3 },
      role: "admin",
      userName: "Somchai Test",
    });

    expect(result).toStrictEqual({ nickname: "[Admin] Somchai", status: "OK" });
  });

  it("treats superAdmin the same as admin", () => {
    const result = staffNicknameOf({
      overseerGroup: null,
      role: "superAdmin",
      userName: "Somchai",
    });

    expect(result).toStrictEqual({ nickname: "[Admin] Somchai", status: "OK" });
  });

  it("prefixes an overseer with their group index", () => {
    const result = staffNicknameOf({
      overseerGroup: { categoryId: "cat-9", index: 3 },
      role: "staff",
      userName: "Somchai Test",
    });

    expect(result).toStrictEqual({ nickname: "[3] Somchai", status: "OK" });
  });

  it("fails closed when the overseer's group has no category set up yet", () => {
    const result = staffNicknameOf({
      overseerGroup: { categoryId: null, index: 3 },
      role: "staff",
      userName: "Somchai Test",
    });

    expect(result).toStrictEqual({ status: "GROUP_NOT_SET_UP" });
  });

  it("prefixes a plain staff member with [Staff]", () => {
    const result = staffNicknameOf({
      overseerGroup: null,
      role: "staff",
      userName: "Somchai Test",
    });

    expect(result).toStrictEqual({ nickname: "[Staff] Somchai", status: "OK" });
  });

  it("treats any non-admin role, e.g. registrationStaff, as plain staff", () => {
    const result = staffNicknameOf({
      overseerGroup: null,
      role: "registrationStaff",
      userName: "Somchai Test",
    });

    expect(result).toStrictEqual({ nickname: "[Staff] Somchai", status: "OK" });
  });
});
