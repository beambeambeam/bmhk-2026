import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type { AuthReader, DiscordCodeRepository } from "../../../index";
import { createAppRouter } from "../../../index";
import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
  createUnusedFileRepository,
  createUnusedStaffDiscordLinkService,
  createUnusedTeamRepository,
} from "../../../__test__/test-support";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const CODE_PATTERN = /^[A-HJ-KM-NP-Z2-9]{8}$/u;
function staffAuth(): AuthReader {
  return createTestAuthReader(createTestSession({ user: { role: "registrationStaff" } }));
}

type Facts = NonNullable<Awaited<ReturnType<DiscordCodeRepository["findByOwnerId"]>>>;
type FactsParticipant = Facts["participants"][number];

function participant(index: number, overrides: Partial<FactsParticipant> = {}): FactsParticipant {
  return {
    altRedeemedAt: null,
    code: null,
    firstNameTh: `ชื่อ${index}`,
    id: `participant-${index}`,
    index,
    lastNameTh: `สกุล${index}`,
    middleNameTh: null,
    redeemedAt: null,
    titleTh: "นาย",
    ...overrides,
  };
}

function teamFacts(overrides: Partial<Facts> = {}): Facts {
  return {
    award: "REGISTRATION_COMPLETED",
    participants: [participant(1), participant(2)],
    reviewStatus: "APPROVED",
    teamId: TEAM_ID,
    ...overrides,
  };
}

/** In-memory fake: `insertMissing` persists codes so a re-read sees them, like the real table. */
function createFakeRepository(initial: Facts | null) {
  let facts = initial;
  const repository: DiscordCodeRepository = {
    findByOwnerId: async () => await Promise.resolve(facts),
    findByTeamId: async () => await Promise.resolve(facts),
    insertMissing: async (rows) => {
      if (facts === null) {
        return;
      }
      const byParticipant = new Map(rows.map((row) => [row.participantId, row.code]));
      facts = {
        ...facts,
        participants: facts.participants.map((existing) =>
          existing.code === null && byParticipant.has(existing.id)
            ? { ...existing, code: byParticipant.get(existing.id) ?? null }
            : existing,
        ),
      };
      await Promise.resolve();
    },
  };
  return repository;
}

function createRouter(
  repository: DiscordCodeRepository,
  auth: AuthReader = createTestAuthReader(createTestSession()),
) {
  return createAppRouter({
    auth,
    discordCodes: repository,
    files: createUnusedFileRepository(),
    staffDiscordLinkService: createUnusedStaffDiscordLinkService(),
    teams: createUnusedTeamRepository(),
  }).discordCodes;
}

describe("discord codes router", () => {
  it("generates a code for each participant of the owner's team", async () => {
    const router = createRouter(createFakeRepository(teamFacts()));
    const { context } = createTestContext();

    const result = await call(router.getOrCreate, {}, { context });

    const [first, second] = result;
    expect(
      result.map(({ name, participantIndex, status }) => ({ name, participantIndex, status })),
    ).toStrictEqual([
      { name: "นาย ชื่อ1 สกุล1", participantIndex: 1, status: "NOT_REDEEMED" },
      { name: "นาย ชื่อ2 สกุล2", participantIndex: 2, status: "NOT_REDEEMED" },
    ]);
    expect(first?.code).toMatch(CODE_PATTERN);
    expect(second?.code).toMatch(CODE_PATTERN);
    expect(first?.code).not.toBe(second?.code);
  });
  it("returns the same codes on later calls without inserting again", async () => {
    const base = createFakeRepository(teamFacts());
    const insertMissing = vi.fn<DiscordCodeRepository["insertMissing"]>(base.insertMissing);
    const router = createRouter({ ...base, insertMissing });
    const { context } = createTestContext();

    const first = await call(router.getOrCreate, {}, { context });
    const second = await call(router.getOrCreate, {}, { context });

    expect(second).toStrictEqual(first);
    expect(insertMissing).toHaveBeenCalledOnce();
  });

  it("only generates codes for participants that lack one", async () => {
    const router = createRouter(
      createFakeRepository(
        teamFacts({ participants: [participant(1, { code: "ABCD2345" }), participant(2)] }),
      ),
    );
    const { context } = createTestContext();

    const result = await call(router.getOrCreate, {}, { context });

    expect(result[0]?.code).toBe("ABCD2345");
    expect(result[1]?.code).toMatch(CODE_PATTERN);
  });

  it("reports how many times each code has been redeemed", async () => {
    const redeemed = new Date("2026-09-21T00:00:00.000Z");
    const router = createRouter(
      createFakeRepository(
        teamFacts({
          participants: [
            participant(1, { code: "AAAAAAA2" }),
            participant(2, { code: "AAAAAAA3", redeemedAt: redeemed }),
            participant(3, { altRedeemedAt: redeemed, code: "AAAAAAA4", redeemedAt: redeemed }),
          ],
        }),
      ),
    );
    const { context } = createTestContext();

    const result = await call(router.getOrCreate, {}, { context });

    expect(result.map((entry) => entry.status)).toStrictEqual([
      "NOT_REDEEMED",
      "REDEEMED_ONCE",
      "REDEEMED_TWICE",
    ]);
  });

  it("retries when a generated code collides with an existing one", async () => {
    const base = createFakeRepository(teamFacts());
    let calls = 0;
    const router = createRouter({
      ...base,
      insertMissing: async (rows) => {
        calls += 1;
        // First attempt: the table rejects every row (code collision), nothing lands.
        if (calls > 1) {
          await base.insertMissing(rows);
        }
      },
    });
    const { context } = createTestContext();

    const result = await call(router.getOrCreate, {}, { context });

    expect(calls).toBe(2);
    expect(result.map((entry) => entry.status)).toStrictEqual(["NOT_REDEEMED", "NOT_REDEEMED"]);
  });

  it("fails with a repository error when codes never land", async () => {
    const router = createRouter({
      ...createFakeRepository(teamFacts()),
      insertMissing: async () => {
        await Promise.resolve();
      },
    });
    const { context } = createTestContext();

    await expect(call(router.getOrCreate, {}, { context })).rejects.toMatchObject({
      code: "DISCORD_CODES_REPOSITORY_ERROR",
      status: 500,
    });
  });

  it.each([
    ["unjudged award", teamFacts({ award: "NO_ACHIEVEMENT" })],
    ["registration failed award", teamFacts({ award: "REGISTRATION_FAILED" })],
    ["registration review pending", teamFacts({ reviewStatus: "PENDING_REVIEW" })],
    ["registration review changes requested", teamFacts({ reviewStatus: "CHANGES_REQUESTED" })],
    ["no registration review", teamFacts({ reviewStatus: null })],
  ])("rejects a team with %s without generating codes", async (_label, facts) => {
    const base = createFakeRepository(facts);
    const insertMissing = vi.fn<DiscordCodeRepository["insertMissing"]>(base.insertMissing);
    const router = createRouter({ ...base, insertMissing });
    const { context } = createTestContext();

    await expect(call(router.getOrCreate, {}, { context })).rejects.toMatchObject({
      code: "DISCORD_CODES_TEAM_NOT_ELIGIBLE",
      status: 403,
    });
    expect(insertMissing).not.toHaveBeenCalled();
  });

  it("keeps codes available to teams that advanced past round 1", async () => {
    const router = createRouter(createFakeRepository(teamFacts({ award: "ROUND_1_COMPLETED" })));
    const { context } = createTestContext();

    await expect(call(router.getOrCreate, {}, { context })).resolves.toHaveLength(2);
  });

  it("returns not found when the user has no team", async () => {
    const router = createRouter(createFakeRepository(null));
    const { context } = createTestContext();

    await expect(call(router.getOrCreate, {}, { context })).rejects.toMatchObject({
      code: "TEAM_NOT_FOUND",
      status: 404,
    });
  });

  it("requires a signed-in user", async () => {
    const router = createRouter(createFakeRepository(teamFacts()), createTestAuthReader(null));
    const { context } = createTestContext();

    await expect(call(router.getOrCreate, {}, { context })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  describe("staff view", () => {
    it("lists participants without codes as NOT_GENERATED and never generates", async () => {
      const base = createFakeRepository(
        teamFacts({ participants: [participant(1, { code: "ABCD2345" }), participant(2)] }),
      );
      const insertMissing = vi.fn<DiscordCodeRepository["insertMissing"]>(base.insertMissing);
      const router = createRouter({ ...base, insertMissing }, staffAuth());
      const { context } = createTestContext();

      const result = await call(router.getByTeamId, { teamId: TEAM_ID }, { context });

      expect(result.map((entry) => [entry.code, entry.status])).toStrictEqual([
        ["ABCD2345", "NOT_REDEEMED"],
        [null, "NOT_GENERATED"],
      ]);
      expect(insertMissing).not.toHaveBeenCalled();
    });

    it("applies the same eligibility gate", async () => {
      const router = createRouter(
        createFakeRepository(teamFacts({ award: "REGISTRATION_FAILED" })),
        staffAuth(),
      );
      const { context } = createTestContext();

      await expect(
        call(router.getByTeamId, { teamId: TEAM_ID }, { context }),
      ).rejects.toMatchObject({ code: "DISCORD_CODES_TEAM_NOT_ELIGIBLE", status: 403 });
    });

    it("is closed to ordinary users", async () => {
      const router = createRouter(createFakeRepository(teamFacts()));
      const { context } = createTestContext();

      await expect(
        call(router.getByTeamId, { teamId: TEAM_ID }, { context }),
      ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    });
  });
});
