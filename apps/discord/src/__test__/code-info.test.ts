import { describe, expect, it } from "vitest";

import { formatCodeInfo } from "../interactions/commands/codeinfo";

const TEAM = { index: 7, name: "Team 7", school: "โรงเรียนบางมด" };
const PARTICIPANT = { index: 2, name: "นาย สมชาย ใจดี" };

describe(formatCodeInfo, () => {
  it("says so when the code is unknown", () => {
    expect(formatCodeInfo("ABCD2345", { status: "NOT_FOUND" })).toBe(
      "`ABCD2345` is not a known code.",
    );
  });

  it("shows an unredeemed code with an empty account slot", () => {
    const text = formatCodeInfo("ABCD2345", {
      main: null,
      participant: PARTICIPANT,
      status: "NOT_REDEEMED",
      team: TEAM,
    });

    expect(text).toBe(
      [
        "`ABCD2345` — NOT_REDEEMED",
        "Team: #7 Team 7 (โรงเรียนบางมด)",
        "Participant: 2. นาย สมชาย ใจดี",
        "Discord: —",
      ].join("\n"),
    );
  });

  it("shows who redeemed the code with a Discord timestamp", () => {
    const text = formatCodeInfo("ABCD2345", {
      main: { id: "111", redeemed_at: "2026-09-01T03:00:00.000Z" },
      participant: PARTICIPANT,
      status: "REDEEMED",
      team: TEAM,
    });

    expect(text).toContain("Discord: <@111> (`111`) <t:1788231600:f>");
  });
});
