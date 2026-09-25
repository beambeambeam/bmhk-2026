import { call } from "@orpc/server";
import { describe, expect, it } from "vitest";

import { createAppRouter } from "../../../index";
import type {
  SaveTeamRoundResultInput,
  TeamRoundResult,
  TeamRoundResultListQuery,
  TeamRoundResultAward,
  TeamRoundResultOutcome,
  TeamRoundResultRepository,
  TeamRoundResultRound,
  SetTeamRoundResultOutcomeInput,
} from "../../../index";
import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
  createUnusedStaffDiscordLinkService,
} from "../../../__test__/test-support";

const TEAM_ID = "7f4207ac-58a8-48f5-8cd0-5d29c190fd18";
const team = { id: TEAM_ID, index: 42, name: "Example Team" };
const createdAt = new Date("2026-09-25T01:00:00.000Z");
const updatedAt = new Date("2026-09-25T02:00:00.000Z");
const laterUpdatedAt = new Date("2026-09-25T03:00:00.000Z");
const saveInput = {
  completedAssignment: 2,
  lastSubmittedAt: new Date("2026-09-24T23:00:00.000Z"),
  round: "ROUND_2" as const,
  score: 12.34,
  teamId: TEAM_ID,
  totalSubmission: 4,
};
const outcomeActionCases: {
  award: TeamRoundResultAward;
  hasLaterRoundCheckIns: boolean;
  name: string;
  round: TeamRoundResultRound;
  expected: TeamRoundResultOutcome["actions"];
}[] = [
  {
    award: "ROUND_1_PARTICIPATED",
    expected: {
      canAdvance: true,
      canRemoveFinalAward: false,
      canRevert: false,
      canSetFinalAward: false,
      hasLaterRoundCheckIns: false,
    },
    hasLaterRoundCheckIns: false,
    name: "round one can advance only after participation",
    round: "ROUND_1",
  },
  {
    award: "ADVANCED_TO_ROUND_2",
    expected: {
      canAdvance: false,
      canRemoveFinalAward: false,
      canRevert: true,
      canSetFinalAward: false,
      hasLaterRoundCheckIns: false,
    },
    hasLaterRoundCheckIns: false,
    name: "round one can revert an unconsumed advancement",
    round: "ROUND_1",
  },
  {
    award: "ADVANCED_TO_ROUND_2",
    expected: {
      canAdvance: false,
      canRemoveFinalAward: false,
      canRevert: false,
      canSetFinalAward: false,
      hasLaterRoundCheckIns: true,
    },
    hasLaterRoundCheckIns: true,
    name: "round one cannot revert after later round check-ins",
    round: "ROUND_1",
  },
  {
    award: "ROUND_2_PARTICIPATED",
    expected: {
      canAdvance: false,
      canRemoveFinalAward: false,
      canRevert: false,
      canSetFinalAward: false,
      hasLaterRoundCheckIns: true,
    },
    hasLaterRoundCheckIns: true,
    name: "round one cannot overwrite an outcome that progressed further",
    round: "ROUND_1",
  },
  {
    award: "ROUND_2_PARTICIPATED",
    expected: {
      canAdvance: true,
      canRemoveFinalAward: false,
      canRevert: false,
      canSetFinalAward: false,
      hasLaterRoundCheckIns: false,
    },
    hasLaterRoundCheckIns: false,
    name: "round two can advance after participation",
    round: "ROUND_2",
  },
  {
    award: "ADVANCED_TO_ROUND_3",
    expected: {
      canAdvance: false,
      canRemoveFinalAward: false,
      canRevert: true,
      canSetFinalAward: false,
      hasLaterRoundCheckIns: false,
    },
    hasLaterRoundCheckIns: false,
    name: "round two can revert an unconsumed advancement",
    round: "ROUND_2",
  },
  {
    award: "ADVANCED_TO_ROUND_3",
    expected: {
      canAdvance: false,
      canRemoveFinalAward: false,
      canRevert: false,
      canSetFinalAward: false,
      hasLaterRoundCheckIns: true,
    },
    hasLaterRoundCheckIns: true,
    name: "round two cannot revert after round three check-ins",
    round: "ROUND_2",
  },
  {
    award: "ROUND_3_PARTICIPATED",
    expected: {
      canAdvance: false,
      canRemoveFinalAward: false,
      canRevert: false,
      canSetFinalAward: true,
      hasLaterRoundCheckIns: false,
    },
    hasLaterRoundCheckIns: false,
    name: "round three can receive a final award after participation",
    round: "ROUND_3",
  },
  {
    award: "FIRST_PLACE",
    expected: {
      canAdvance: false,
      canRemoveFinalAward: true,
      canRevert: false,
      canSetFinalAward: true,
      hasLaterRoundCheckIns: false,
    },
    hasLaterRoundCheckIns: false,
    name: "round three can replace or remove an existing final award",
    round: "ROUND_3",
  },
];

// Runtime schema tests intentionally pass malformed values that TypeScript rejects.
function uncheckedInput(input: unknown): never {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Keep invalid payloads at the public call seam.
  return input as never;
}

type TestRole = "academicStaff" | "admin" | "superAdmin" | "staff" | "registrationStaff" | "user";
type ProcedureName = "get" | "list" | "save";

function createRouter(
  repository: TeamRoundResultRepository,
  role: TestRole | null = "academicStaff",
) {
  return createAppRouter({
    auth: createTestAuthReader(role === null ? null : createTestSession({ user: { role } })),
    staffDiscordLinkService: createUnusedStaffDiscordLinkService(),
    teamRoundResults: repository,
  }).teamRoundResults;
}

function createResult(
  input: SaveTeamRoundResultInput,
  resultCreatedAt: Date = createdAt,
  resultUpdatedAt: Date = updatedAt,
): TeamRoundResult {
  return { ...input, createdAt: resultCreatedAt, updatedAt: resultUpdatedAt };
}

function createRepository(
  overrides: Partial<TeamRoundResultRepository> = {},
): TeamRoundResultRepository {
  return {
    findByTeamId:
      overrides.findByTeamId ?? (async () => await Promise.resolve({ results: [], team })),
    findOutcome:
      overrides.findOutcome ??
      (async () =>
        await Promise.resolve({
          award: "ROUND_1_PARTICIPATED",
          hasLaterRoundCheckIns: false,
          hasRoundCheckIn: true,
          round: "ROUND_1",
          team,
        })),
    list: overrides.list ?? (async () => await Promise.resolve({ rowCount: 0, rows: [] })),
    save: overrides.save ?? (async (input) => await Promise.resolve(createResult(input))),
    setOutcome:
      overrides.setOutcome ??
      (async () => await Promise.resolve({ status: "INVALID_TRANSITION" as const })),
  };
}

async function callOperation(
  router: ReturnType<typeof createRouter>,
  operation: ProcedureName,
  context: ReturnType<typeof createTestContext>["context"],
): Promise<unknown> {
  if (operation === "get") {
    return await call(router.get, { teamId: TEAM_ID }, { context });
  }
  if (operation === "list") {
    return await call(router.list, { round: "ROUND_1" }, { context });
  }
  return await call(router.save, saveInput, { context });
}

describe("team round results", () => {
  it.each(outcomeActionCases)("exposes correct outcome actions: $name", async (testCase) => {
    const router = createRouter(
      createRepository({
        findOutcome: async () =>
          await Promise.resolve({
            award: testCase.award,
            hasLaterRoundCheckIns: testCase.hasLaterRoundCheckIns,
            hasRoundCheckIn: true,
            round: testCase.round,
            team,
          }),
      }),
    );
    const { context } = createTestContext();

    await expect(
      call(router.getOutcome, { round: testCase.round, teamId: TEAM_ID }, { context }),
    ).resolves.toMatchObject({ actions: testCase.expected, award: testCase.award });
  });

  it("grants next-round eligibility through the public round-result API", async () => {
    let currentAward: TeamRoundResultOutcome["award"] = "ROUND_1_PARTICIPATED";
    let updatedInput: SetTeamRoundResultOutcomeInput | null = null;
    function outcomeState(award: TeamRoundResultOutcome["award"]) {
      return {
        award,
        hasLaterRoundCheckIns: false,
        hasRoundCheckIn: true,
        round: "ROUND_1" as const,
        team,
      };
    }
    const router = createRouter(
      createRepository({
        findOutcome: async () => await Promise.resolve(outcomeState(currentAward)),
        setOutcome: async (input) => {
          updatedInput = input;
          const previousAward = currentAward;
          currentAward = "ADVANCED_TO_ROUND_2";
          return await Promise.resolve({
            outcome: outcomeState(currentAward),
            previousAward,
            status: "UPDATED" as const,
          });
        },
      }),
    );
    const { context } = createTestContext();

    await expect(
      call(router.getOutcome, { round: "ROUND_1", teamId: TEAM_ID }, { context }),
    ).resolves.toStrictEqual({
      actions: {
        canAdvance: true,
        canRemoveFinalAward: false,
        canRevert: false,
        canSetFinalAward: false,
        hasLaterRoundCheckIns: false,
      },
      award: "ROUND_1_PARTICIPATED",
      round: "ROUND_1",
      team,
    });

    await expect(
      call(
        router.setOutcome,
        {
          action: { type: "ADVANCE" },
          expectedAward: "ROUND_1_PARTICIPATED",
          round: "ROUND_1",
          teamId: TEAM_ID,
        },
        { context },
      ),
    ).resolves.toMatchObject({ award: "ADVANCED_TO_ROUND_2" });
    expect(updatedInput).toMatchObject({
      action: { type: "ADVANCE" },
      expectedAward: "ROUND_1_PARTICIPATED",
      round: "ROUND_1",
      teamId: TEAM_ID,
    });
  });

  it.each(["academicStaff", "registrationStaff", "admin", "superAdmin"] as const)(
    "allows %s to read and change a round outcome",
    async (role) => {
      const currentOutcome = {
        award: "ROUND_1_PARTICIPATED" as const,
        hasLaterRoundCheckIns: false,
        hasRoundCheckIn: true,
        round: "ROUND_1" as const,
        team,
      };
      let readCount = 0;
      let setCount = 0;
      const router = createRouter(
        createRepository({
          findOutcome: async () => {
            readCount += 1;
            return await Promise.resolve(currentOutcome);
          },
          setOutcome: async () => {
            setCount += 1;
            return await Promise.resolve({
              outcome: { ...currentOutcome, award: "ADVANCED_TO_ROUND_2" },
              previousAward: currentOutcome.award,
              status: "UPDATED" as const,
            });
          },
        }),
        role,
      );
      const { context, log } = createTestContext();

      await call(router.getOutcome, { round: "ROUND_1", teamId: TEAM_ID }, { context });
      await expect(
        call(
          router.setOutcome,
          {
            action: { type: "ADVANCE" },
            expectedAward: "ROUND_1_PARTICIPATED",
            round: "ROUND_1",
            teamId: TEAM_ID,
          },
          { context },
        ),
      ).resolves.toMatchObject({ award: "ADVANCED_TO_ROUND_2" });

      expect(readCount).toBe(1);
      expect(setCount).toBe(1);
      expect(log.audit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "team.award.changed",
          changes: {
            after: { award: "ADVANCED_TO_ROUND_2" },
            before: { award: "ROUND_1_PARTICIPATED" },
          },
          outcome: "success",
        }),
      );
    },
  );

  it.each(["staff", "user", null] as const)(
    "denies %s from changing round outcomes without either staff permission",
    async (role) => {
      let repositoryCalls = 0;
      const router = createRouter(
        createRepository({
          findOutcome: async () => {
            repositoryCalls += 1;
            return await Promise.resolve(null);
          },
          setOutcome: async () => {
            repositoryCalls += 1;
            return await Promise.resolve({ status: "INVALID_TRANSITION" as const });
          },
        }),
        role,
      );
      const { context, log } = createTestContext();

      await expect(
        call(
          router.setOutcome,
          {
            action: { type: "ADVANCE" },
            expectedAward: "ROUND_1_PARTICIPATED",
            round: "ROUND_1",
            teamId: TEAM_ID,
          },
          { context },
        ),
      ).rejects.toMatchObject(
        role === null ? { code: "UNAUTHORIZED", status: 401 } : { code: "FORBIDDEN", status: 403 },
      );

      expect(repositoryCalls).toBe(0);
      expect(log.audit).toHaveBeenCalledTimes(role === null ? 0 : 1);
    },
  );

  it.each([
    ["STALE", "TEAM_ROUND_OUTCOME_STALE"],
    ["ROUND_CHECK_IN_REQUIRED", "TEAM_ROUND_OUTCOME_CHECK_IN_REQUIRED"],
    ["LATER_ROUND_CHECK_IN", "TEAM_ROUND_OUTCOME_LATER_CHECK_IN"],
    ["INVALID_TRANSITION", "TEAM_ROUND_OUTCOME_INVALID_TRANSITION"],
  ] as const)("audits and rejects an unavailable outcome change: %s", async (status, code) => {
    const router = createRouter(
      createRepository({
        setOutcome: async () => await Promise.resolve({ status }),
      }),
    );
    const { context, log } = createTestContext();

    await expect(
      call(
        router.setOutcome,
        {
          action: { type: "ADVANCE" },
          expectedAward: "ROUND_1_PARTICIPATED",
          round: "ROUND_1",
          teamId: TEAM_ID,
        },
        { context },
      ),
    ).rejects.toMatchObject({ code, status: 409 });
    expect(log.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "team.award.changed", outcome: "denied", reason: code }),
    );
  });

  it.each([
    {
      action: { type: "ADVANCE" },
      expectedAward: "ROUND_3_PARTICIPATED",
      round: "ROUND_3",
      teamId: TEAM_ID,
    },
    {
      action: { award: "FIRST_PLACE", type: "SET_FINAL_AWARD" },
      expectedAward: "ROUND_1_PARTICIPATED",
      round: "ROUND_1",
      teamId: TEAM_ID,
    },
    {
      action: { award: "REGISTRATION_COMPLETE", type: "SET_FINAL_AWARD" },
      expectedAward: "ROUND_3_PARTICIPATED",
      round: "ROUND_3",
      teamId: TEAM_ID,
    },
  ])("rejects an outcome action that does not match its round and award options", async (input) => {
    let repositoryCalls = 0;
    const router = createRouter(
      createRepository({
        setOutcome: async () => {
          repositoryCalls += 1;
          return await Promise.resolve({ status: "INVALID_TRANSITION" as const });
        },
      }),
    );
    const { context } = createTestContext();

    await expect(call(router.setOutcome, uncheckedInput(input), { context })).rejects.toMatchObject(
      {
        code: "BAD_REQUEST",
      },
    );
    expect(repositoryCalls).toBe(0);
  });

  it("audits repository failure while changing an outcome", async () => {
    const router = createRouter(
      createRepository({
        setOutcome: async () => await Promise.reject(new Error("Database unavailable")),
      }),
    );
    const { context, log } = createTestContext();

    await expect(
      call(
        router.setOutcome,
        {
          action: { type: "ADVANCE" },
          expectedAward: "ROUND_1_PARTICIPATED",
          round: "ROUND_1",
          teamId: TEAM_ID,
        },
        { context },
      ),
    ).rejects.toMatchObject({ code: "TEAM_ROUND_RESULT_UNAVAILABLE", status: 503 });
    expect(log.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "team.award.changed",
        outcome: "failure",
        reason: "TEAM_ROUND_RESULT_UNAVAILABLE",
      }),
    );
  });

  it.each([1e-7, 1.0000000000000002, 1_000_000_000_000.001])(
    "rejects score %s when its decimal representation has excess precision",
    async (score) => {
      const router = createRouter(
        createRepository({
          findByTeamId: async () => await Promise.resolve({ results: [], team }),
          list: async () => await Promise.resolve({ rowCount: 0, rows: [] }),
          save: async (input) =>
            await Promise.resolve({ ...input, createdAt, updatedAt: createdAt }),
        }),
      );
      const { context } = createTestContext();

      await expect(
        call(router.save, uncheckedInput({ ...saveInput, score }), { context }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    },
  );

  it.each([0.01, 0.07, 0.29, -1.25, null, 1e308])(
    "accepts score %s when it has at most two fractional digits",
    async (score) => {
      const input = { ...saveInput, score };
      const router = createRepository({
        save: async (saveRequest) => await Promise.resolve(createResult(saveRequest)),
      });
      const { context } = createTestContext();

      await expect(call(createRouter(router).save, input, { context })).resolves.toStrictEqual(
        createResult(input),
      );
    },
  );

  it("lets academic staff read all three rounds before any results are entered", async () => {
    const router = createAppRouter({
      auth: createTestAuthReader(createTestSession({ user: { role: "academicStaff" } })),
      staffDiscordLinkService: createUnusedStaffDiscordLinkService(),
      teamRoundResults: createRepository({
        findByTeamId: async () => await Promise.resolve({ results: [], team }),
        list: async () => await Promise.reject(new Error("Unexpected list")),
        save: async () => await Promise.reject(new Error("Unexpected save")),
      }),
    });
    const { context } = createTestContext();

    await expect(
      call(router.teamRoundResults.get, { teamId: TEAM_ID }, { context }),
    ).resolves.toStrictEqual({
      rounds: [
        { result: null, round: "ROUND_1" },
        { result: null, round: "ROUND_2" },
        { result: null, round: "ROUND_3" },
      ],
      team,
    });
  });

  it("saves manually entered values for a round without requiring a team check-in", async () => {
    let saved: TeamRoundResult | null = null;
    const router = createRouter(
      createRepository({
        findByTeamId: async () => await Promise.resolve({ results: saved ? [saved] : [], team }),
        list: async () => await Promise.reject(new Error("Unexpected list")),
        save: async (input: SaveTeamRoundResultInput) => {
          saved = { ...input, createdAt, updatedAt: createdAt };
          return await Promise.resolve(saved);
        },
      }),
    );
    const { context } = createTestContext();
    await expect(
      call(
        router.save,
        {
          completedAssignment: 2,
          lastSubmittedAt: new Date("2026-09-24T23:00:00.000Z"),
          round: "ROUND_2",
          score: -1.25,
          teamId: TEAM_ID,
          totalSubmission: 4,
        },
        { context },
      ),
    ).resolves.toStrictEqual({
      completedAssignment: 2,
      createdAt,
      lastSubmittedAt: new Date("2026-09-24T23:00:00.000Z"),
      round: "ROUND_2",
      score: -1.25,
      teamId: TEAM_ID,
      totalSubmission: 4,
      updatedAt: createdAt,
    });
    await expect(call(router.get, { teamId: TEAM_ID }, { context })).resolves.toMatchObject({
      rounds: [
        { result: null, round: "ROUND_1" },
        { result: { score: -1.25, totalSubmission: 4 }, round: "ROUND_2" },
        { result: null, round: "ROUND_3" },
      ],
    });
  });

  it("lists checked-in teams with empty results and the filtered team count", async () => {
    const router = createRouter(
      createRepository({
        findByTeamId: async () => await Promise.reject(new Error("Unexpected get")),
        list: async () =>
          await Promise.resolve({
            rowCount: 12,
            rows: [{ result: null, round: "ROUND_2", team }],
          }),
        save: async () => await Promise.reject(new Error("Unexpected save")),
      }),
    );
    const { context } = createTestContext();

    await expect(
      call(
        router.list,
        {
          columnFilters: [{ id: "teamCheckIn", value: "registered" }],
          pagination: { pageIndex: 1, pageSize: 1 },
          round: "ROUND_2",
        },
        { context },
      ),
    ).resolves.toStrictEqual({
      rowCount: 12,
      rows: [{ result: null, round: "ROUND_2", team }],
    });
  });

  it.each(["academicStaff", "registrationStaff", "admin", "superAdmin"] as const)(
    "allows %s to use get, list, and save",
    async (role) => {
      const calls: ProcedureName[] = [];
      const router = createRouter(
        createRepository({
          findByTeamId: async () => {
            calls.push("get");
            return await Promise.resolve({ results: [], team });
          },
          list: async () => {
            calls.push("list");
            return await Promise.resolve({ rowCount: 0, rows: [] });
          },
          save: async (input) => {
            calls.push("save");
            return await Promise.resolve(createResult(input));
          },
        }),
        role,
      );
      const { context } = createTestContext();

      await callOperation(router, "get", context);
      await callOperation(router, "list", context);
      await callOperation(router, "save", context);

      expect(calls).toStrictEqual(["get", "list", "save"]);
    },
  );

  const deniedAccessCases = [
    { operation: "get", role: "staff" },
    { operation: "list", role: "staff" },
    { operation: "save", role: "staff" },
    { operation: "get", role: "user" },
    { operation: "list", role: "user" },
    { operation: "save", role: "user" },
    { operation: "get", role: null },
    { operation: "list", role: null },
    { operation: "save", role: null },
  ] as const satisfies readonly { operation: ProcedureName; role: TestRole | null }[];

  it.each(deniedAccessCases)(
    "denies $role from $operation when they lack academic access",
    async ({ operation, role }) => {
      let repositoryCalls = 0;
      const router = createRouter(
        createRepository({
          findByTeamId: async () => {
            repositoryCalls += 1;
            return await Promise.resolve({ results: [], team });
          },
          list: async () => {
            repositoryCalls += 1;
            return await Promise.resolve({ rowCount: 0, rows: [] });
          },
          save: async (input) => {
            repositoryCalls += 1;
            return await Promise.resolve(createResult(input));
          },
        }),
        role,
      );
      const { context } = createTestContext();

      await expect(callOperation(router, operation, context)).rejects.toMatchObject(
        role === null ? { code: "UNAUTHORIZED", status: 401 } : { code: "FORBIDDEN", status: 403 },
      );
      expect(repositoryCalls).toBe(0);
    },
  );

  const invalidSaveInputs: readonly { input: unknown; name: string }[] = [
    { input: { ...saveInput, teamId: "not-a-uuid" }, name: "malformed Team ID" },
    { input: { ...saveInput, round: "ROUND_4" }, name: "unsupported round" },
    { input: { ...saveInput, score: 1e-7 }, name: "score with more than two decimals" },
    { input: { ...saveInput, score: Number.POSITIVE_INFINITY }, name: "infinite score" },
    { input: { ...saveInput, score: Number.NaN }, name: "NaN score" },
    { input: { ...saveInput, totalSubmission: -1 }, name: "negative submission count" },
    { input: { ...saveInput, totalSubmission: 1.5 }, name: "fractional submission count" },
    { input: { ...saveInput, totalSubmission: 2_147_483_648 }, name: "oversized submission count" },
    { input: { ...saveInput, completedAssignment: null }, name: "nullable assignment count" },
    { input: { ...saveInput, lastSubmittedAt: new Date("invalid") }, name: "invalid timestamp" },
    {
      input: { ...saveInput, lastSubmittedAt: "2026-09-24T23:00:00.000Z" },
      name: "timestamp string instead of Date",
    },
    { input: { ...saveInput, lastSubmittedAt: undefined }, name: "missing nullable timestamp" },
    { input: { ...saveInput, createdAt }, name: "output-only creation timestamp" },
    { input: { ...saveInput, extra: true }, name: "unknown field" },
  ];

  it.each(invalidSaveInputs)("rejects $name at the save boundary", async ({ input }) => {
    let saved = false;
    const router = createRouter(
      createRepository({
        save: async (saveRequest) => {
          saved = true;
          return await Promise.resolve(createResult(saveRequest));
        },
      }),
    );
    const { context } = createTestContext();

    await expect(call(router.save, uncheckedInput(input), { context })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
    expect(saved).toBeFalsy();
  });

  const invalidListInputs: readonly { input: unknown; name: string }[] = [
    { input: {}, name: "missing round" },
    { input: { round: "ROUND_4" }, name: "unsupported round" },
    {
      input: { pagination: { pageIndex: 0, pageSize: 0 }, round: "ROUND_1" },
      name: "zero page size",
    },
    {
      input: { pagination: { pageIndex: 0, pageSize: 101 }, round: "ROUND_1" },
      name: "oversized page",
    },
    {
      input: { pagination: { pageIndex: -1, pageSize: 10 }, round: "ROUND_1" },
      name: "negative page index",
    },
    {
      input: { round: "ROUND_1", sorting: [{ desc: false, id: "unknown" }] },
      name: "unknown sort column",
    },
    {
      input: {
        round: "ROUND_1",
        sorting: [
          { desc: false, id: "teamCode" },
          { desc: true, id: "teamCode" },
        ],
      },
      name: "duplicate sort columns",
    },
    {
      input: { columnFilters: [{ id: "teamCheckIn", value: "all" }], round: "ROUND_1" },
      name: "invalid check-in filter",
    },
    {
      input: { columnFilters: [{ id: "team", value: "Example" }], round: "ROUND_1" },
      name: "obsolete combined team filter",
    },
    {
      input: {
        columnFilters: [
          { id: "teamCode", value: "42" },
          { id: "teamName", value: "Example" },
          { id: "teamCheckIn", value: "registered" },
          { id: "unused", value: "x" },
        ],
        round: "ROUND_1",
      },
      name: "more than three filters",
    },
    {
      input: { columnFilters: [{ id: "unsupported", value: "x" }], round: "ROUND_1" },
      name: "unknown filter",
    },
    { input: { extra: true, round: "ROUND_1" }, name: "unknown query field" },
  ];

  it.each(invalidListInputs)("rejects list query with $name", async ({ input }) => {
    let listed = false;
    const router = createRouter(
      createRepository({
        list: async () => {
          listed = true;
          return await Promise.resolve({ rowCount: 0, rows: [] });
        },
      }),
    );
    const { context } = createTestContext();

    await expect(call(router.list, uncheckedInput(input), { context })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
    expect(listed).toBeFalsy();
  });

  it("passes safe list defaults and checked-in filters to the repository", async () => {
    const queries: TeamRoundResultListQuery[] = [];
    const router = createRouter(
      createRepository({
        list: async (query) => {
          queries.push(query);
          return await Promise.resolve({ rowCount: 0, rows: [] });
        },
      }),
    );
    const { context } = createTestContext();

    await call(router.list, { round: "ROUND_1" }, { context });
    await call(
      router.list,
      {
        columnFilters: [{ id: "teamCheckIn", value: "registered" }],
        pagination: { pageIndex: 2, pageSize: 20 },
        round: "ROUND_2",
        sorting: [{ desc: true, id: "score" }],
      },
      { context },
    );

    expect(queries).toStrictEqual([
      {
        columnFilters: [],
        pagination: { pageIndex: 0, pageSize: 10 },
        round: "ROUND_1",
        sorting: [{ desc: false, id: "teamCode" }],
      },
      {
        columnFilters: [{ id: "teamCheckIn", value: "registered" }],
        pagination: { pageIndex: 2, pageSize: 20 },
        round: "ROUND_2",
        sorting: [{ desc: true, id: "score" }],
      },
    ]);
  });

  it("accepts independent team filters and every result timestamp sort", async () => {
    const queries: TeamRoundResultListQuery[] = [];
    const router = createRouter(
      createRepository({
        list: async (query) => {
          queries.push(query);
          return await Promise.resolve({ rowCount: 0, rows: [] });
        },
      }),
    );
    const { context } = createTestContext();

    await call(
      router.list,
      {
        columnFilters: [
          { id: "teamCode", value: "BH042" },
          { id: "teamName", value: "Example" },
          { id: "teamCheckIn", value: "registered" },
        ],
        round: "ROUND_1",
        sorting: [
          { desc: false, id: "createdAt" },
          { desc: true, id: "updatedAt" },
        ],
      },
      { context },
    );

    expect(queries).toStrictEqual([
      {
        columnFilters: [
          { id: "teamCode", value: "BH042" },
          { id: "teamName", value: "Example" },
          { id: "teamCheckIn", value: "registered" },
        ],
        pagination: { pageIndex: 0, pageSize: 10 },
        round: "ROUND_1",
        sorting: [
          { desc: false, id: "createdAt" },
          { desc: true, id: "updatedAt" },
        ],
      },
    ]);
  });

  it("orders rounds and distinguishes an unscored result, a zero score, and missing results", async () => {
    const unscored = createResult({ ...saveInput, round: "ROUND_1", score: null });
    const zeroScore = createResult({ ...saveInput, round: "ROUND_2", score: 0 });
    const router = createRouter(
      createRepository({
        findByTeamId: async () => await Promise.resolve({ results: [zeroScore, unscored], team }),
      }),
    );
    const { context } = createTestContext();

    await expect(call(router.get, { teamId: TEAM_ID }, { context })).resolves.toStrictEqual({
      rounds: [
        { result: unscored, round: "ROUND_1" },
        { result: zeroScore, round: "ROUND_2" },
        { result: null, round: "ROUND_3" },
      ],
      team,
    });
  });

  it("replaces all entered fields while keeping each round independent", async () => {
    const resultsByRound = new Map<string, TeamRoundResult>();
    const writeTimes = [createdAt, updatedAt, laterUpdatedAt];
    let writeIndex = 0;
    const router = createRouter(
      createRepository({
        findByTeamId: async (teamId) =>
          await Promise.resolve(
            teamId === TEAM_ID ? { results: [...resultsByRound.values()], team } : null,
          ),
        save: async (input) => {
          const previous = resultsByRound.get(input.round);
          const savedAt = writeTimes[writeIndex] ?? laterUpdatedAt;
          writeIndex += 1;
          const result = createResult(input, previous?.createdAt ?? savedAt, savedAt);
          resultsByRound.set(input.round, result);
          return await Promise.resolve(result);
        },
      }),
    );
    const { context } = createTestContext();
    const firstRoundOne = { ...saveInput, round: "ROUND_1" as const, score: 93.25 };
    const replacementRoundOne = {
      ...saveInput,
      completedAssignment: 1,
      lastSubmittedAt: null,
      round: "ROUND_1" as const,
      score: null,
      totalSubmission: 1,
    };
    const firstRoundTwo = {
      ...saveInput,
      completedAssignment: 0,
      lastSubmittedAt: null,
      round: "ROUND_2" as const,
      score: 0,
      totalSubmission: 0,
    };

    await expect(call(router.save, firstRoundOne, { context })).resolves.toStrictEqual(
      createResult(firstRoundOne, createdAt, createdAt),
    );
    await expect(call(router.save, replacementRoundOne, { context })).resolves.toStrictEqual(
      createResult(replacementRoundOne, createdAt, updatedAt),
    );
    await expect(call(router.save, firstRoundTwo, { context })).resolves.toStrictEqual(
      createResult(firstRoundTwo, laterUpdatedAt, laterUpdatedAt),
    );

    await expect(call(router.get, { teamId: TEAM_ID }, { context })).resolves.toStrictEqual({
      rounds: [
        { result: createResult(replacementRoundOne, createdAt, updatedAt), round: "ROUND_1" },
        { result: createResult(firstRoundTwo, laterUpdatedAt, laterUpdatedAt), round: "ROUND_2" },
        { result: null, round: "ROUND_3" },
      ],
      team,
    });
  });

  it.each(["get", "save"] as const)(
    "returns a stable not-found error for an unknown team on %s",
    async (operation) => {
      const router = createRouter(
        createRepository({
          findByTeamId: async () => await Promise.resolve(null),
          save: async () => await Promise.resolve(null),
        }),
      );
      const { context } = createTestContext();

      await expect(callOperation(router, operation, context)).rejects.toMatchObject({
        code: "TEAM_ROUND_RESULT_TEAM_NOT_FOUND",
        status: 404,
      });
    },
  );

  it.each(["get", "list", "save"] as const)(
    "converts %s persistence failures to a retryable error without leaking database details",
    async (operation) => {
      const failure = new Error("private database connection details");
      let repository = createRepository();
      if (operation === "get") {
        repository = createRepository({
          findByTeamId: async () => await Promise.reject(failure),
        });
      }
      if (operation === "list") {
        repository = createRepository({
          list: async () => await Promise.reject(failure),
        });
      }
      if (operation === "save") {
        repository = createRepository({
          save: async () => await Promise.reject(failure),
        });
      }
      const router = createRouter(repository);
      const { context } = createTestContext();

      await expect(callOperation(router, operation, context)).rejects.toMatchObject({
        code: "TEAM_ROUND_RESULT_UNAVAILABLE",
        data: { fix: "Try again shortly", why: "The result could not be read or saved" },
        message: "Team round results are temporarily unavailable",
        status: 503,
      });
    },
  );
});
