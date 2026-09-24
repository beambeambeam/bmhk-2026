import { call } from "@orpc/server";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "../../../index";
import { createRound2RepositoryError } from "../round2-confirmation.errors";
import type {
  ApiDependencies,
  Round2ConfirmationFacts,
  Round2ConfirmationRepository,
} from "../../../index";
import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
  createUnusedStaffDiscordLinkService,
} from "../../../__test__/test-support";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const facts: Round2ConfirmationFacts = {
  award: "ADVANCED_TO_ROUND_2",
  confirmedAt: null,
  memberCount: 2,
  participants: [1, 2].map((index) => ({
    id: `22222222-2222-4222-8222-22222222222${index}`,
    identityDocumentFileId: `33333333-3333-4333-8333-33333333333${index}`,
    index,
    studentIdDocumentFileId: `44444444-4444-4444-8444-44444444444${index}`,
  })),
  teamId: TEAM_ID,
};

function repository(
  overrides: Partial<Round2ConfirmationRepository> = {},
): Round2ConfirmationRepository {
  return {
    findDocument: async () => await Promise.resolve(null),
    findFacts: async () => await Promise.resolve(facts),
    replaceDocument: async () => await Promise.reject(new Error("Unexpected upload")),
    submit: async (_access, _teamId, validate, confirmedAt) => {
      validate(facts);
      return await Promise.resolve({ ...facts, confirmedAt });
    },
    ...overrides,
  };
}

function createRouter(
  overrides: Partial<Round2ConfirmationRepository> = {},
  dependencies: Partial<ApiDependencies> = {},
) {
  return createAppRouter({
    auth: createTestAuthReader(),
    featureFlagClock: () => Temporal.Instant.from("2026-10-02T00:00:00+07:00"),
    round2Confirmation: repository(overrides),
    round2ConfirmationWindow: {
      endsAt: "2026-10-10T00:00:00+07:00",
      startsAt: "2026-10-01T00:00:00+07:00",
    },
    staffDiscordLinkService: createUnusedStaffDiscordLinkService(),
    ...dependencies,
  }).round2Confirmation;
}

describe("round 2 confirmation", () => {
  it("confirms all participants on explicit owner submission and audits the decision", async () => {
    const router = createAppRouter({
      auth: createTestAuthReader(),
      featureFlagClock: () => Temporal.Instant.from("2026-10-02T00:00:00+07:00"),
      round2Confirmation: repository(),
      round2ConfirmationWindow: {
        endsAt: "2026-10-10T00:00:00+07:00",
        startsAt: "2026-10-01T00:00:00+07:00",
      },
      staffDiscordLinkService: createUnusedStaffDiscordLinkService(),
    });
    const { context, log } = createTestContext();
    const result = await call(router.round2Confirmation.submit, { teamId: TEAM_ID }, { context });
    expect(result).toMatchObject({ isComplete: true, state: "CONFIRMED", teamId: TEAM_ID });
    expect(result.confirmedAt).toBeInstanceOf(Date);
    expect(log.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "round2-confirmation.submitted", outcome: "success" }),
    );
  });
});

describe("round 2 confirmation rules", () => {
  it.each([
    { award: "REGISTRATION_COMPLETE" as const },
    { award: "ROUND_2_PARTICIPATED" as const },
    { award: "FIRST_PLACE" as const },
  ])("requires exactly ADVANCED_TO_ROUND_2 for a first submission: $award", async (change) => {
    const router = createRouter({
      findFacts: async () => await Promise.resolve({ ...facts, ...change }),
    });
    const { context, log } = createTestContext();
    await expect(call(router.submit, { teamId: TEAM_ID }, { context })).rejects.toMatchObject({
      code: "ROUND2_CONFIRMATION_INELIGIBLE",
      status: 409,
    });
    expect(log.audit).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "denied", reason: "ROUND2_CONFIRMATION_INELIGIBLE" }),
    );
  });

  it.each([
    { memberCount: 0, participants: [] },
    { memberCount: 3, participants: facts.participants },
    {
      memberCount: 2,
      participants: facts.participants.map((participant) => ({
        ...participant,
        studentIdDocumentFileId: null,
      })),
    },
    {
      memberCount: 2,
      participants: facts.participants.map((participant) => ({
        ...participant,
        identityDocumentFileId: null,
      })),
    },
    {
      memberCount: 2,
      participants: facts.participants.map((participant) => ({ ...participant, index: 2 })),
    },
  ])("rejects incomplete documents or a mismatched roster %#", async (change) => {
    let submitted = false;
    const router = createRouter({
      findFacts: async () => await Promise.resolve({ ...facts, ...change }),
      submit: async () => {
        submitted = true;
        return await Promise.resolve(facts);
      },
    });
    const { context } = createTestContext();
    await expect(call(router.submit, { teamId: TEAM_ID }, { context })).rejects.toMatchObject({
      code: "ROUND2_CONFIRMATION_INCOMPLETE",
    });
    expect(submitted).toBeFalsy();
  });

  it("confirms a three-person team with both cards for all three participants", async () => {
    const three = {
      ...facts,
      memberCount: 3,
      participants: [
        ...facts.participants,
        {
          id: "22222222-2222-4222-8222-222222222223",
          identityDocumentFileId: "33333333-3333-4333-8333-333333333333",
          index: 3,
          studentIdDocumentFileId: "44444444-4444-4444-8444-444444444443",
        },
      ],
    };
    const router = createRouter({
      findFacts: async () => await Promise.resolve(three),
      submit: async (_access, _id, validate, confirmedAt) => {
        validate(three);
        return await Promise.resolve({ ...three, confirmedAt });
      },
    });
    const { context } = createTestContext();
    await expect(call(router.submit, { teamId: TEAM_ID }, { context })).resolves.toMatchObject({
      isComplete: true,
      memberCount: 3,
      state: "CONFIRMED",
    });
  });

  it.each([
    null,
    { startsAt: "2026-09-28T14:00:00+07:00" },
    { endsAt: "2026-10-01T00:00:00+07:00", startsAt: "2026-09-30T00:00:00+07:00" },
    { endsAt: "2026-10-10T00:00:00+07:00", startsAt: "2026-10-03T00:00:00+07:00" },
  ])("rejects submission outside the configured window %#", async (window) => {
    const router = createRouter({}, { round2ConfirmationWindow: window });
    const { context } = createTestContext();
    await expect(call(router.submit, { teamId: TEAM_ID }, { context })).rejects.toMatchObject({
      code: "ROUND2_CONFIRMATION_CLOSED",
    });
  });

  it("preserves confirmed history after an award change and window closure", async () => {
    const confirmedAt = new Date("2026-10-02T01:00:00Z");
    const router = createRouter(
      {
        findFacts: async () =>
          await Promise.resolve({ ...facts, award: "FIRST_PLACE", confirmedAt }),
      },
      { round2ConfirmationWindow: null },
    );
    const { context } = createTestContext();
    await expect(call(router.get, {}, { context })).resolves.toMatchObject({
      confirmedAt,
      isEligible: false,
      isOpen: false,
      state: "CONFIRMED",
    });
    await expect(call(router.submit, { teamId: TEAM_ID }, { context })).rejects.toMatchObject({
      code: "ROUND2_CONFIRMATION_ALREADY_SUBMITTED",
    });
  });

  it("revalidates the locked facts when another request already confirmed", async () => {
    const router = createRouter({
      submit: async (_access, _teamId, validate) => {
        validate({ ...facts, confirmedAt: new Date() });
        return await Promise.resolve(facts);
      },
    });
    const { context, log } = createTestContext();
    await expect(call(router.submit, { teamId: TEAM_ID }, { context })).rejects.toMatchObject({
      code: "ROUND2_CONFIRMATION_ALREADY_SUBMITTED",
    });
    expect(log.audit).toHaveBeenCalledWith(expect.objectContaining({ outcome: "denied" }));
  });

  it("revalidates completeness when a participant is added before commit", async () => {
    const router = createRouter({
      submit: async (_access, _teamId, validate) => {
        validate({ ...facts, memberCount: 3 });
        return await Promise.resolve(facts);
      },
    });
    const { context } = createTestContext();
    await expect(call(router.submit, { teamId: TEAM_ID }, { context })).rejects.toMatchObject({
      code: "ROUND2_CONFIRMATION_INCOMPLETE",
    });
  });

  it("rechecks the deadline after acquiring the write lock", async () => {
    let time = "2026-10-02T00:00:00+07:00";
    const router = createRouter(
      {
        submit: async (_access, _teamId, validate) => {
          time = "2026-10-10T00:00:00+07:00";
          validate(facts);
          return await Promise.resolve(facts);
        },
      },
      { featureFlagClock: () => Temporal.Instant.from(time) },
    );
    const { context } = createTestContext();
    await expect(call(router.submit, { teamId: TEAM_ID }, { context })).rejects.toMatchObject({
      code: "ROUND2_CONFIRMATION_CLOSED",
    });
  });

  it("only lets the owner submit even when the caller is registration staff", async () => {
    let receivedAccess: unknown;
    const router = createRouter(
      {
        findFacts: async (access) => {
          receivedAccess = access;
          return await Promise.resolve(null);
        },
      },
      {
        auth: createTestAuthReader(
          createTestSession({ user: { id: "operator", role: "registrationStaff" } }),
        ),
      },
    );
    const { context, log } = createTestContext();
    await expect(call(router.submit, { teamId: TEAM_ID }, { context })).rejects.toMatchObject({
      code: "TEAM_NOT_FOUND",
    });
    expect(receivedAccess).toStrictEqual({ actorId: "operator", scope: "OWN_TEAM" });
    expect(log.audit).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "denied", reason: "TEAM_NOT_FOUND" }),
    );
  });

  it("uses the session owner's team for status", async () => {
    let received: unknown;
    const router = createRouter({
      findFacts: async (...args) => {
        received = args;
        return await Promise.resolve(facts);
      },
    });
    const { context } = createTestContext();
    await expect(call(router.get, {}, { context })).resolves.toMatchObject({ state: "DRAFT" });
    expect(received).toStrictEqual([{ actorId: "user-1", scope: "OWN_TEAM" }, undefined]);
  });

  it("lets registration staff inspect a selected team", async () => {
    let received: unknown;
    const router = createRouter(
      {
        findFacts: async (...args) => {
          received = args;
          return await Promise.resolve(facts);
        },
      },
      { auth: createTestAuthReader(createTestSession({ user: { role: "registrationStaff" } })) },
    );
    const { context } = createTestContext();
    await expect(call(router.getByTeamId, { teamId: TEAM_ID }, { context })).resolves.toMatchObject(
      { teamId: TEAM_ID },
    );
    expect(received).toStrictEqual([{ actorId: "user-1", scope: "ALL_TEAMS" }, TEAM_ID]);
  });

  it("rejects owner access to staff inspection", async () => {
    const { context } = createTestContext();
    await expect(
      call(createRouter().getByTeamId, { teamId: TEAM_ID }, { context }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects unauthenticated submission", async () => {
    const router = createRouter({}, { auth: createTestAuthReader(null) });
    const { context } = createTestContext();
    await expect(call(router.submit, { teamId: TEAM_ID }, { context })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects invalid team IDs before reading the repository", async () => {
    let read = false;
    const router = createRouter({
      findFacts: async () => {
        read = true;
        return await Promise.resolve(facts);
      },
    });
    const { context } = createTestContext();
    await expect(call(router.submit, { teamId: "bad-id" }, { context })).rejects.toBeInstanceOf(
      Error,
    );
    expect(read).toBeFalsy();
  });
});

describe("round 2 submission failures", () => {
  it("audits repository failure without recording provider details", async () => {
    const router = createRouter({
      submit: async () =>
        await Promise.reject(createRound2RepositoryError(new Error("private database failure"))),
    });
    const { context, log } = createTestContext();
    await expect(call(router.submit, { teamId: TEAM_ID }, { context })).rejects.toMatchObject({
      code: "ROUND2_CONFIRMATION_REPOSITORY_ERROR",
      status: 500,
    });
    expect(log.audit).toHaveBeenCalledExactlyOnceWith({
      action: "round2-confirmation.submitted",
      actor: { id: "user-1", type: "user" },
      outcome: "failure",
      reason: "ROUND2_CONFIRMATION_REPOSITORY_ERROR",
      target: { id: TEAM_ID, teamId: TEAM_ID, type: "round2-confirmation" },
    });
  });
});

describe("active confirmation roster", () => {
  it("ignores an inactive third slot for a declared two-person team", async () => {
    const staleRoster = {
      ...facts,
      participants: [
        ...facts.participants,
        {
          id: "22222222-2222-4222-8222-222222222223",
          identityDocumentFileId: null,
          index: 3,
          studentIdDocumentFileId: null,
        },
      ],
    };
    const router = createRouter({
      findFacts: async () => await Promise.resolve(staleRoster),
      submit: async (_access, _teamId, validate, confirmedAt) => {
        validate(staleRoster);
        return await Promise.resolve({ ...staleRoster, confirmedAt });
      },
    });
    const { context } = createTestContext();
    const result = await call(router.submit, { teamId: TEAM_ID }, { context });
    expect(result).toMatchObject({ isComplete: true, memberCount: 2, state: "CONFIRMED" });
    expect(result.participants).toStrictEqual(facts.participants);
  });
});
