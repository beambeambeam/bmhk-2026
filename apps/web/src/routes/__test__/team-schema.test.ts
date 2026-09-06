import { describe, expect, it } from "vitest";

import { teamSchema } from "../register/team";

describe("team registration schema", () => {
  it.each([
    { name: "Team 1", scenario: "English, numbers, and space" },
    { name: "Team-1", scenario: "English, numbers, and hyphen" },
    { name: "Team_1", scenario: "English, numbers, and underscore" },
    { name: "ทีมหมูปิ้ง 1", scenario: "Thai, numbers, and space" },
    { name: "ทีม-1", scenario: "Thai, numbers, and hyphen" },
    { name: "ทีม_1", scenario: "Thai, numbers, and underscore" },
    { name: "ทีม Alpha 1", scenario: "mixed Thai and English with numbers and space" },
    { name: "12345678901234567", scenario: "exactly 17 characters" },
    { name: "  Team One  ", scenario: "trimmed input within limit" },
  ])("accepts valid team name: $scenario", ({ name }) => {
    const result = teamSchema.safeParse({
      name,
      school: "Bangmod School",
      teamSize: 2,
    });

    expect(result.success).toBeTruthy();
    expect(result.data?.name).toBe(name.trim());
  });

  it.each([
    {
      expectedMessage: "กรุณาระบุชื่อทีม",
      name: "",
      scenario: "empty name",
    },
    {
      expectedMessage: "กรุณาระบุชื่อทีม",
      name: "   ",
      scenario: "whitespace-only name",
    },
    {
      expectedMessage: "ชื่อทีมต้องมีความยาวไม่เกิน 17 ตัวอักษร",
      name: "123456789012345678",
      scenario: "name exceeding 17 characters",
    },
    {
      expectedMessage:
        "ชื่อทีมต้องใช้ภาษาอังกฤษ ภาษาไทย ตัวเลข เว้นวรรค หรือเครื่องหมาย - และ _ เท่านั้น และห้ามใช้อักขระพิเศษ",
      name: "Team@1",
      scenario: "special character @",
    },
    {
      expectedMessage:
        "ชื่อทีมต้องใช้ภาษาอังกฤษ ภาษาไทย ตัวเลข เว้นวรรค หรือเครื่องหมาย - และ _ เท่านั้น และห้ามใช้อักขระพิเศษ",
      name: "Team+1",
      scenario: "plus sign",
    },
    {
      expectedMessage:
        "ชื่อทีมต้องใช้ภาษาอังกฤษ ภาษาไทย ตัวเลข เว้นวรรค หรือเครื่องหมาย - และ _ เท่านั้น และห้ามใช้อักขระพิเศษ",
      name: "ทีม#1",
      scenario: "hash symbol",
    },
    {
      expectedMessage:
        "ชื่อทีมต้องใช้ภาษาอังกฤษ ภาษาไทย ตัวเลข เว้นวรรค หรือเครื่องหมาย - และ _ เท่านั้น และห้ามใช้อักขระพิเศษ",
      name: "Team!1",
      scenario: "exclamation mark",
    },
    {
      expectedMessage:
        "ชื่อทีมต้องใช้ภาษาอังกฤษ ภาษาไทย ตัวเลข เว้นวรรค หรือเครื่องหมาย - และ _ เท่านั้น และห้ามใช้อักขระพิเศษ",
      name: "Team.1",
      scenario: "dot",
    },
    {
      expectedMessage:
        "ชื่อทีมต้องใช้ภาษาอังกฤษ ภาษาไทย ตัวเลข เว้นวรรค หรือเครื่องหมาย - และ _ เท่านั้น และห้ามใช้อักขระพิเศษ",
      name: "Team$1",
      scenario: "dollar sign",
    },
  ])("rejects invalid team name: $scenario", ({ name, expectedMessage }) => {
    const result = teamSchema.safeParse({
      name,
      school: "Bangmod School",
      teamSize: 2,
    });

    const nameIssue = result.error?.issues.find((issue) => issue.path[0] === "name");

    expect(result.success).toBeFalsy();
    expect(nameIssue?.message).toBe(expectedMessage);
  });
});
