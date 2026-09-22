import { describe, expect, it } from "vitest";

import type { FeatureFlagService } from "../../feature-flags/feature-flags.service";
import { createTestContext } from "../../../__test__/test-support";
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

function createFeatureFlagService(
  overrides: Partial<ReturnType<FeatureFlagService["getAll"]>> = {},
): FeatureFlagService {
  return {
    getAll: () => ({
      eligibleTeamsAnnouncement: true,
      finalRound: true,
      qualifyingResultsAnnouncement: true,
      qualifyingRound: true,
      qualifyingRoundIdentityConfirmation: true,
      registration: false,
      ...overrides,
    }),
  };
}

function createAuditContext() {
  const { context } = createTestContext();
  return { actorId: "api-key-1", log: context.log };
}

describe(createDiscordService, () => {
  it("shows the participant's Thai name on query", async () => {
    const service = createDiscordService(
      createFakeRepository({
        findByCode: async () =>
          await Promise.resolve({
            award: "REGISTRATION_COMPLETED",
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
            reviewStatus: "APPROVED",
            school: "KMUTT Demonstration School",
            teamId: "team-1",
            teamName: "Team Alpha",
          }),
      }),
      createFeatureFlagService(),
    );

    const result = await service.query("good-code", createAuditContext());

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

  it("formats the nickname as zero-padded index-team name-Thai first name", async () => {
    const service = createDiscordService(createFakeRepository(), createFeatureFlagService());

    const result = await service.verify("good-code", "discord-1", createAuditContext());

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
            wasAlt: false,
          }),
      }),
      createFeatureFlagService(),
    );

    const result = await service.verify("good-code", "discord-1", createAuditContext());

    expect(result.nickname).toBe("002-A Very Long Team -นรินทร์");
  });

  it("appends [A] for an alt-account redemption", async () => {
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
      createFeatureFlagService(),
    );

    const result = await service.verify("good-code", "discord-1", createAuditContext());

    expect(result.nickname).toBe("001-Team Alpha-นรินทร์ [A]");
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
            wasAlt: false,
          }),
      }),
      createFeatureFlagService(),
    );

    const result = await service.verify("good-code", "discord-1", createAuditContext());

    expect(result.nickname).toBe("007-aaaaaaaaaaaaaaaaa-สมชายนามยา");
  });

  it("keeps the [A] marker when an alt nickname is truncated", async () => {
    const service = createDiscordService(
      createFakeRepository({
        redeem: async () =>
          await Promise.resolve({
            channelId: null,
            firstNameTh: "สมชายนามยา",
            outcome: "redeemed",
            teamIndex: 7,
            teamName: "aaaaaaaaaaaaaaaaa",
            wasAlt: true,
          }),
      }),
      createFeatureFlagService(),
    );

    const result = await service.verify("good-code", "discord-1", createAuditContext());

    expect(result.nickname).toBe("007-aaaaaaaaaaaaaaaaa-สมชายน [A]");
  });

  it("reports an unknown code without a nickname", async () => {
    const service = createDiscordService(
      createFakeRepository({ redeem: async () => await Promise.resolve({ outcome: "not_found" }) }),
      createFeatureFlagService(),
    );

    const result = await service.verify("bad-code", "discord-1", createAuditContext());

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
      createFeatureFlagService(),
    );

    const result = await service.verify("used-code", "discord-1", createAuditContext());

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
      createFeatureFlagService(),
    );

    const result = await service.verify("fresh-code", "discord-1", createAuditContext());

    expect(result).toStrictEqual({
      channel_id: null,
      nickname: null,
      status: discordStatus.ALREADY_LINKED,
    });
  });

  it("does not query while the confirmation window is closed", async () => {
    const service = createDiscordService(
      createFakeRepository({
        findByCode: async () =>
          await Promise.resolve({
            award: "REGISTRATION_COMPLETED",
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
            reviewStatus: "APPROVED",
            school: "KMUTT Demonstration School",
            teamId: "team-1",
            teamName: "Team Alpha",
          }),
      }),
      createFeatureFlagService({ qualifyingRoundIdentityConfirmation: false }),
    );

    await expect(service.query("good-code", createAuditContext())).resolves.toStrictEqual({
      data: null,
      status: discordStatus.CLOSED,
    });
  });

  it("does not redeem while the confirmation window is closed", async () => {
    const service = createDiscordService(
      createFakeRepository({
        redeem: async () =>
          await Promise.resolve({
            channelId: "channel-1",
            firstNameTh: "นรินทร์",
            outcome: "redeemed" as const,
            teamIndex: 1,
            teamName: "Team Alpha",
            wasAlt: false,
          }),
      }),
      createFeatureFlagService({ qualifyingRoundIdentityConfirmation: false }),
    );

    await expect(
      service.verify("good-code", "discord-1", createAuditContext()),
    ).resolves.toStrictEqual({
      channel_id: null,
      nickname: null,
      status: discordStatus.CLOSED,
    });
  });

  it("hides a code after the team's award or review is revoked", async () => {
    const service = createDiscordService(
      createFakeRepository({
        findByCode: async () =>
          await Promise.resolve({
            award: "NOT_QUALIFIED",
            discord: {
              altAccUserId: null,
              altRedeemedAt: null,
              code: "revoked-code",
              id: "discord-row-1",
              mainAccUserId: null,
              redeemedAt: null,
            },
            firstNameEn: "Narin",
            firstNameTh: "นรินทร์",
            id: "participant-1",
            lastNameEn: "Somsak",
            lastNameTh: "สมศักดิ์",
            reviewStatus: "APPROVED",
            school: "KMUTT Demonstration School",
            teamId: "team-1",
            teamName: "Team Alpha",
          }),
      }),
      createFeatureFlagService(),
    );

    await expect(service.query("revoked-code", createAuditContext())).resolves.toStrictEqual({
      data: null,
      status: discordStatus.INELIGIBLE,
    });
  });

  it("does not redeem after the repository detects revoked eligibility", async () => {
    const service = createDiscordService(
      createFakeRepository({
        redeem: async () => await Promise.resolve({ outcome: "ineligible" }),
      }),
      createFeatureFlagService(),
    );

    await expect(
      service.verify("revoked-code", "discord-1", createAuditContext()),
    ).resolves.toStrictEqual({
      channel_id: null,
      nickname: null,
      status: discordStatus.INELIGIBLE,
    });
  });

  it("audits a successful redemption without recording the code", async () => {
    const { context, log } = createTestContext();
    const service = createDiscordService(createFakeRepository(), createFeatureFlagService());

    await service.verify("secret-code", "discord-1", { actorId: "api-key-1", log: context.log });

    expect(log.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "discord-verification.redeemed",
        actor: { id: "api-key-1", type: "api" },
        changes: { after: { status: "REDEEMED" } },
        outcome: "success",
        target: { id: "discord-1", type: "discord-verification" },
      }),
    );
    expect(log.audit.mock.calls[0]?.[0]).not.toHaveProperty("code");
  });

  it("audits a denied query with a stable reason", async () => {
    const { context, log } = createTestContext();
    const service = createDiscordService(createFakeRepository(), createFeatureFlagService());

    await service.query("secret-code", { actorId: "api-key-1", log: context.log });

    expect(log.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "discord-verification.queried",
        actor: { id: "api-key-1", type: "api" },
        outcome: "denied",
        reason: "CODE_NOT_FOUND",
        target: { id: "discord-verification", type: "discord-verification" },
      }),
    );
  });

  it("audits repository failures without exposing provider details", async () => {
    const { context, log } = createTestContext();
    const service = createDiscordService(
      createFakeRepository({
        redeem: async () => await Promise.reject(new Error("database password")),
      }),
      createFeatureFlagService(),
    );

    await expect(
      service.verify("secret-code", "discord-1", { actorId: "api-key-1", log: context.log }),
    ).rejects.toThrow("database password");

    expect(log.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "discord-verification.redeemed",
        actor: { id: "api-key-1", type: "api" },
        outcome: "failure",
        reason: "UNKNOWN_FAILURE",
        target: { id: "discord-1", type: "discord-verification" },
      }),
    );
    expect(JSON.stringify(log.audit.mock.calls[0]?.[0])).not.toContain("database password");
  });
});
