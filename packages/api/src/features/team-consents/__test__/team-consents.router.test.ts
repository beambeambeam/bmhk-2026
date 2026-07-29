/* oxlint-disable require-await, typescript/no-unsafe-type-assertion */
import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type { AuthReader, TeamConsent, TeamConsentRepository } from "../../../index";
import { createAppRouter } from "../../../index";
import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
  createUnusedFileRepository,
  createUnusedTeamRepository,
} from "../../../__test__/test-support";
import {
  createTeamConsentAlreadyExistsError,
  createTeamConsentRepositoryError,
} from "../team-consents.service";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const CONSENT_ID = "22222222-2222-4222-8222-222222222222";
const createdAt = new Date("2026-01-01T00:00:00.000Z");

const consent = {
  codernTermsAccepted: false,
  competitionRulesAccepted: false,
  createdAt,
  guardianConsentObtained: false,
  healthDataConsent: false,
  id: CONSENT_ID,
  privacyPolicyAccepted: false,
  publicityMediaConsent: false,
  teamId: TEAM_ID,
  updatedAt: createdAt,
} satisfies TeamConsent;

function createRepository(overrides: Partial<TeamConsentRepository> = {}): TeamConsentRepository {
  return {
    create: overrides.create ?? (async (_userId, data) => ({ ...consent, ...data })),
    findByTeamId: overrides.findByTeamId ?? (async () => consent),
    update: overrides.update ?? (async (_userId, _teamId, data) => ({ ...consent, ...data })),
  };
}

function createRouter(
  repository: TeamConsentRepository,
  auth: AuthReader = createTestAuthReader(createTestSession()),
) {
  return createAppRouter({
    auth,
    files: createUnusedFileRepository(),
    teamConsents: repository,
    teams: createUnusedTeamRepository(),
  }).teamConsents;
}

describe("team consents router", () => {
  it("creates consent with false defaults and authenticated ownership", async () => {
    const create = vi.fn<TeamConsentRepository["create"]>(async (_userId, data) => ({
      ...consent,
      ...data,
    }));
    const router = createRouter(createRepository({ create }));
    const { context } = createTestContext();

    await expect(
      call(router.create, { teamId: TEAM_ID }, { context, path: ["teamConsents", "create"] }),
    ).resolves.toMatchObject({
      codernTermsAccepted: false,
      competitionRulesAccepted: false,
      guardianConsentObtained: false,
      healthDataConsent: false,
      privacyPolicyAccepted: false,
      publicityMediaConsent: false,
      teamId: TEAM_ID,
    });
    expect(create).toHaveBeenCalledWith(USER_ID, {
      codernTermsAccepted: false,
      competitionRulesAccepted: false,
      guardianConsentObtained: false,
      healthDataConsent: false,
      privacyPolicyAccepted: false,
      publicityMediaConsent: false,
      teamId: TEAM_ID,
    });
  });

  it("creates consent with explicit flag values and logs its identity", async () => {
    const create = vi.fn<TeamConsentRepository["create"]>(async (_userId, data) => ({
      ...consent,
      ...data,
    }));
    const router = createRouter(createRepository({ create }));
    const { context, log } = createTestContext();

    await expect(
      call(
        router.create,
        {
          codernTermsAccepted: true,
          competitionRulesAccepted: true,
          guardianConsentObtained: true,
          healthDataConsent: true,
          privacyPolicyAccepted: true,
          publicityMediaConsent: true,
          teamId: TEAM_ID,
        },
        { context, path: ["teamConsents", "create"] },
      ),
    ).resolves.toMatchObject({
      codernTermsAccepted: true,
      competitionRulesAccepted: true,
      guardianConsentObtained: true,
      healthDataConsent: true,
      privacyPolicyAccepted: true,
      publicityMediaConsent: true,
    });
    expect(log.set).toHaveBeenCalledWith({
      teamConsent: { id: CONSENT_ID, teamId: TEAM_ID },
    });
  });

  it("returns team not found when creating for an inaccessible team", async () => {
    const router = createRouter(createRepository({ create: async () => null }));
    const { context } = createTestContext();

    await expect(
      call(router.create, { teamId: TEAM_ID }, { context, path: ["teamConsents", "create"] }),
    ).rejects.toMatchObject({ code: "TEAM_NOT_FOUND", status: 404 });
  });

  it("returns conflict when team already has consent", async () => {
    const router = createRouter(
      createRepository({
        create: async () => {
          throw createTeamConsentAlreadyExistsError();
        },
      }),
    );
    const { context } = createTestContext();

    await expect(
      call(router.create, { teamId: TEAM_ID }, { context, path: ["teamConsents", "create"] }),
    ).rejects.toMatchObject({ code: "TEAM_CONSENT_ALREADY_EXISTS", status: 409 });
  });

  it("gets owned consent and forwards authenticated ownership", async () => {
    const findByTeamId = vi.fn<TeamConsentRepository["findByTeamId"]>(async () => consent);
    const router = createRouter(createRepository({ findByTeamId }));
    const { context, log } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamConsents", "get"] }),
    ).resolves.toStrictEqual(consent);
    expect(findByTeamId).toHaveBeenCalledWith(USER_ID, TEAM_ID);
    expect(log.set).toHaveBeenCalledWith({
      teamConsent: { id: CONSENT_ID, teamId: TEAM_ID },
    });
  });

  it("returns not found when consent does not exist", async () => {
    const router = createRouter(createRepository({ findByTeamId: async () => null }));
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamConsents", "get"] }),
    ).rejects.toMatchObject({ code: "TEAM_CONSENT_NOT_FOUND", status: 404 });
  });

  it("updates partial flags, including withdrawal, and logs its identity", async () => {
    const update = vi.fn<TeamConsentRepository["update"]>(async (_userId, _teamId, data) => ({
      ...consent,
      ...data,
    }));
    const router = createRouter(createRepository({ update }));
    const { context, log } = createTestContext();

    await expect(
      call(
        router.update,
        {
          data: { healthDataConsent: false, publicityMediaConsent: true },
          teamId: TEAM_ID,
        },
        { context, path: ["teamConsents", "update"] },
      ),
    ).resolves.toMatchObject({ healthDataConsent: false, publicityMediaConsent: true });
    expect(update).toHaveBeenCalledWith(USER_ID, TEAM_ID, {
      healthDataConsent: false,
      publicityMediaConsent: true,
    });
    expect(log.set).toHaveBeenCalledWith({
      teamConsent: { id: CONSENT_ID, teamId: TEAM_ID },
    });
  });

  it("rejects empty and unknown updates before repository invocation", async () => {
    const update = vi.fn<TeamConsentRepository["update"]>(async () => consent);
    const router = createRouter(createRepository({ update }));
    const { context } = createTestContext();

    await expect(
      call(
        router.update,
        { data: {}, teamId: TEAM_ID },
        { context, path: ["teamConsents", "update"] },
      ),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      call(router.update, { data: { acceptedAt: true }, teamId: TEAM_ID } as never, {
        context,
        path: ["teamConsents", "update"],
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects invalid team IDs and preserves sanitized repository failures", async () => {
    const update = vi.fn<TeamConsentRepository["update"]>(async () => {
      throw createTeamConsentRepositoryError();
    });
    const router = createRouter(createRepository({ update }));
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: "not-a-uuid" }, { context, path: ["teamConsents", "get"] }),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      call(
        router.update,
        { data: { healthDataConsent: true }, teamId: TEAM_ID },
        { context, path: ["teamConsents", "update"] },
      ),
    ).rejects.toMatchObject({
      code: "TEAM_CONSENT_REPOSITORY_ERROR",
      message: "Team consent operation failed",
      status: 500,
    });
  });

  it("requires authentication", async () => {
    const router = createRouter(createRepository(), createTestAuthReader(null));
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamConsents", "get"] }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
  });
});
