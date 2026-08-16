import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type {
  AuthReader,
  TeamAccessContext,
  TeamRegistrationStatusRepository,
} from "../../../index";
import { createAppRouter } from "../../../index";
import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
  createUnusedFileRepository,
  createUnusedTeamRepository,
} from "../../../__test__/test-support";
import { createTeamRegistrationStatusRepositoryError } from "../team-registration-status.errors";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const ownerAccess = { actorId: USER_ID, scope: "OWN_TEAM" } satisfies TeamAccessContext;

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
    image: "team-image",
    memberCount: 2,
    name: "Team One",
    school: "School One",
    submittedAt: null,
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
    submittedAt: null,
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
    findByOwnerId:
      overrides.findByOwnerId ?? (async () => await Promise.resolve(completeTwoPersonFacts)),
    findByTeamId:
      overrides.findByTeamId ?? (async () => await Promise.resolve(completeTwoPersonFacts)),
    submit: overrides.submit ?? (async () => await Promise.resolve("SUBMITTED")),
  };
}

function createRouter(
  repository: Partial<TeamRegistrationStatusRepository>,
  auth: AuthReader = createTestAuthReader(createTestSession()),
) {
  return createAppRouter({
    auth,
    files: createUnusedFileRepository(),
    teamRegistrationStatus: createRepository(repository),
    teams: createUnusedTeamRepository(),
  }).teamRegistrationStatus;
}

describe("team registration status router", () => {
  it("lets a Team Owner submit a complete registration once and audits the decision", async () => {
    const submit = vi.fn<TeamRegistrationStatusRepository["submit"]>(
      async (access, teamId, date) => {
        expect(access).toStrictEqual(ownerAccess);
        expect(teamId).toBe(TEAM_ID);
        expect(date).toBeInstanceOf(Date);
        return await Promise.resolve("SUBMITTED");
      },
    );
    const router = createRouter({ submit });
    const { context, log } = createTestContext();

    const result = await call(
      router.submit,
      { teamId: TEAM_ID },
      { context, path: ["teamRegistrationStatus", "submit"] },
    );

    expect(result).toMatchObject({
      isComplete: true,
      submissionState: "SUBMITTED",
      teamId: TEAM_ID,
    });
    expect(result.submittedAt).toBeInstanceOf(Date);
    expect(submit).toHaveBeenCalledOnce();
    expect(log.audit).toHaveBeenCalledWith({
      action: "team-registration.submitted",
      actor: { id: USER_ID, type: "user" },
      changes: {
        after: { submissionState: "SUBMITTED", submittedAt: result.submittedAt },
        before: { submissionState: "DRAFT", submittedAt: null },
      },
      outcome: "success",
      target: { id: TEAM_ID, teamId: TEAM_ID, type: "team-registration" },
    });
  });

  it("reports persisted submission state", async () => {
    const submittedAt = new Date("2026-08-11T06:00:00.000Z");
    const router = createRouter({
      findByOwnerId: async () =>
        await Promise.resolve({
          ...completeTwoPersonFacts,
          team: { ...completeTwoPersonFacts.team, submittedAt },
        }),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toMatchObject({
      submissionState: "SUBMITTED",
      submittedAt,
    });
  });

  it("denies another submission after registration is submitted", async () => {
    const submittedAt = new Date("2026-08-11T06:00:00.000Z");
    const submit = vi.fn<TeamRegistrationStatusRepository["submit"]>(
      async () => await Promise.resolve("SUBMITTED"),
    );
    const router = createRouter({
      findByTeamId: async () =>
        await Promise.resolve({
          ...completeTwoPersonFacts,
          team: { ...completeTwoPersonFacts.team, submittedAt },
        }),
      submit,
    });
    const { context, log } = createTestContext();

    await expect(
      call(
        router.submit,
        { teamId: TEAM_ID },
        { context, path: ["teamRegistrationStatus", "submit"] },
      ),
    ).rejects.toMatchObject({ code: "TEAM_REGISTRATION_ALREADY_SUBMITTED", status: 409 });
    expect(submit).not.toHaveBeenCalled();
    expect(log.audit).toHaveBeenCalledWith({
      action: "team-registration.submitted",
      actor: { id: USER_ID, type: "user" },
      outcome: "denied",
      reason: "TEAM_REGISTRATION_ALREADY_SUBMITTED",
      target: { id: TEAM_ID, teamId: TEAM_ID, type: "team-registration" },
    });
  });

  it("allows only one submission when two requests race", async () => {
    const router = createRouter({
      submit: async () => await Promise.resolve("ALREADY_SUBMITTED"),
    });
    const { context, log } = createTestContext();

    await expect(
      call(
        router.submit,
        { teamId: TEAM_ID },
        { context, path: ["teamRegistrationStatus", "submit"] },
      ),
    ).rejects.toMatchObject({ code: "TEAM_REGISTRATION_ALREADY_SUBMITTED", status: 409 });
    expect(log.audit).toHaveBeenCalledWith({
      action: "team-registration.submitted",
      actor: { id: USER_ID, type: "user" },
      outcome: "denied",
      reason: "TEAM_REGISTRATION_ALREADY_SUBMITTED",
      target: { id: TEAM_ID, teamId: TEAM_ID, type: "team-registration" },
    });
  });

  it("denies final submission while registration is incomplete", async () => {
    const submit = vi.fn<TeamRegistrationStatusRepository["submit"]>(
      async () => await Promise.resolve("SUBMITTED"),
    );
    const router = createRouter({
      findByTeamId: async () => await Promise.resolve(incompleteThreePersonFacts),
      submit,
    });
    const { context, log } = createTestContext();

    await expect(
      call(
        router.submit,
        { teamId: TEAM_ID },
        { context, path: ["teamRegistrationStatus", "submit"] },
      ),
    ).rejects.toMatchObject({ code: "TEAM_REGISTRATION_INCOMPLETE", status: 409 });
    expect(submit).not.toHaveBeenCalled();
    expect(log.audit).toHaveBeenCalledWith({
      action: "team-registration.submitted",
      actor: { id: USER_ID, type: "user" },
      outcome: "denied",
      reason: "TEAM_REGISTRATION_INCOMPLETE",
      target: { id: TEAM_ID, teamId: TEAM_ID, type: "team-registration" },
    });
  });

  it("does not let a Registration Operator submit another Team's registration", async () => {
    const findByTeamId = vi.fn<TeamRegistrationStatusRepository["findByTeamId"]>(async (access) => {
      expect(access).toStrictEqual({ actorId: "operator-1", scope: "OWN_TEAM" });
      return await Promise.resolve(null);
    });
    const router = createRouter(
      { findByTeamId },
      createTestAuthReader(createTestSession({ user: { id: "operator-1", role: "staff" } })),
    );
    const { context, log } = createTestContext();

    await expect(
      call(
        router.submit,
        { teamId: TEAM_ID },
        { context, path: ["teamRegistrationStatus", "submit"] },
      ),
    ).rejects.toMatchObject({ code: "TEAM_NOT_FOUND", status: 404 });
    expect(log.audit).toHaveBeenCalledWith({
      action: "team-registration.submitted",
      actor: { id: "operator-1", type: "user" },
      outcome: "denied",
      reason: "TEAM_NOT_FOUND",
      target: { id: TEAM_ID, teamId: TEAM_ID, type: "team-registration" },
    });
  });

  it("audits submission dependency failures without leaking details", async () => {
    const router = createRouter({
      findByTeamId: async () => await Promise.reject(createTeamRegistrationStatusRepositoryError()),
    });
    const { context, log } = createTestContext();

    await expect(
      call(
        router.submit,
        { teamId: TEAM_ID },
        { context, path: ["teamRegistrationStatus", "submit"] },
      ),
    ).rejects.toMatchObject({
      code: "TEAM_REGISTRATION_STATUS_REPOSITORY_ERROR",
      status: 500,
    });
    expect(log.audit).toHaveBeenCalledWith({
      action: "team-registration.submitted",
      actor: { id: USER_ID, type: "user" },
      outcome: "failure",
      reason: "TEAM_REGISTRATION_STATUS_REPOSITORY_ERROR",
      target: { id: TEAM_ID, teamId: TEAM_ID, type: "team-registration" },
    });
  });

  it("gives registration staff cross-team status access", async () => {
    const findByTeamId = vi.fn<TeamRegistrationStatusRepository["findByTeamId"]>(async (access) => {
      expect(access).toStrictEqual({ actorId: "staff-user", scope: "ALL_TEAMS" });
      return await Promise.resolve(completeTwoPersonFacts);
    });
    const router = createRouter(
      { findByTeamId },
      createTestAuthReader(createTestSession({ user: { id: "staff-user", role: "staff" } })),
    );
    const { context } = createTestContext();

    await expect(
      call(
        router.getByTeamId,
        { teamId: TEAM_ID },
        { context, path: ["teamRegistrationStatus", "getByTeamId"] },
      ),
    ).resolves.toMatchObject({ teamId: TEAM_ID });
  });

  it("does not let a Team Owner select another Team's status", async () => {
    const findByTeamId = vi.fn<TeamRegistrationStatusRepository["findByTeamId"]>(
      async () => await Promise.resolve(completeTwoPersonFacts),
    );
    const router = createRouter({ findByTeamId });
    const { context } = createTestContext();

    await expect(
      call(
        router.getByTeamId,
        { teamId: TEAM_ID },
        { context, path: ["teamRegistrationStatus", "getByTeamId"] },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(findByTeamId).not.toHaveBeenCalled();
  });

  it("validates Registration Operator Team ID input before repository access", async () => {
    const findByTeamId = vi.fn<TeamRegistrationStatusRepository["findByTeamId"]>(
      async () => await Promise.resolve(completeTwoPersonFacts),
    );
    const router = createRouter(
      { findByTeamId },
      createTestAuthReader(createTestSession({ user: { id: "staff-user", role: "staff" } })),
    );
    const { context } = createTestContext();

    await expect(
      call(
        router.getByTeamId,
        { teamId: "not-a-uuid" },
        { context, path: ["teamRegistrationStatus", "getByTeamId"] },
      ),
    ).rejects.toBeInstanceOf(Error);
    expect(findByTeamId).not.toHaveBeenCalled();
  });

  it("returns the current Team status without a Team ID input", async () => {
    const findByOwnerId = vi.fn<TeamRegistrationStatusRepository["findByOwnerId"]>(
      async () => await Promise.resolve(completeTwoPersonFacts),
    );
    const router = createRouter({ findByOwnerId });
    const { context } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toMatchObject({ teamId: TEAM_ID });
    expect(findByOwnerId).toHaveBeenCalledWith(USER_ID);
  });

  it("returns team not found when the current user has no team", async () => {
    const findByOwnerId = vi.fn<TeamRegistrationStatusRepository["findByOwnerId"]>(
      async () => await Promise.resolve(null),
    );
    const router = createRouter({ findByOwnerId });
    const { context } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).rejects.toMatchObject({ code: "TEAM_NOT_FOUND", status: 404 });
    expect(findByOwnerId).toHaveBeenCalledWith(USER_ID);
  });

  it("returns complete status for a two-person team without participant 3", async () => {
    const findByOwnerId = vi.fn<TeamRegistrationStatusRepository["findByOwnerId"]>(
      async () => await Promise.resolve(completeTwoPersonFacts),
    );
    const router = createRouter(createRepository({ findByOwnerId }));
    const { context, log } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).resolves.toStrictEqual({
      isComplete: true,
      memberCount: 2,
      participant1: "COMPLETED",
      participant2: "COMPLETED",
      participant3: "NOT_APPLICABLE",
      submissionState: "DRAFT",
      submittedAt: null,
      team: "COMPLETED",
      teamId: TEAM_ID,
      termsAndConditions: "COMPLETED",
    });
    expect(findByOwnerId).toHaveBeenCalledWith(USER_ID);
    expect(log.set).toHaveBeenCalledWith({
      teamRegistrationStatus: { teamId: TEAM_ID },
    });
  });

  it("returns complete status for a three-person team", async () => {
    const router = createRouter({
      findByOwnerId: async () => await Promise.resolve(completeThreePersonFacts),
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
      submissionState: "DRAFT",
      submittedAt: null,
      team: "COMPLETED",
      teamId: TEAM_ID,
      termsAndConditions: "COMPLETED",
    });
  });

  it("blocks three-person completion when participant 3 is missing", async () => {
    const router = createRouter({
      findByOwnerId: async () =>
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
      findByOwnerId: async () => await Promise.resolve(incompleteThreePersonFacts),
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
      submissionState: "DRAFT",
      submittedAt: null,
      team: "COMPLETED",
      teamId: TEAM_ID,
      termsAndConditions: "COMPLETED",
    });
  });

  it("reports missing participant rows as not started", async () => {
    const router = createRouter({
      findByOwnerId: async () =>
        await Promise.resolve({ ...completeTwoPersonFacts, participants: [] }),
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
      submissionState: "DRAFT",
      submittedAt: null,
      team: "COMPLETED",
      teamId: TEAM_ID,
      termsAndConditions: "COMPLETED",
    });
  });

  it("distinguishes missing and incomplete participant rows", async () => {
    const router = createRouter({
      findByOwnerId: async () =>
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
      findByOwnerId: async () =>
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
      findByOwnerId: async () =>
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
      findByOwnerId: async () =>
        await Promise.resolve({ ...completeTwoPersonFacts, consent: null }),
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
      findByOwnerId: async () =>
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
      findByOwnerId: async () =>
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
      findByOwnerId: async () =>
        await Promise.reject(createTeamRegistrationStatusRepositoryError()),
    });
    const { context } = createTestContext();

    await expect(
      call(router.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).rejects.toMatchObject({
      code: "TEAM_REGISTRATION_STATUS_REPOSITORY_ERROR",
      status: 500,
    });
  });

  it("requires authentication before repository access", async () => {
    const findByOwnerId = vi.fn<TeamRegistrationStatusRepository["findByOwnerId"]>(
      async () => await Promise.resolve(completeTwoPersonFacts),
    );
    const { context } = createTestContext();
    const anonymousRouter = createRouter(
      createRepository({ findByOwnerId }),
      createTestAuthReader(null),
    );
    await expect(
      call(anonymousRouter.get, {}, { context, path: ["teamRegistrationStatus", "get"] }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
    expect(findByOwnerId).not.toHaveBeenCalled();
  });

  it("ignores slot 3 for a two-person team", async () => {
    const router = createRouter({
      findByOwnerId: async () =>
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
