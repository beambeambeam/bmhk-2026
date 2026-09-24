import { describe, expect, it } from "vitest";

import { createDiscordAdminService } from "../discord-admin.service";
import type {
  AdminParticipantFacts,
  AdminTeamFacts,
  DiscordAdminRepository,
} from "../discord-admin.repository";

const REDEEMED_AT = new Date("2026-09-01T03:00:00.000Z");
const ALT_REDEEMED_AT = new Date("2026-09-02T04:30:00.000Z");

function participant(
  index: number,
  overrides: Partial<AdminParticipantFacts> = {},
): AdminParticipantFacts {
  return {
    altAccUserId: null,
    altRedeemedAt: null,
    code: `CODE000${index}`,
    firstNameTh: `ชื่อ${index}`,
    index,
    lastNameTh: `สกุล${index}`,
    mainAccUserId: null,
    middleNameTh: null,
    redeemedAt: null,
    titleTh: "นาย",
    ...overrides,
  };
}

function team(index: number, overrides: Partial<AdminTeamFacts> = {}): AdminTeamFacts {
  return {
    award: "REGISTRATION_COMPLETE",
    id: `${String(index).padStart(8, "0")}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
    index,
    name: `Team ${index}`,
    participants: [participant(1), participant(2)],
    reviewStatus: "APPROVED",
    school: `School ${index}`,
    ...overrides,
  };
}

function createService(teams: AdminTeamFacts[], overrides: Partial<DiscordAdminRepository> = {}) {
  return createDiscordAdminService({
    findParticipantByDiscordUserId: async () => await Promise.resolve(null),
    listParticipantNicknameFacts: async () => await Promise.resolve([]),
    listStaffNicknameFacts: async () => await Promise.resolve([]),
    listTeams: async () => await Promise.resolve(teams),
    repairFacts: async () => await Promise.resolve({ participants: [], staff: [] }),
    unlinkParticipant: async () => await Promise.resolve(null),
    unlinkStaff: async () => await Promise.resolve(null),
    ...overrides,
  });
}

describe(createDiscordAdminService, () => {
  describe("codeInfo", () => {
    it("reports an unknown code", async () => {
      const service = createService([team(1)]);

      await expect(service.codeInfo("NOPE0000")).resolves.toStrictEqual({ status: "NOT_FOUND" });
    });

    it("reports an unredeemed code with its team and participant", async () => {
      const service = createService([team(7)]);

      await expect(service.codeInfo("CODE0002")).resolves.toStrictEqual({
        alt: null,
        main: null,
        participant: { index: 2, name: "นาย ชื่อ2 สกุล2" },
        status: "NOT_REDEEMED",
        team: { index: 7, name: "Team 7", school: "School 7" },
      });
    });

    it("reports who redeemed a code once", async () => {
      const service = createService([
        team(7, {
          participants: [participant(1, { mainAccUserId: "111", redeemedAt: REDEEMED_AT })],
        }),
      ]);

      const result = await service.codeInfo("CODE0001");

      expect(result).toMatchObject({
        alt: null,
        main: { id: "111", redeemed_at: "2026-09-01T03:00:00.000Z" },
        status: "REDEEMED_ONCE",
      });
    });

    it("reports both accounts of a fully redeemed code", async () => {
      const service = createService([
        team(7, {
          participants: [
            participant(1, {
              altAccUserId: "222",
              altRedeemedAt: ALT_REDEEMED_AT,
              mainAccUserId: "111",
              redeemedAt: REDEEMED_AT,
            }),
          ],
        }),
      ]);

      const result = await service.codeInfo("CODE0001");

      expect(result).toMatchObject({
        alt: { id: "222", redeemed_at: "2026-09-02T04:30:00.000Z" },
        main: { id: "111", redeemed_at: "2026-09-01T03:00:00.000Z" },
        status: "REDEEMED_TWICE",
      });
    });
  });

  describe("teamInfo", () => {
    const teams = [
      team(1, { name: "Alpha Wolves" }),
      team(2, { name: "alpha cats" }),
      team(3, { name: "Beta" }),
      team(4, { award: "NO_ACHIEVEMENT", name: "Alpha Ghosts" }),
      team(5, { name: "Alpha Pending", reviewStatus: "PENDING" }),
      team(6, { award: "REGISTRATION_FAILED", name: "Alpha Out" }),
    ];

    it("finds a team by index", async () => {
      const result = await createService(teams).teamInfo({ index: 3 });

      expect(result.map((found) => found.name)).toStrictEqual(["Beta"]);
    });

    it("finds a team by the first 8 characters of its id", async () => {
      const result = await createService(teams).teamInfo({ id: "00000002" });

      expect(result.map((found) => found.index)).toStrictEqual([2]);
    });

    it("returns every team whose name contains the text, ignoring case, by index", async () => {
      const result = await createService(teams).teamInfo({ name: "ALPHA" });

      expect(result.map((found) => found.index)).toStrictEqual([1, 2]);
    });

    it("skips teams that are not eligible for round 1", async () => {
      await expect(createService(teams).teamInfo({ index: 4 })).resolves.toStrictEqual([]);
      await expect(createService(teams).teamInfo({ index: 5 })).resolves.toStrictEqual([]);
      await expect(createService(teams).teamInfo({ index: 6 })).resolves.toStrictEqual([]);
    });

    it("lists participants with their verify code and linked accounts", async () => {
      const service = createService([
        team(1, {
          participants: [
            participant(1, {
              altAccUserId: "222",
              altRedeemedAt: ALT_REDEEMED_AT,
              mainAccUserId: "111",
              redeemedAt: REDEEMED_AT,
            }),
            participant(2, { code: null }),
          ],
        }),
      ]);

      const [found] = await service.teamInfo({ index: 1 });

      expect(found).toStrictEqual({
        id: "00000001-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        index: 1,
        name: "Team 1",
        participants: [
          {
            accounts: ["111", "222"],
            code: "CODE0001",
            index: 1,
            name: "นาย ชื่อ1 สกุล1",
          },
          { accounts: [], code: null, index: 2, name: "นาย ชื่อ2 สกุล2" },
        ],
        school: "School 1",
      });
    });
  });

  describe("absentTeams", () => {
    it("lists eligible teams where nobody has verified, by index", async () => {
      const verified = participant(1, { mainAccUserId: "111", redeemedAt: REDEEMED_AT });
      const service = createService([
        team(3, { participants: [participant(1, { code: null })] }),
        team(1, { participants: [verified, participant(2)] }),
        team(2),
        team(4, { award: "NO_ACHIEVEMENT" }),
      ]);

      const result = await service.absentTeams();

      expect(result).toStrictEqual([
        { index: 2, name: "Team 2", school: "School 2" },
        { index: 3, name: "Team 3", school: "School 3" },
      ]);
    });
  });

  describe("unlink", () => {
    it("reports a Discord user with no participant link", async () => {
      await expect(createService([]).unlinkParticipant("111")).resolves.toStrictEqual({
        status: "NOT_LINKED",
      });
    });

    it("returns the team channel to clean up after freeing the slot", async () => {
      const service = createService([], {
        unlinkParticipant: async () => await Promise.resolve({ channelId: "chan-1" }),
      });

      await expect(service.unlinkParticipant("111")).resolves.toStrictEqual({
        channel_id: "chan-1",
        status: "UNLINKED",
      });
    });

    it("reports a Discord user with no staff link", async () => {
      await expect(createService([]).unlinkStaff("111")).resolves.toStrictEqual({
        status: "NOT_LINKED",
      });
    });

    it("returns the overseer category to clean up after removing the staff link", async () => {
      const service = createService([], {
        unlinkStaff: async () => await Promise.resolve({ categoryId: "cat-1" }),
      });

      await expect(service.unlinkStaff("111")).resolves.toStrictEqual({
        category_id: "cat-1",
        status: "UNLINKED",
      });
    });
  });

  describe("repairFacts", () => {
    it("passes link facts through with wire keys", async () => {
      const service = createService([], {
        repairFacts: async () =>
          await Promise.resolve({
            participants: [{ channelId: "chan-1", discordUserId: "111" }],
            staff: [{ categoryId: null, discordUserId: "222", role: "admin" }],
          }),
      });

      await expect(service.repairFacts()).resolves.toStrictEqual({
        participants: [{ channel_id: "chan-1", discord_user_id: "111" }],
        staff: [{ category_id: null, discord_user_id: "222", role: "admin" }],
      });
    });
  });

  describe("staffNicknames", () => {
    it("computes each staff member's nickname from the shared formula", async () => {
      const service = createService([], {
        listStaffNicknameFacts: async () =>
          await Promise.resolve([
            { discordUserId: "111", overseerGroup: null, role: "admin", userName: "Somchai Test" },
            { discordUserId: "222", overseerGroup: null, role: "staff", userName: "Suda Test" },
            {
              discordUserId: "333",
              overseerGroup: { categoryId: "cat-1", index: 4 },
              role: "staff",
              userName: "Anan Test",
            },
          ]),
      });

      await expect(service.staffNicknames()).resolves.toStrictEqual([
        { discord_user_id: "111", nickname: "[Admin] Somchai", status: "OK" },
        { discord_user_id: "222", nickname: "[Staff] Suda", status: "OK" },
        { discord_user_id: "333", nickname: "[4] Anan", status: "OK" },
      ]);
    });

    it("reports a staff overseer whose group has no category set up yet", async () => {
      const service = createService([], {
        listStaffNicknameFacts: async () =>
          await Promise.resolve([
            {
              discordUserId: "333",
              overseerGroup: { categoryId: null, index: 4 },
              role: "staff",
              userName: "Anan Test",
            },
          ]),
      });

      await expect(service.staffNicknames()).resolves.toStrictEqual([
        { discord_user_id: "333", status: "GROUP_NOT_SET_UP" },
      ]);
    });
  });

  describe("participantNicknames", () => {
    it("computes each linked account's nickname from the shared formula", async () => {
      const service = createService([], {
        listParticipantNicknameFacts: async () =>
          await Promise.resolve([
            {
              discordUserId: "111",
              firstNameTh: "นรินทร์",
              teamIndex: 1,
              teamName: "Team Alpha",
              wasAlt: false,
            },
            {
              discordUserId: "222",
              firstNameTh: "สุดา",
              teamIndex: 1,
              teamName: "Team Alpha",
              wasAlt: true,
            },
          ]),
      });

      await expect(service.participantNicknames()).resolves.toStrictEqual([
        { discord_user_id: "111", nickname: "001-Team Alpha-นรินทร์" },
        { discord_user_id: "222", nickname: "001-Team Alpha-สุดา [A]" },
      ]);
    });
  });

  describe("lookupParticipant", () => {
    const facts = {
      altAccUserId: "222",
      code: "CODE0001",
      email: "somchai@example.com",
      firstNameTh: "สมชาย",
      lastNameTh: "ใจดี",
      lineId: "somchai.line",
      mainAccUserId: "111",
      middleNameTh: null,
      phone: "0800000000",
      school: "โรงเรียนบางมด",
      teamName: "Team 7",
      titleTh: "นาย",
    };

    it("reports no record for a Discord user with no verified link", async () => {
      const service = createService([], {
        findParticipantByDiscordUserId: async () => await Promise.resolve(null),
      });

      await expect(service.lookupParticipant("999")).resolves.toStrictEqual({
        status: "NOT_FOUND",
      });
    });

    it("looks up a participant by their main account and points at their alt", async () => {
      const service = createService([], {
        findParticipantByDiscordUserId: async () => await Promise.resolve(facts),
      });

      await expect(service.lookupParticipant("111")).resolves.toStrictEqual({
        code: "CODE0001",
        contact: { email: "somchai@example.com", line_id: "somchai.line", phone: "0800000000" },
        matched_account: "main",
        name_th: "นาย สมชาย ใจดี",
        other_discord_user_id: "222",
        school: "โรงเรียนบางมด",
        status: "FOUND",
        team_name: "Team 7",
      });
    });

    it("looks up a participant by their alt account and points at their main", async () => {
      const service = createService([], {
        findParticipantByDiscordUserId: async () => await Promise.resolve(facts),
      });

      const result = await service.lookupParticipant("222");

      expect(result).toMatchObject({ matched_account: "alt", other_discord_user_id: "111" });
    });
  });
});
