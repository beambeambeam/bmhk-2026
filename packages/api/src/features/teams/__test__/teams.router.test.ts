import { call } from "@orpc/server";
import { describe, expect, it } from "vitest";

import type { AuthReader, Team, TeamAward, TeamRepository } from "../../../index";
import { createAppRouter } from "../../../index";
import {
  createTestAuthReader as createAuthReader,
  createTestContext as createContext,
  createUnusedFileRepository,
} from "../../../__test__/test-support";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";

const expectedAwards = [
  "NO_ACHIEVEMENT",
  "ROUND_1_COMPLETED",
  "ROUND_2_COMPLETED",
  "HONORABLE_MENTION",
  "THIRD_PLACE",
  "SECOND_PLACE",
  "FIRST_PLACE",
] as const satisfies readonly TeamAward[];

const testTeam = {
  award: "NO_ACHIEVEMENT",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  id: TEAM_ID,
  image: null,
  index: 1,
  memberCount: 0,
  name: "Team One",
  school: "Test School",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  userId: USER_ID,
} satisfies Team;

function createTeamRepository(overrides: Partial<TeamRepository> = {}): TeamRepository {
  return {
    create:
      overrides.create ??
      (async (userId, data) => await Promise.resolve({ ...testTeam, ...data, userId })),
    delete: overrides.delete ?? (async () => await Promise.resolve(true)),
    deleteFile: overrides.deleteFile ?? (async () => await Promise.resolve(true)),
    findById: overrides.findById ?? (async () => await Promise.resolve(testTeam)),
    findByUserId: overrides.findByUserId ?? (async () => await Promise.resolve(null)),
    list: overrides.list ?? (async () => await Promise.resolve({ data: [testTeam], total: 1 })),
    replaceImage:
      overrides.replaceImage ??
      (async (_userId, _id, file) =>
        await Promise.resolve({ previous: null, team: { ...testTeam, image: file.id } })),
    update:
      overrides.update ??
      (async (_userId, _id, data) => await Promise.resolve({ ...testTeam, ...data })),
  };
}

function createRouter(repository: TeamRepository, auth: AuthReader = createAuthReader()) {
  return createAppRouter({ auth, files: createUnusedFileRepository(), teams: repository });
}

describe("teams router", () => {
  it("requires authentication before creating a team", async () => {
    const repository = createTeamRepository();
    const router = createRouter(
      repository,
      createAuthReader(async () => await Promise.resolve(null)),
    );
    const { context } = createContext();

    await expect(
      call(
        router.teams.create,
        {
          name: "Team One",
          school: "Test School",
        },
        { context, path: ["teams", "create"] },
      ),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });

  it("creates a team for the authenticated owner with defaults", async () => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(
        router.teams.create,
        {
          name: " Team One ",
          school: " Test School ",
        },
        { context, path: ["teams", "create"] },
      ),
    ).resolves.toStrictEqual(testTeam);
  });

  it("rejects creating a second team for the same user", async () => {
    async function findByUserId(): Promise<Team | null> {
      return await Promise.resolve(testTeam);
    }

    const repository = createTeamRepository({ findByUserId });
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(
        router.teams.create,
        { name: "Team Two", school: "Test School" },
        { context, path: ["teams", "create"] },
      ),
    ).rejects.toMatchObject({
      code: "TEAM_ALREADY_EXISTS",
      message: "User already owns a team",
      status: 409,
    });
  });

  it("allows creating a team after deleting the existing team", async () => {
    let existingTeam: Team | null = testTeam;
    const repository = createTeamRepository({
      create: async (userId, data) => await Promise.resolve({ ...testTeam, ...data, userId }),
      delete: async () => {
        existingTeam = null;
        return await Promise.resolve(true);
      },
      findByUserId: async () => await Promise.resolve(existingTeam),
    });
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(router.teams.delete, { id: TEAM_ID }, { context, path: ["teams", "delete"] }),
    ).resolves.toStrictEqual({ id: TEAM_ID });
    await expect(
      call(
        router.teams.create,
        { name: "Replacement Team", school: "Test School" },
        { context, path: ["teams", "create"] },
      ),
    ).resolves.toMatchObject({ name: "Replacement Team", school: "Test School" });
  });

  it.each(expectedAwards)("accepts the %s award when creating a team", async (award) => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(
        router.teams.create,
        {
          award,
          name: "Team One",
          school: "Test School",
        },
        { context, path: ["teams", "create"] },
      ),
    ).resolves.toMatchObject({ award });
  });

  it("rejects an arbitrary award when creating a team", async () => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(
        router.teams.create,
        // @ts-expect-error -- verifies runtime rejection outside the award enum
        { award: "BEST_TEAM", name: "Team", school: "School" },
        { context, path: ["teams", "create"] },
      ),
    ).rejects.toBeInstanceOf(Error);
  });

  it.each([
    {
      input: { memberCount: -1, name: "Team", school: "School" },
      name: "negative member count",
    },
    {
      input: { memberCount: 1.5, name: "Team", school: "School" },
      name: "noninteger member count",
    },
    {
      input: { name: "", school: "School" },
      name: "empty name",
    },
  ])("rejects invalid create input: $name", async ({ input }) => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(router.teams.create, input, {
        context,
        path: ["teams", "create"],
      }),
    ).rejects.toBeInstanceOf(Error);
  });

  it("rejects unknown create fields", async () => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(
        router.teams.create,
        {
          name: "Team",
          school: "School",
          // @ts-expect-error -- verifies strict runtime rejection of unknown fields
          unknown: true,
        },
        { context, path: ["teams", "create"] },
      ),
    ).rejects.toBeInstanceOf(Error);
  });

  it.each([
    {
      expected: {
        currentPage: 1,
        limit: 25,
        nextOffset: 25,
        offset: 0,
        previousOffset: null,
        total: 60,
        totalPages: 3,
      },
      input: {},
      total: 60,
    },
    {
      expected: {
        currentPage: 2,
        limit: 25,
        nextOffset: 50,
        offset: 25,
        previousOffset: 0,
        total: 60,
        totalPages: 3,
      },
      input: { limit: 25, offset: 25 },
      total: 60,
    },
    {
      expected: {
        currentPage: 3,
        limit: 25,
        nextOffset: null,
        offset: 50,
        previousOffset: 25,
        total: 60,
        totalPages: 3,
      },
      input: { limit: 25, offset: 50 },
      total: 60,
    },
    {
      expected: {
        currentPage: 1,
        limit: 25,
        nextOffset: null,
        offset: 0,
        previousOffset: null,
        total: 0,
        totalPages: 0,
      },
      input: {},
      total: 0,
    },
    {
      expected: {
        currentPage: 5,
        limit: 25,
        nextOffset: null,
        offset: 100,
        previousOffset: 75,
        total: 60,
        totalPages: 3,
      },
      input: { limit: 25, offset: 100 },
      total: 60,
    },
  ])("returns owner-scoped pagination metadata", async ({ expected, input, total }) => {
    async function list(
      _userId: string,
      _pagination: { limit: number; offset: number },
    ): Promise<{ data: Team[]; total: number }> {
      return await Promise.resolve({ data: total > 0 ? [testTeam] : [], total });
    }

    const repository = createTeamRepository({ list });
    const router = createRouter(repository);
    const { context } = createContext();

    const result = await call(router.teams.list, input, {
      context,
      path: ["teams", "list"],
    });

    expect(result.pagination).toStrictEqual(expected);
  });

  it("rejects malformed list output", async () => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const malformedTeam = { ...testTeam, id: "not-a-uuid" } as unknown as Team;
    async function list(
      _userId: string,
      _pagination: { limit: number; offset: number },
    ): Promise<{ data: Team[]; total: number }> {
      return await Promise.resolve({ data: [malformedTeam], total: 1 });
    }

    const repository = createTeamRepository({ list });
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(router.teams.list, {}, { context, path: ["teams", "list"] }),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Output validation failed",
    });
  });

  it("gets an owned team", async () => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(router.teams.get, { id: TEAM_ID }, { context, path: ["teams", "get"] }),
    ).resolves.toStrictEqual(testTeam);
  });

  it("rejects an invalid team ID before getting", async () => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(router.teams.get, { id: "not-a-uuid" }, { context, path: ["teams", "get"] }),
    ).rejects.toBeInstanceOf(Error);
  });

  it("rejects malformed team output", async () => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const malformedTeam = { ...testTeam, id: "not-a-uuid" } as unknown as Team;
    async function findById(_userId: string, _id: string): Promise<Team | null> {
      return await Promise.resolve(malformedTeam);
    }

    const repository = createTeamRepository({ findById });
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(router.teams.get, { id: TEAM_ID }, { context, path: ["teams", "get"] }),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Output validation failed",
    });
  });

  it("rejects an invalid team ID before updating", async () => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(
        router.teams.update,
        { data: { name: "Team" }, id: "not-a-uuid" },
        { context, path: ["teams", "update"] },
      ),
    ).rejects.toBeInstanceOf(Error);
  });

  it.each([
    { name: "missing", team: null },
    { name: "foreign-owned", team: { ...testTeam, userId: "other-user" } },
  ])("returns the same not-found error for a $name team", async ({ team }) => {
    const repository = createTeamRepository({
      findById: async (userId) => await Promise.resolve(team?.userId === userId ? team : null),
    });
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(router.teams.get, { id: TEAM_ID }, { context, path: ["teams", "get"] }),
    ).rejects.toMatchObject({
      code: "TEAM_NOT_FOUND",
      message: "Team not found",
      status: 404,
    });
  });

  it("updates writable team fields for the owner", async () => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(
        router.teams.update,
        {
          data: { memberCount: 12, name: " Updated Team " },
          id: TEAM_ID,
        },
        { context, path: ["teams", "update"] },
      ),
    ).resolves.toMatchObject({
      memberCount: 12,
      name: "Updated Team",
    });
  });

  it.each(expectedAwards)("updates an owned team to the %s award", async (award) => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(
        router.teams.update,
        { data: { award }, id: TEAM_ID },
        { context, path: ["teams", "update"] },
      ),
    ).resolves.toMatchObject({ award });
  });

  it("rejects empty and immutable update data", async () => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(router.teams.update, { data: {}, id: TEAM_ID }, { context, path: ["teams", "update"] }),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      call(
        router.teams.update,
        // @ts-expect-error -- verifies strict runtime rejection of immutable fields
        { data: { userId: "other-user" }, id: TEAM_ID },
        { context, path: ["teams", "update"] },
      ),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      call(
        router.teams.update,
        // @ts-expect-error -- verifies runtime rejection outside the award enum
        { data: { award: "BEST_TEAM" }, id: TEAM_ID },
        { context, path: ["teams", "update"] },
      ),
    ).rejects.toBeInstanceOf(Error);
  });

  it("rejects immutable database fields in updates", async () => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(
        router.teams.update,
        {
          data: {
            // @ts-expect-error -- verifies strict runtime rejection of immutable fields
            createdAt: new Date(),
          },
          id: TEAM_ID,
        },
        { context, path: ["teams", "update"] },
      ),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      call(
        router.teams.update,
        {
          data: {
            // @ts-expect-error -- verifies strict runtime rejection of immutable fields
            index: 2,
          },
          id: TEAM_ID,
        },
        { context, path: ["teams", "update"] },
      ),
    ).rejects.toBeInstanceOf(Error);
  });

  it("returns not found when an owned team cannot be updated", async () => {
    const repository = createTeamRepository({
      update: async () => await Promise.resolve(null),
    });
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(
        router.teams.update,
        { data: { name: "Updated Team" }, id: TEAM_ID },
        { context, path: ["teams", "update"] },
      ),
    ).rejects.toMatchObject({
      code: "TEAM_NOT_FOUND",
      status: 404,
    });
  });

  it("deletes an owned team", async () => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(router.teams.delete, { id: TEAM_ID }, { context, path: ["teams", "delete"] }),
    ).resolves.toStrictEqual({ id: TEAM_ID });
  });

  it("rejects an invalid team ID before deleting", async () => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(router.teams.delete, { id: "not-a-uuid" }, { context, path: ["teams", "delete"] }),
    ).rejects.toBeInstanceOf(Error);
  });

  it("returns not found when an owned team cannot be deleted", async () => {
    const repository = createTeamRepository({
      delete: async () => await Promise.resolve(false),
    });
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(router.teams.delete, { id: TEAM_ID }, { context, path: ["teams", "delete"] }),
    ).rejects.toMatchObject({
      code: "TEAM_NOT_FOUND",
      status: 404,
    });
  });
});
