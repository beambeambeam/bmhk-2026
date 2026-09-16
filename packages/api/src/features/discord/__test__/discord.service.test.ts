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
        firstNameEn: "Narin",
        lastNameEn: "Somsak",
        outcome: "redeemed",
        teamIndex: 1,
        teamName: "Team Alpha",
        wasAlt: false,
      }),
    ...overrides,
  };
}

describe(createDiscordService, () => {
  it("formats the nickname as index - team name - first name", async () => {
    const service = createDiscordService(createFakeRepository());

    const result = await service.verify("good-code", "discord-1");

    expect(result).toStrictEqual({
      channel_id: "channel-1",
      nickname: "1 - Team Alpha - Narin",
      status: discordStatus.SUCCESS,
    });
  });

  it("caps the team name at 17 characters", async () => {
    const service = createDiscordService(
      createFakeRepository({
        redeem: async () =>
          await Promise.resolve({
            channelId: null,
            firstNameEn: "Narin",
            lastNameEn: "Somsak",
            outcome: "redeemed",
            teamIndex: 2,
            teamName: "A Very Long Team Name That Exceeds The Limit",
            wasAlt: false,
          }),
      }),
    );

    const result = await service.verify("good-code", "discord-1");

    expect(result.nickname).toBe("2 - A Very Long Team  - Narin");
  });

  it("appends [ALT] for an alt-account redemption", async () => {
    const service = createDiscordService(
      createFakeRepository({
        redeem: async () =>
          await Promise.resolve({
            channelId: null,
            firstNameEn: "Narin",
            lastNameEn: "Somsak",
            outcome: "redeemed",
            teamIndex: 1,
            teamName: "Team Alpha",
            wasAlt: true,
          }),
      }),
    );

    const result = await service.verify("good-code", "discord-1");

    expect(result.nickname).toBe("1 - Team Alpha - Narin [ALT]");
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
});
