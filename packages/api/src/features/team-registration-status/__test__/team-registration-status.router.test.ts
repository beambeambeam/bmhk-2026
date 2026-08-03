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

type StatusFacts = NonNullable<Awaited<ReturnType<TeamRegistrationStatusRepository["find"]>>>;

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
    image: "team-image",
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
    image: "team-image",
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
    find: overrides.find ?? (async () => await Promise.resolve(completeTwoPersonFacts)),
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
  it("returns team not found when the current user has no team", async () => {
    const find = vi.fn<TeamRegistrationStatusRepository["find"]>(
      async () => await Promise.resolve(null),
    );
    const router = createRouter({ find });
    const { context } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).rejects.toMatchObject({ code: "TEAM_NOT_FOUND", status: 404 });
    expect(find).toHaveBeenCalledWith(USER_ID);
  });

  it("returns complete status for a two-person team without participant 3", async () => {
    const find = vi.fn<TeamRegistrationStatusRepository["find"]>(
      async () => await Promise.resolve(completeTwoPersonFacts),
    );
    const router = createRouter(createRepository({ find }));
    const { context, log } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toStrictEqual({
      isComplete: true,
      memberCount: 2,
      participant1: "COMPLETED",
      participant2: "COMPLETED",
      participant3: "NOT_APPLICABLE",
      team: "COMPLETED",
      teamId: TEAM_ID,
      termsAndConditions: "COMPLETED",
    });
    expect(find).toHaveBeenCalledWith(USER_ID);
    expect(log.set).toHaveBeenCalledWith({
      teamRegistrationStatus: { teamId: TEAM_ID },
    });
  });

  it("returns complete status for a three-person team", async () => {
    const router = createRouter({
      find: async () => await Promise.resolve(completeThreePersonFacts),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toStrictEqual({
      isComplete: true,
      memberCount: 3,
      participant1: "COMPLETED",
      participant2: "COMPLETED",
      participant3: "COMPLETED",
      team: "COMPLETED",
      teamId: TEAM_ID,
      termsAndConditions: "COMPLETED",
    });
  });

  it("blocks three-person completion when participant 3 is missing", async () => {
    const router = createRouter({
      find: async () =>
        await Promise.resolve({
          ...completeThreePersonFacts,
          participants: completeThreePersonFacts.participants.slice(0, 2),
        }),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toMatchObject({
      isComplete: false,
      participant3: "NOT_STARTED",
    });
  });

  it("reports participant in progress when required documents are missing", async () => {
    const router = createRouter({
      find: async () => await Promise.resolve(incompleteThreePersonFacts),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toStrictEqual({
      isComplete: false,
      memberCount: 3,
      participant1: "COMPLETED",
      participant2: "COMPLETED",
      participant3: "IN_PROGRESS",
      team: "COMPLETED",
      teamId: TEAM_ID,
      termsAndConditions: "COMPLETED",
    });
  });

  it("reports missing participant rows as not started", async () => {
    const router = createRouter({
      find: async () => await Promise.resolve({ ...completeTwoPersonFacts, participants: [] }),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toStrictEqual({
      isComplete: false,
      memberCount: 2,
      participant1: "NOT_STARTED",
      participant2: "NOT_STARTED",
      participant3: "NOT_APPLICABLE",
      team: "COMPLETED",
      teamId: TEAM_ID,
      termsAndConditions: "COMPLETED",
    });
  });

  it("distinguishes missing and incomplete participant rows", async () => {
    const router = createRouter({
      find: async () =>
        await Promise.resolve({
          ...completeTwoPersonFacts,
          participants: [{ ...participant(2), portraitPhotoFileId: null }],
        }),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toMatchObject({
      isComplete: false,
      participant1: "NOT_STARTED",
      participant2: "IN_PROGRESS",
    });
  });

  it("reports a draft team as in progress", async () => {
    const router = createRouter({
      find: async () =>
        await Promise.resolve({
          ...completeTwoPersonFacts,
          team: { ...completeTwoPersonFacts.team, memberCount: 0 },
        }),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toMatchObject({
      isComplete: false,
      memberCount: 0,
      participant3: "NOT_STARTED",
      team: "IN_PROGRESS",
    });
  });

  it("requires a team image for completion", async () => {
    const router = createRouter({
      find: async () =>
        await Promise.resolve({
          ...completeTwoPersonFacts,
          team: { ...completeTwoPersonFacts.team, image: null },
        }),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toMatchObject({
      isComplete: false,
      team: "IN_PROGRESS",
    });
  });

  it("reports missing consent as not started", async () => {
    const router = createRouter({
      find: async () => await Promise.resolve({ ...completeTwoPersonFacts, consent: null }),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toMatchObject({
      isComplete: false,
      termsAndConditions: "NOT_STARTED",
    });
  });

  it("reports all-false consent as not started", async () => {
    const router = createRouter({
      find: async () =>
        await Promise.resolve({
          ...completeTwoPersonFacts,
          consent: {
            codernTermsAccepted: false,
            competitionRulesAccepted: false,
            guardianConsentObtained: false,
            healthDataConsent: false,
            privacyPolicyAccepted: false,
            publicityMediaConsent: false,
          },
        }),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toMatchObject({
      isComplete: false,
      termsAndConditions: "NOT_STARTED",
    });
  });

  it("reports partial consent as in progress", async () => {
    const router = createRouter({
      find: async () =>
        await Promise.resolve({
          ...completeTwoPersonFacts,
          consent: { ...consent, healthDataConsent: false },
        }),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toMatchObject({
      isComplete: false,
      termsAndConditions: "IN_PROGRESS",
    });
  });

  it("preserves structured repository failures", async () => {
    const router = createRouter({
      find: async () => await Promise.reject(createTeamRegistrationStatusRepositoryError()),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).rejects.toMatchObject({
      code: "TEAM_REGISTRATION_STATUS_REPOSITORY_ERROR",
      status: 500,
    });
  });

  it("rejects team ID input before repository access and requires authentication", async () => {
    const find = vi.fn<TeamRegistrationStatusRepository["find"]>(
      async () => await Promise.resolve(completeTwoPersonFacts),
    );
    const router = createRouter(createRepository({ find }));
    const { context } = createTestContext();
    const invalidInput = Object.defineProperty({}, "teamId", {
      enumerable: true,
      value: TEAM_ID,
    });

    await expect(
      call(router.get, invalidInput, {
        context,
        path: ["teamRegistrationStatus", "get"],
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(find).not.toHaveBeenCalled();

    const anonymousRouter = createRouter(createRepository(), createTestAuthReader(null));
    await expect(
      call(anonymousRouter.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
  });

  it("ignores slot 3 for a two-person team", async () => {
    const router = createRouter({
      find: async () =>
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
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toMatchObject({
      isComplete: true,
      participant3: "NOT_APPLICABLE",
    });
  });
});
