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
        wasAlt: false,
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
              altAccUserId: null,
              altRedeemedAt: null,
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
        main_acc_id: null,
        name: "นรินทร์ สมศักดิ์",
        school: "KMUTT Demonstration School",
        team: "Team Alpha",
      },
      status: discordStatus.SUCCESS,
    });
  });

  it("formats the nickname as index - team name - Thai first name", async () => {
    const service = createDiscordService(createFakeRepository());

    const result = await service.verify("good-code", "discord-1");

    expect(result).toStrictEqual({
      channel_id: "channel-1",
      nickname: "1 - Team Alpha - นรินทร์",
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
            wasAlt: false,
          }),
      }),
    );

    const result = await service.verify("good-code", "discord-1");

    expect(result.nickname).toBe("2 - A Very Long Team  - นรินทร์");
  });

  it("appends [ALT] for an alt-account redemption", async () => {
    const service = createDiscordService(
      createFakeRepository({
        redeem: async () =>
          await Promise.resolve({
            channelId: null,
            firstNameTh: "นรินทร์",
            outcome: "redeemed",
            teamIndex: 1,
            teamName: "Team Alpha",
            wasAlt: true,
          }),
      }),
    );

    const result = await service.verify("good-code", "discord-1");

    expect(result.nickname).toBe("1 - Team Alpha - นรินทร์ [ALT]");
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
