import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type { AuthReader, TeamRegistrationStatusRepository } from "../../../index";
import { createAppRouter } from "../../../index";
import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
  createUnusedFileRepository,
  createUnusedTeamRepository,
} from "../../../__test__/test-support";
import { createTeamRegistrationStatusRepositoryError } from "../team-registration-status.service";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";

type StatusFacts = NonNullable<
  Awaited<ReturnType<TeamRegistrationStatusRepository["findByTeamId"]>>
>;

const consent = {
  codernTermsAccepted: true,
  competitionRulesAccepted: true,
  guardianConsentObtained: true,
  healthDataConsent: true,
  privacyPolicyAccepted: true,
  publicityMediaConsent: true,
};

function participant(index: 1 | 2 | 3) {
  return {
    academicRecordDocumentFileId: `academic-${index}`,
    identityDocumentFileId: `identity-${index}`,
    index,
    portraitPhotoFileId: `portrait-${index}`,
  };
}

const completeTwoPersonFacts = {
  consent,
  participants: [participant(1), participant(2)],
  team: {
    id: TEAM_ID,
    memberCount: 2,
    name: "Team One",
    school: "School One",
  },
} satisfies StatusFacts;

const completeThreePersonFacts = {
  consent,
  participants: [participant(1), participant(2), participant(3)],
  team: {
    id: TEAM_ID,
    memberCount: 3,
    name: "Team One",
    school: "School One",
  },
} satisfies StatusFacts;

const incompleteThreePersonFacts = {
  ...completeThreePersonFacts,
  participants: [
    participant(1),
    participant(2),
    { ...participant(3), identityDocumentFileId: null },
  ],
} satisfies StatusFacts;

function createRepository(
  overrides: Partial<TeamRegistrationStatusRepository> = {},
): TeamRegistrationStatusRepository {
  return {
    findByTeamId:
      overrides.findByTeamId ?? (async () => await Promise.resolve(completeTwoPersonFacts)),
  };
}

function createRouter(
  repository: TeamRegistrationStatusRepository,
  auth: AuthReader = createTestAuthReader(createTestSession()),
) {
  return createAppRouter({
    auth,
    files: createUnusedFileRepository(),
    teamRegistrationStatus: repository,
    teams: createUnusedTeamRepository(),
  }).teamRegistrationStatus;
}

describe("team registration status router", () => {
  it("returns complete status for a two-person team without participant 3", async () => {
    const findByTeamId = vi.fn<TeamRegistrationStatusRepository["findByTeamId"]>(
      async () => await Promise.resolve(completeTwoPersonFacts),
    );
    const router = createRouter(createRepository({ findByTeamId }));
    const { context, log } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toStrictEqual({
      isComplete: true,
      memberCount: 2,
      participant1: true,
      participant2: true,
      participant3: null,
      team: true,
      teamId: TEAM_ID,
      termsAndConditions: true,
    });
    expect(findByTeamId).toHaveBeenCalledWith(USER_ID, TEAM_ID);
    expect(log.set).toHaveBeenCalledWith({
      teamRegistrationStatus: { teamId: TEAM_ID },
    });
  });

  it("requires and reports participant 3 for a three-person team", async () => {
    const router = createRouter(
      createRepository({
        findByTeamId: async () => await Promise.resolve(completeThreePersonFacts),
      }),
    );
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toStrictEqual({
      isComplete: true,
      memberCount: 3,
      participant1: true,
      participant2: true,
      participant3: true,
      team: true,
      teamId: TEAM_ID,
      termsAndConditions: true,
    });
  });

  it("blocks three-person completion when participant 3 lacks a document", async () => {
    const router = createRouter({
      findByTeamId: async () => await Promise.resolve(incompleteThreePersonFacts),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toStrictEqual({
      isComplete: false,
      memberCount: 3,
      participant1: true,
      participant2: true,
      participant3: false,
      team: true,
      teamId: TEAM_ID,
      termsAndConditions: true,
    });
  });

  it("reports missing consent as incomplete", async () => {
    const router = createRouter({
      findByTeamId: async () => await Promise.resolve({ ...completeTwoPersonFacts, consent: null }),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toStrictEqual({
      isComplete: false,
      memberCount: 2,
      participant1: true,
      participant2: true,
      participant3: null,
      team: true,
      teamId: TEAM_ID,
      termsAndConditions: false,
    });
  });

  it("reports missing required participant rows as incomplete", async () => {
    const router = createRouter({
      findByTeamId: async () =>
        await Promise.resolve({ ...completeTwoPersonFacts, participants: [] }),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toStrictEqual({
      isComplete: false,
      memberCount: 2,
      participant1: false,
      participant2: false,
      participant3: null,
      team: true,
      teamId: TEAM_ID,
      termsAndConditions: true,
    });
  });

  it("requires every consent flag for terms and conditions", async () => {
    const router = createRouter({
      findByTeamId: async () =>
        await Promise.resolve({
          ...completeTwoPersonFacts,
          consent: { ...consent, healthDataConsent: false },
        }),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toStrictEqual({
      isComplete: false,
      memberCount: 2,
      participant1: true,
      participant2: true,
      participant3: null,
      team: true,
      teamId: TEAM_ID,
      termsAndConditions: false,
    });
  });

  it("returns team not found for an inaccessible team", async () => {
    const router = createRouter({ findByTeamId: async () => await Promise.resolve(null) });
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamRegistrationStatus", "get"] }),
    ).rejects.toMatchObject({ code: "TEAM_NOT_FOUND", status: 404 });
  });

  it("preserves structured repository failures", async () => {
    const router = createRouter({
      findByTeamId: async () => await Promise.reject(createTeamRegistrationStatusRepositoryError()),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamRegistrationStatus", "get"] }),
    ).rejects.toMatchObject({
      code: "TEAM_REGISTRATION_STATUS_REPOSITORY_ERROR",
      status: 500,
    });
  });

  it("rejects invalid IDs before repository access and requires authentication", async () => {
    const findByTeamId = vi.fn<TeamRegistrationStatusRepository["findByTeamId"]>(
      async () => await Promise.resolve(completeTwoPersonFacts),
    );
    const router = createRouter(createRepository({ findByTeamId }));
    const { context } = createTestContext();

    await expect(
      call(
        router.get,
        { teamId: "not-a-uuid" },
        { context, path: ["teamRegistrationStatus", "get"] },
      ),
    ).rejects.toBeInstanceOf(Error);
    expect(findByTeamId).not.toHaveBeenCalled();

    const anonymousRouter = createRouter(createRepository(), createTestAuthReader(null));
    await expect(
      call(
        anonymousRouter.get,
        { teamId: TEAM_ID },
        { context, path: ["teamRegistrationStatus", "get"] },
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
  });

  it("ignores slot 3 for a two-person team", async () => {
    const router = createRouter({
      findByTeamId: async () =>
        await Promise.resolve({
          ...completeTwoPersonFacts,
          participants: [
            ...completeTwoPersonFacts.participants,
            { ...participant(3), identityDocumentFileId: null },
          ],
        }),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toMatchObject({
      isComplete: true,
      participant3: null,
    });
  });
});
