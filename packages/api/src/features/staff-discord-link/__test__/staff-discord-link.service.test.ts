import { describe, expect, it } from "vitest";

import type { DiscordBotGateway } from "../discord-bot-gateway";
import { createStaffDiscordLinkService } from "../staff-discord-link.service";
import type {
  StaffDiscordLinkRepository,
  StaffOverseerGroup,
} from "../staff-discord-link.repository";

function createFakeRepository(overrides: Partial<StaffDiscordLinkRepository> = {}): {
  links: { discordUserId: string; userId: string }[];
  repository: StaffDiscordLinkRepository;
} {
  const links: { discordUserId: string; userId: string }[] = [];
  const validTokens = new Map<string, string>([["good-token", "discord-1"]]);
  const overseerGroups = new Map<string, StaffOverseerGroup>();

  const repository: StaffDiscordLinkRepository = {
    consumeToken: async (token) => {
      const discordUserId = validTokens.get(token);
      if (discordUserId === undefined) {
        return await Promise.resolve(null);
      }
      validTokens.delete(token);
      return await Promise.resolve({ discordUserId });
    },
    createToken: async (discordUserId) =>
      await Promise.resolve({
        expiresAt: new Date(Date.now() + 600_000),
        token: `token-for-${discordUserId}`,
      }),
    findLinkByDiscordUserId: async (discordUserId) =>
      await Promise.resolve(links.find((link) => link.discordUserId === discordUserId) ?? null),
    findLinkByUserId: async (userId) =>
      await Promise.resolve(links.find((link) => link.userId === userId) ?? null),
    findOverseerGroup: async (userId) => await Promise.resolve(overseerGroups.get(userId) ?? null),
    upsertLink: async (userId, discordUserId) => {
      const existingIndex = links.findIndex((link) => link.userId === userId);
      if (existingIndex === -1) {
        links.push({ discordUserId, userId });
      } else {
        links[existingIndex] = { discordUserId, userId };
      }
      await Promise.resolve();
    },
    ...overrides,
  };

  return { links, repository };
}

function createFakeGateway(): { applied: unknown[]; gateway: DiscordBotGateway } {
  const applied: unknown[] = [];
  return {
    applied,
    gateway: {
      applyStaffVerification: async (params) => {
        applied.push(params);
        return await Promise.resolve({ ok: true });
      },
    },
  };
}

describe(createStaffDiscordLinkService, () => {
  it("rejects a participant (role user) before touching the token", async () => {
    const { repository } = createFakeRepository();
    const { gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    const result = await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "user",
    });

    expect(result).toStrictEqual({ status: "INELIGIBLE_ROLE" });
  });

  it("rejects an unknown or expired token", async () => {
    const { repository } = createFakeRepository();
    const { gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    const result = await service.link({
      token: "bad-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "staff",
    });

    expect(result).toStrictEqual({ status: "INVALID_TOKEN" });
  });

  it("links a plain staff account and applies the [Staff] nickname with the main role", async () => {
    const { repository } = createFakeRepository();
    const { applied, gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    const result = await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "staff",
    });

    expect(result).toStrictEqual({ status: "SUCCESS" });
    expect(applied).toStrictEqual([
      { categoryId: null, discordUserId: "discord-1", isAdmin: false, nickname: "[Staff] Somchai" },
    ]);
  });

  it("treats registrationStaff the same as staff", async () => {
    const { repository } = createFakeRepository();
    const { applied, gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "registrationStaff",
    });

    expect(applied[0]).toMatchObject({ isAdmin: false, nickname: "[Staff] Somchai" });
  });

  it("links an admin with the [Admin] nickname and no category grant", async () => {
    const { repository } = createFakeRepository();
    const { applied, gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "admin",
    });

    expect(applied).toStrictEqual([
      { categoryId: null, discordUserId: "discord-1", isAdmin: true, nickname: "[Admin] Somchai" },
    ]);
  });

  it("links an overseer with the [groupIndex] nickname and grants the category", async () => {
    const { repository } = createFakeRepository({
      findOverseerGroup: async (userId) =>
        await Promise.resolve(userId === "user-1" ? { categoryId: "category-9", index: 3 } : null),
    });
    const { applied, gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    const result = await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "staff",
    });

    expect(result).toStrictEqual({ status: "SUCCESS" });
    expect(applied).toStrictEqual([
      {
        categoryId: "category-9",
        discordUserId: "discord-1",
        isAdmin: false,
        nickname: "[3] Somchai",
      },
    ]);
  });

  it("fails closed when the overseer's group has no category set up yet", async () => {
    const { repository } = createFakeRepository({
      findOverseerGroup: async () => await Promise.resolve({ categoryId: null, index: 3 }),
    });
    const { applied, gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    const result = await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "staff",
    });

    expect(result).toStrictEqual({ status: "GROUP_NOT_SET_UP" });
    expect(applied).toStrictEqual([]);
  });

  it("rejects when the Discord account is already linked to a different staff account", async () => {
    const { links, repository } = createFakeRepository();
    links.push({ discordUserId: "discord-1", userId: "someone-else" });
    const { applied, gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    const result = await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "staff",
    });

    expect(result).toStrictEqual({ status: "ALREADY_LINKED_TO_ANOTHER_ACCOUNT" });
    expect(applied).toStrictEqual([]);
  });

  it("is idempotent when re-linking the exact same pairing", async () => {
    const { links, repository } = createFakeRepository();
    links.push({ discordUserId: "discord-1", userId: "user-1" });
    const { applied, gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    const result = await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "staff",
    });

    expect(result).toStrictEqual({ status: "SUCCESS" });
    expect(applied).toHaveLength(1);
  });

  it("reports a bot-apply failure without a false success", async () => {
    const { repository } = createFakeRepository();
    const gateway: DiscordBotGateway = {
      applyStaffVerification: async () => await Promise.resolve({ ok: false }),
    };
    const service = createStaffDiscordLinkService(repository, gateway);

    const result = await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "staff",
    });

    expect(result).toStrictEqual({ status: "BOT_APPLY_FAILED" });
  });
});
