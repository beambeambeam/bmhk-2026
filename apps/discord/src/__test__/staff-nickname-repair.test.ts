import { describe, expect, it } from "vitest";

import { formatStaffNicknameReport, planStaffNicknameRepair } from "../lib/staff-nickname-repair";
import type { StaffNicknameFact } from "../services/discord-admin-api";

function fact(
  overrides: Partial<Extract<StaffNicknameFact, { status: "OK" }>> = {},
): StaffNicknameFact {
  return { discord_user_id: "111", nickname: "[Staff] Somchai", status: "OK", ...overrides };
}

describe(planStaffNicknameRepair, () => {
  it("plans an update for a member whose nickname has drifted", () => {
    const plan = planStaffNicknameRepair({
      currentNicknames: new Map([["111", "old-name"]]),
      facts: [fact()],
      guildMemberIds: new Set(["111"]),
    });

    expect(plan.steps).toStrictEqual([{ discordUserId: "111", nickname: "[Staff] Somchai" }]);
    expect(plan.alreadyCorrect).toStrictEqual([]);
  });

  it("skips a member whose nickname is already correct", () => {
    const plan = planStaffNicknameRepair({
      currentNicknames: new Map([["111", "[Staff] Somchai"]]),
      facts: [fact()],
      guildMemberIds: new Set(["111"]),
    });

    expect(plan.steps).toStrictEqual([]);
    expect(plan.alreadyCorrect).toStrictEqual(["111"]);
  });

  it("buckets a staff member who is not currently in the guild, without planning a step", () => {
    const plan = planStaffNicknameRepair({
      currentNicknames: new Map(),
      facts: [fact()],
      guildMemberIds: new Set(),
    });

    expect(plan.steps).toStrictEqual([]);
    expect(plan.notInServer).toStrictEqual(["111"]);
  });

  it("buckets an overseer whose group has no category set up yet", () => {
    const plan = planStaffNicknameRepair({
      currentNicknames: new Map([["111", "anything"]]),
      facts: [{ discord_user_id: "111", status: "GROUP_NOT_SET_UP" }],
      guildMemberIds: new Set(["111"]),
    });

    expect(plan.steps).toStrictEqual([]);
    expect(plan.groupNotSetUp).toStrictEqual(["111"]);
  });

  it("treats a member with no nickname set (null) as needing the target nickname", () => {
    const plan = planStaffNicknameRepair({
      currentNicknames: new Map([["111", null]]),
      facts: [fact()],
      guildMemberIds: new Set(["111"]),
    });

    expect(plan.steps).toStrictEqual([{ discordUserId: "111", nickname: "[Staff] Somchai" }]);
  });
});

describe(formatStaffNicknameReport, () => {
  it("summarizes updated, already-correct, not-in-server and failed counts", () => {
    const plan = {
      alreadyCorrect: ["a1"],
      groupNotSetUp: ["g1"],
      notInServer: ["n1", "n2"],
      steps: [{ discordUserId: "u1", nickname: "[Staff] X" }],
    };

    const report = formatStaffNicknameReport(plan, 1, { failed: [] });

    expect(report).toContain("Updated: 1");
    expect(report).toContain("Already correct: 1");
    expect(report).toContain("Not in server (2):");
    expect(report).toContain("<@n1>");
    expect(report).toContain("<@n2>");
  });

  it("lists staff whose overseer group has no category set up yet", () => {
    const plan = {
      alreadyCorrect: [],
      groupNotSetUp: ["g1"],
      notInServer: [],
      steps: [],
    };

    const report = formatStaffNicknameReport(plan, 0, { failed: [] });

    expect(report).toContain("Group not set up (1):");
    expect(report).toContain("<@g1>");
  });

  it("lists failed steps by their label", () => {
    const plan = { alreadyCorrect: [], groupNotSetUp: [], notInServer: [], steps: [] };

    const report = formatStaffNicknameReport(plan, 0, { failed: ['set nickname of <@1> to "X"'] });

    expect(report).toContain("Failed (1):");
    expect(report).toContain('set nickname of <@1> to "X"');
  });
});
