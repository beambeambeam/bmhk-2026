import { describe, expect, it } from "vitest";

import { formatLookupParticipant } from "../interactions/commands/lookupparticipant";

describe(formatLookupParticipant, () => {
  it("says so when the Discord user has no verified participant record", () => {
    expect(formatLookupParticipant("999", { status: "NOT_FOUND" })).toBe(
      "<@999> has no verified participant record.",
    );
  });

  it("shows full details and the alt account when looked up by the main account", () => {
    const text = formatLookupParticipant("111", {
      code: "ABCD2345",
      contact: { email: "somchai@example.com", line_id: "somchai.line", phone: "0800000000" },
      matched_account: "main",
      name_th: "นาย สมชาย ใจดี",
      other_discord_user_id: "222",
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
        "Matched via: main account",
        "Alt Discord: <@222>",
      ].join("\n"),
    );
  });

  it("shows the main account when looked up by the alt account", () => {
    const text = formatLookupParticipant("222", {
      code: "ABCD2345",
      contact: { email: "somchai@example.com", line_id: null, phone: "0800000000" },
      matched_account: "alt",
      name_th: "นาย สมชาย ใจดี",
      other_discord_user_id: "111",
      school: "โรงเรียนบางมด",
      status: "FOUND",
      team_name: "Team 7",
    });

    expect(text).toContain("Matched via: alt account");
    expect(text).toContain("Main Discord: <@111>");
    expect(text).toContain("Line: —");
  });

  it("shows an empty alt slot when the participant has no alt account", () => {
    const text = formatLookupParticipant("111", {
      code: "ABCD2345",
      contact: { email: "somchai@example.com", line_id: null, phone: "0800000000" },
      matched_account: "main",
      name_th: "นาย สมชาย ใจดี",
      other_discord_user_id: null,
      school: "โรงเรียนบางมด",
      status: "FOUND",
      team_name: "Team 7",
    });

    expect(text).toContain("Alt Discord: —");
  });
});
