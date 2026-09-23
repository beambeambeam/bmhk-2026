import { describe, expect, it } from "vitest";

import {
  formatParticipantNicknameReport,
  planParticipantNicknameRepair,
} from "../lib/participant-nickname-repair";
import type { ParticipantNicknameFact } from "../services/discord-admin-api";

function fact(overrides: Partial<ParticipantNicknameFact> = {}): ParticipantNicknameFact {
  return { discord_user_id: "111", nickname: "001-Team Alpha-Somchai", ...overrides };
}

describe(planParticipantNicknameRepair, () => {
  it("plans an update for a member whose nickname has drifted", () => {
    const plan = planParticipantNicknameRepair({
      currentNicknames: new Map([["111", "old-name"]]),
      facts: [fact()],
      guildMemberIds: new Set(["111"]),
    });

    expect(plan.steps).toStrictEqual([
      { discordUserId: "111", nickname: "001-Team Alpha-Somchai" },
    ]);
    expect(plan.alreadyCorrect).toStrictEqual([]);
  });

  it("skips a member whose nickname is already correct", () => {
    const plan = planParticipantNicknameRepair({
      currentNicknames: new Map([["111", "001-Team Alpha-Somchai"]]),
      facts: [fact()],
      guildMemberIds: new Set(["111"]),
    });

    expect(plan.steps).toStrictEqual([]);
    expect(plan.alreadyCorrect).toStrictEqual(["111"]);
  });

  it("buckets a participant who is not currently in the guild, without planning a step", () => {
    const plan = planParticipantNicknameRepair({
      currentNicknames: new Map(),
      facts: [fact()],
      guildMemberIds: new Set(),
    });

    expect(plan.steps).toStrictEqual([]);
    expect(plan.notInServer).toStrictEqual(["111"]);
  });

  it("treats a member with no nickname set (null) as needing the target nickname", () => {
    const plan = planParticipantNicknameRepair({
      currentNicknames: new Map([["111", null]]),
      facts: [fact()],
      guildMemberIds: new Set(["111"]),
    });

    expect(plan.steps).toStrictEqual([
      { discordUserId: "111", nickname: "001-Team Alpha-Somchai" },
    ]);
  });
});

describe(formatParticipantNicknameReport, () => {
  it("summarizes updated, already-correct, not-in-server and failed counts", () => {
    const plan = {
      alreadyCorrect: ["a1"],
      notInServer: ["n1", "n2"],
      steps: [{ discordUserId: "u1", nickname: "001-Team Alpha-X" }],
    };

    const report = formatParticipantNicknameReport(plan, 1, { failed: [] });

    expect(report).toContain("Updated: 1");
    expect(report).toContain("Already correct: 1");
    expect(report).toContain("Not in server (2):");
    expect(report).toContain("<@n1>");
    expect(report).toContain("<@n2>");
  });

  it("lists failed steps by their label", () => {
    const plan = { alreadyCorrect: [], notInServer: [], steps: [] };

    const report = formatParticipantNicknameReport(plan, 0, {
      failed: ['set nickname of <@1> to "X"'],
    });

    expect(report).toContain("Failed (1):");
    expect(report).toContain('set nickname of <@1> to "X"');
  });
});
