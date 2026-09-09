import { describe, expect, it } from "vitest";

import { teamNameSchema } from "@bmhk-2026/client/teams";

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
    const result = teamNameSchema.safeParse(name);

    expect(result.success).toBeTruthy();
    expect(result.data).toBe(name.trim());
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
    {
      expectedMessage:
        "ชื่อทีมต้องใช้ภาษาอังกฤษ ภาษาไทย ตัวเลข เว้นวรรค หรือเครื่องหมาย - และ _ เท่านั้น และห้ามใช้อักขระพิเศษ",
      name: "ทีม๏1",
      scenario: "Thai punctuation Fongman (๏)",
    },
    {
      expectedMessage:
        "ชื่อทีมต้องใช้ภาษาอังกฤษ ภาษาไทย ตัวเลข เว้นวรรค หรือเครื่องหมาย - และ _ เท่านั้น และห้ามใช้อักขระพิเศษ",
      name: "ทีม๚1",
      scenario: "Thai punctuation Angkhankhu (๚)",
    },
    {
      expectedMessage:
        "ชื่อทีมต้องใช้ภาษาอังกฤษ ภาษาไทย ตัวเลข เว้นวรรค หรือเครื่องหมาย - และ _ เท่านั้น และห้ามใช้อักขระพิเศษ",
      name: "ทีม๛1",
      scenario: "Thai punctuation Khomut (๛)",
    },
    {
      expectedMessage:
        "ชื่อทีมต้องใช้ภาษาอังกฤษ ภาษาไทย ตัวเลข เว้นวรรค หรือเครื่องหมาย - และ _ เท่านั้น และห้ามใช้อักขระพิเศษ",
      name: "ทีม฿1",
      scenario: "Thai currency Baht (฿)",
    },
    {
      expectedMessage:
        "ชื่อทีมต้องใช้ภาษาอังกฤษ ภาษาไทย ตัวเลข เว้นวรรค หรือเครื่องหมาย - และ _ เท่านั้น และห้ามใช้อักขระพิเศษ",
      name: "ทีม๑",
      scenario: "Thai numeral (๑)",
    },
    {
      expectedMessage:
        "ชื่อทีมต้องใช้ภาษาอังกฤษ ภาษาไทย ตัวเลข เว้นวรรค หรือเครื่องหมาย - และ _ เท่านั้น และห้ามใช้อักขระพิเศษ",
      name: "ทีม ๑๒๓",
      scenario: "Thai numerals (๑๒๓)",
    },
  ])("rejects invalid team name: $scenario", ({ name, expectedMessage }) => {
    const result = teamNameSchema.safeParse(name);

    expect(result.success).toBeFalsy();
    expect(result.error?.issues[0]?.message).toBe(expectedMessage);
  });
});
