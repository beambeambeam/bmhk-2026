import { describe, expect, it } from "vitest";

import { createDiscordService } from "../discord.service";
import { discordStatus } from "../discord.schema";
import type { DiscordRepository } from "../discord.repository";

function createFakeRepository(overrides: Partial<DiscordRepository> = {}): DiscordRepository {
  return {
    findByCode: async () => await Promise.resolve(null),
    redeem: async () =>
      await Promise.resolve({
        channelId: "channel-1",
        firstNameTh: "นรินทร์",
        outcome: "redeemed",
        teamIndex: 1,
        teamName: "Team Alpha",
      }),
    ...overrides,
  };
}

describe(createDiscordService, () => {
  it("shows the participant's Thai name on query", async () => {
    const service = createDiscordService(
      createFakeRepository({
        findByCode: async () =>
          await Promise.resolve({
            discord: {
              code: "good-code",
              id: "discord-row-1",
              mainAccUserId: null,
              redeemedAt: null,
            },
            firstNameEn: "Narin",
            firstNameTh: "นรินทร์",
            id: "participant-1",
            lastNameEn: "Somsak",
            lastNameTh: "สมศักดิ์",
            school: "KMUTT Demonstration School",
            teamId: "team-1",
            teamName: "Team Alpha",
          }),
      }),
    );

    const result = await service.query("good-code");

    expect(result).toStrictEqual({
      data: {
        name: "นรินทร์ สมศักดิ์",
        school: "KMUTT Demonstration School",
        team: "Team Alpha",
      },
      status: discordStatus.SUCCESS,
    });
  });

  it("reports a code whose Discord slot is taken as already redeemed on query", async () => {
    const service = createDiscordService(
      createFakeRepository({
        findByCode: async () =>
          await Promise.resolve({
            discord: {
              code: "used-code",
              id: "discord-row-1",
              mainAccUserId: "discord-1",
              redeemedAt: new Date("2026-09-01T00:00:00.000Z"),
            },
            firstNameEn: "Narin",
            firstNameTh: "นรินทร์",
            id: "participant-1",
            lastNameEn: "Somsak",
            lastNameTh: "สมศักดิ์",
            school: "KMUTT Demonstration School",
            teamId: "team-1",
            teamName: "Team Alpha",
          }),
      }),
    );

    const result = await service.query("used-code");

    expect(result).toStrictEqual({ data: null, status: discordStatus.ALREADY_REDEEMED });
  });

  it("formats the nickname as zero-padded index-team name-Thai first name", async () => {
    const service = createDiscordService(createFakeRepository());

    const result = await service.verify("good-code", "discord-1");

    expect(result).toStrictEqual({
      channel_id: "channel-1",
      nickname: "001-Team Alpha-นรินทร์",
      status: discordStatus.SUCCESS,
    });
  });

  it("caps the team name at 17 characters", async () => {
    const service = createDiscordService(
      createFakeRepository({
        redeem: async () =>
          await Promise.resolve({
            channelId: null,
            firstNameTh: "นรินทร์",
            outcome: "redeemed",
            teamIndex: 2,
            teamName: "A Very Long Team Name That Exceeds The Limit",
          }),
      }),
    );

    const result = await service.verify("good-code", "discord-1");

    expect(result.nickname).toBe("002-A Very Long Team -นรินทร์");
  });

  it("truncates the first name so the nickname fits 32 characters", async () => {
    const service = createDiscordService(
      createFakeRepository({
        redeem: async () =>
          await Promise.resolve({
            channelId: null,
            firstNameTh: "สมชายนามยาวมาก",
            outcome: "redeemed",
            teamIndex: 7,
            teamName: "aaaaaaaaaaaaaaaaa",
          }),
      }),
    );

    const result = await service.verify("good-code", "discord-1");

    expect(result.nickname).toBe("007-aaaaaaaaaaaaaaaaa-สมชายนามยา");
  });

  it("reports an unknown code without a nickname", async () => {
    const service = createDiscordService(
      createFakeRepository({ redeem: async () => await Promise.resolve({ outcome: "not_found" }) }),
    );

    const result = await service.verify("bad-code", "discord-1");

    expect(result).toStrictEqual({
      channel_id: null,
      nickname: null,
      status: discordStatus.NOT_FOUND,
    });
  });

  it("reports a code that has already been redeemed", async () => {
    const service = createDiscordService(
      createFakeRepository({
        redeem: async () => await Promise.resolve({ outcome: "already_redeemed" }),
      }),
    );

    const result = await service.verify("used-code", "discord-1");

    expect(result).toStrictEqual({
      channel_id: null,
      nickname: null,
      status: discordStatus.ALREADY_REDEEMED,
    });
  });

  it("reports a Discord user who is already linked to a participant", async () => {
    const service = createDiscordService(
      createFakeRepository({
        redeem: async () => await Promise.resolve({ outcome: "already_linked" }),
      }),
    );

    const result = await service.verify("fresh-code", "discord-1");

    expect(result).toStrictEqual({
      channel_id: null,
      nickname: null,
      status: discordStatus.ALREADY_LINKED,
    });
  });
});
