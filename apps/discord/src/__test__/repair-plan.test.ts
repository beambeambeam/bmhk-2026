import { describe, expect, it } from "vitest";

import { formatRepairReport, planRepair } from "../lib/repair-plan";
import type { RepairInput } from "../lib/repair-plan";

const ROLES = { admin: "role-admin", participant: "role-part", staff: "role-staff" };
const BOT_ID = "bot";

function input(overrides: Partial<RepairInput> = {}): RepairInput {
  return {
    botUserId: BOT_ID,
    facts: { participants: [], staff: [] },
    guildMemberIds: new Set(),
    lockedChannelIds: [],
    memberRoles: new Map(),
    overwrites: new Map(),
    participantRoleHolders: new Set(),
    roles: ROLES,
    ...overrides,
  };
}

describe(planRepair, () => {
  it("grants a linked participant their role and team channel access", () => {
    const plan = planRepair(
      input({
        facts: { participants: [{ channel_id: "chan-1", discord_user_id: "u1" }], staff: [] },
        guildMemberIds: new Set(["u1"]),
        lockedChannelIds: ["chan-1"],
        memberRoles: new Map([["u1", new Set()]]),
      }),
    );

    expect(plan.roleAdds).toStrictEqual([{ roleId: "role-part", userId: "u1" }]);
    expect(plan.grants).toStrictEqual([{ channelId: "chan-1", userId: "u1" }]);
    expect(plan.revokes).toStrictEqual([]);
  });

  it("changes nothing when the participant already has everything", () => {
    const plan = planRepair(
      input({
        facts: { participants: [{ channel_id: "chan-1", discord_user_id: "u1" }], staff: [] },
        guildMemberIds: new Set(["u1"]),
        lockedChannelIds: ["chan-1"],
        memberRoles: new Map([["u1", new Set(["role-part"])]]),
        overwrites: new Map([["chan-1", new Map([["u1", true]])]]),
        participantRoleHolders: new Set(["u1"]),
      }),
    );

    expect(plan).toStrictEqual({
      grants: [],
      revokes: [],
      roleAdds: [],
      roleRemoves: [],
      skippedUserIds: [],
    });
  });

  it("re-grants an overwrite that exists but no longer allows access", () => {
    const plan = planRepair(
      input({
        facts: { participants: [{ channel_id: "chan-1", discord_user_id: "u1" }], staff: [] },
        guildMemberIds: new Set(["u1"]),
        lockedChannelIds: ["chan-1"],
        memberRoles: new Map([["u1", new Set(["role-part"])]]),
        overwrites: new Map([["chan-1", new Map([["u1", false]])]]),
      }),
    );

    expect(plan.grants).toStrictEqual([{ channelId: "chan-1", userId: "u1" }]);
  });

  it("skips linked users who left the server and reports them", () => {
    const plan = planRepair(
      input({
        facts: {
          participants: [{ channel_id: "chan-1", discord_user_id: "gone" }],
          staff: [{ category_id: "cat-1", discord_user_id: "gone-staff", is_admin: false }],
        },
        lockedChannelIds: ["chan-1", "cat-1"],
      }),
    );

    expect(plan.grants).toStrictEqual([]);
    expect(plan.roleAdds).toStrictEqual([]);
    expect(plan.skippedUserIds).toStrictEqual(["gone", "gone-staff"]);
  });

  it("grants staff the staff role and their overseer category, and admins the admin role only", () => {
    const plan = planRepair(
      input({
        facts: {
          participants: [],
          staff: [
            { category_id: "cat-1", discord_user_id: "s1", is_admin: false },
            { category_id: null, discord_user_id: "a1", is_admin: true },
          ],
        },
        guildMemberIds: new Set(["s1", "a1"]),
        lockedChannelIds: ["cat-1"],
        memberRoles: new Map([
          ["s1", new Set()],
          ["a1", new Set()],
        ]),
      }),
    );

    expect(plan.roleAdds).toStrictEqual([
      { roleId: "role-staff", userId: "s1" },
      { roleId: "role-admin", userId: "a1" },
    ]);
    expect(plan.grants).toStrictEqual([{ channelId: "cat-1", userId: "s1" }]);
  });

  it("revokes member overwrites on locked channels that no link justifies, but never the bot's", () => {
    const plan = planRepair(
      input({
        facts: { participants: [{ channel_id: "chan-1", discord_user_id: "u1" }], staff: [] },
        guildMemberIds: new Set(["u1"]),
        lockedChannelIds: ["chan-1"],
        memberRoles: new Map([["u1", new Set(["role-part"])]]),
        overwrites: new Map([
          [
            "chan-1",
            new Map([
              ["u1", true],
              ["stranger", true],
              [BOT_ID, true],
            ]),
          ],
        ]),
      }),
    );

    expect(plan.revokes).toStrictEqual([{ channelId: "chan-1", userId: "stranger" }]);
  });

  it("revokes a participant's access to another team's channel", () => {
    const plan = planRepair(
      input({
        facts: { participants: [{ channel_id: "chan-1", discord_user_id: "u1" }], staff: [] },
        guildMemberIds: new Set(["u1"]),
        lockedChannelIds: ["chan-1", "chan-2"],
        memberRoles: new Map([["u1", new Set(["role-part"])]]),
        overwrites: new Map([
          ["chan-1", new Map([["u1", true]])],
          ["chan-2", new Map([["u1", true]])],
        ]),
      }),
    );

    expect(plan.revokes).toStrictEqual([{ channelId: "chan-2", userId: "u1" }]);
  });

  it("removes the participant role from holders with no participant link, never a staff role", () => {
    const plan = planRepair(
      input({
        facts: {
          participants: [],
          staff: [{ category_id: null, discord_user_id: "s1", is_admin: false }],
        },
        guildMemberIds: new Set(["s1", "stray"]),
        memberRoles: new Map([["s1", new Set(["role-staff"])]]),
        participantRoleHolders: new Set(["stray", "s1"]),
      }),
    );

    expect(plan.roleRemoves).toStrictEqual([
      { roleId: "role-part", userId: "stray" },
      { roleId: "role-part", userId: "s1" },
    ]);
    expect(plan.roleAdds).toStrictEqual([]);
  });

  it("does not revoke access a staff link justifies even when the user is not a participant", () => {
    const plan = planRepair(
      input({
        facts: {
          participants: [],
          staff: [{ category_id: "cat-1", discord_user_id: "s1", is_admin: false }],
        },
        guildMemberIds: new Set(["s1"]),
        lockedChannelIds: ["cat-1"],
        memberRoles: new Map([["s1", new Set(["role-staff"])]]),
        overwrites: new Map([["cat-1", new Map([["s1", true]])]]),
      }),
    );

    expect(plan.revokes).toStrictEqual([]);
  });

  it("leaves roles alone that are not configured", () => {
    const plan = planRepair(
      input({
        facts: { participants: [{ channel_id: null, discord_user_id: "u1" }], staff: [] },
        guildMemberIds: new Set(["u1"]),
        memberRoles: new Map([["u1", new Set()]]),
        roles: { admin: null, participant: null, staff: null },
      }),
    );

    expect(plan.roleAdds).toStrictEqual([]);
  });
});

describe(formatRepairReport, () => {
  const plan = {
    grants: [{ channelId: "chan-1", userId: "u1" }],
    revokes: [{ channelId: "chan-2", userId: "u2" }],
    roleAdds: [{ roleId: "role-part", userId: "u1" }],
    roleRemoves: [],
    skippedUserIds: ["gone"],
  };

  it("labels a dry run as planned and lists each change and the skipped users", () => {
    const report = formatRepairReport(plan, { dryRun: true, failed: [] });

    expect(report).toContain("DRY RUN");
    expect(report).toContain("<@u1> +<@&role-part>");
    expect(report).toContain("<@u1> +access <#chan-1>");
    expect(report).toContain("<@u2> -access <#chan-2>");
    expect(report).toContain("<@gone>");
  });

  it("lists what failed after a real run", () => {
    const report = formatRepairReport(plan, { dryRun: false, failed: ["grant <@u1> <#chan-1>"] });

    expect(report).not.toContain("DRY RUN");
    expect(report).toContain("Failed (1)");
    expect(report).toContain("grant <@u1> <#chan-1>");
  });
});
