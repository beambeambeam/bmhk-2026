import { describe, expect, it } from "vitest";

import { formatLookupParticipant } from "../interactions/commands/lookupparticipant";

describe(formatLookupParticipant, () => {
  it("says so when the Discord user has no verified participant record", () => {
    expect(formatLookupParticipant("999", { status: "NOT_FOUND" })).toBe(
      "<@999> has no verified participant record.",
    );
  });

  it("shows the participant's full details", () => {
    const text = formatLookupParticipant("111", {
      code: "ABCD2345",
      contact: { email: "somchai@example.com", line_id: "somchai.line", phone: "0800000000" },
      name_th: "นาย สมชาย ใจดี",
      school: "โรงเรียนบางมด",
      status: "FOUND",
      team_name: "Team 7",
    });

    expect(text).toBe(
      [
        "Verify code: `ABCD2345`",
        "Name: นาย สมชาย ใจดี",
        "Team: Team 7",
        "School: โรงเรียนบางมด",
        "Email: somchai@example.com",
        "Phone: 0800000000",
        "Line: somchai.line",
      ].join("\n"),
    );
  });
});
