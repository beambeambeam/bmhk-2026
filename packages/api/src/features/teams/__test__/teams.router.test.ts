import { teamAwardValues } from "@bmhk-2026/db/schema/teams";
import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type { ApiContext, ApiSession, AuthReader, Team, TeamRepository } from "../../../index";
import { createAppRouter } from "../../../index";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";

const testSession = {
  session: {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    expiresAt: new Date("2026-02-01T00:00:00.000Z"),
    id: "session-1",
    impersonatedBy: null,
    token: "test-token",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    userId: USER_ID,
  },
  user: {
    banExpires: null,
    banReason: null,
    banned: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    displayUsername: "TestUser",
    email: "user@example.com",
    emailVerified: true,
    id: USER_ID,
    image: null,
    name: "Test User",
    role: "user",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    username: "testuser",
  },
} satisfies ApiSession;

const testTeam = {
  award: "NO_ACHIEVEMENT",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  id: TEAM_ID,
  index: 1,
  memberCount: 0,
  name: "Team One",
  school: "Test School",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  userId: USER_ID,
} satisfies Team;

function createTestLogger() {
  const audit = Object.assign(vi.fn<(...args: never[]) => void>(), {
    deny: vi.fn<(...args: never[]) => void>(),
  });

  return {
    audit,
    emit: vi.fn<() => null>(() => null),
    error: vi.fn<(...args: never[]) => void>(),
    getContext: vi.fn<() => Record<string, unknown>>(() => ({})),
    info: vi.fn<(...args: never[]) => void>(),
    set: vi.fn<(...args: never[]) => void>(),
    setLevel: vi.fn<(...args: never[]) => void>(),
    warn: vi.fn<(...args: never[]) => void>(),
  };
}

function createContext() {
  const log = createTestLogger();

  return {
    context: {
      headers: new Headers(),
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      log: log as unknown as ApiContext["log"],
    } satisfies ApiContext,
    log,
  };
}

function createAuthReader(
  getSession: AuthReader["getSession"] = async () => await Promise.resolve(testSession),
): AuthReader {
  return {
    getSession: vi.fn<AuthReader["getSession"]>(getSession),
  };
}

function createTeamRepository(overrides: Partial<TeamRepository> = {}): TeamRepository {
  return {
    create:
      overrides.create ??
      vi.fn<TeamRepository["create"]>(
        async (userId, data) => await Promise.resolve({ ...testTeam, ...data, userId }),
      ),
    delete:
      overrides.delete ?? vi.fn<TeamRepository["delete"]>(async () => await Promise.resolve(true)),
    findById:
      overrides.findById ??
      vi.fn<TeamRepository["findById"]>(async () => await Promise.resolve(testTeam)),
    findByUserId:
      overrides.findByUserId ??
      vi.fn<TeamRepository["findByUserId"]>(async () => await Promise.resolve(null)),
    list:
      overrides.list ??
      vi.fn<TeamRepository["list"]>(
        async () => await Promise.resolve({ data: [testTeam], total: 1 }),
      ),
    update:
      overrides.update ??
      vi.fn<TeamRepository["update"]>(
        async (_userId, _id, data) => await Promise.resolve({ ...testTeam, ...data }),
      ),
  };
}

function createRouter(repository: TeamRepository, auth: AuthReader = createAuthReader()) {
  return createAppRouter({ auth, teams: repository });
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
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("creates a team for the authenticated owner with defaults", async () => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context, log } = createContext();

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
    expect(repository.create).toHaveBeenCalledWith(USER_ID, {
      award: "NO_ACHIEVEMENT",
      memberCount: 0,
      name: "Team One",
      school: "Test School",
    });
    expect(log.set).toHaveBeenCalledWith({ team: { id: TEAM_ID } });
  });

  it("rejects creating a second team for the same user", async () => {
    const findByUserId = vi.fn<TeamRepository["findByUserId"]>(
      async () => await Promise.resolve(testTeam),
    );
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
    expect(findByUserId).toHaveBeenCalledWith(USER_ID);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("allows creating a team after deleting the existing team", async () => {
    let existingTeam: Team | null = testTeam;
    const repository = createTeamRepository({
      create: vi.fn<TeamRepository["create"]>(async () => await Promise.resolve(testTeam)),
      delete: vi.fn<TeamRepository["delete"]>(async () => {
        existingTeam = null;
        return await Promise.resolve(true);
      }),
      findByUserId: vi.fn<TeamRepository["findByUserId"]>(
        async () => await Promise.resolve(existingTeam),
      ),
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
    ).resolves.toStrictEqual(testTeam);
    expect(repository.create).toHaveBeenCalledOnce();
  });

  it.each(teamAwardValues)("accepts the %s award when creating a team", async (award) => {
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
    expect(repository.create).toHaveBeenCalledWith(USER_ID, {
      award,
      memberCount: 0,
      name: "Team One",
      school: "Test School",
    });
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
    expect(repository.create).not.toHaveBeenCalled();
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
    expect(repository.create).not.toHaveBeenCalled();
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
    expect(repository.create).not.toHaveBeenCalled();
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
    const list = vi.fn<TeamRepository["list"]>(
      async () => await Promise.resolve({ data: total > 0 ? [testTeam] : [], total }),
    );
    const repository = createTeamRepository({ list });
    const router = createRouter(repository);
    const { context } = createContext();

    const result = await call(router.teams.list, input, {
      context,
      path: ["teams", "list"],
    });

    expect(result.pagination).toStrictEqual(expected);
    expect(list).toHaveBeenCalledWith(USER_ID, {
      limit: expected.limit,
      offset: expected.offset,
    });
  });

  it("rejects malformed list output", async () => {
    const list = vi.fn<TeamRepository["list"]>(
      async () =>
        await Promise.resolve({
          data: [{ ...testTeam, id: "not-a-uuid" }],
          total: 1,
        }),
    );
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
    expect(repository.findById).toHaveBeenCalledWith(USER_ID, TEAM_ID);
  });

  it("rejects an invalid team ID before getting", async () => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(router.teams.get, { id: "not-a-uuid" }, { context, path: ["teams", "get"] }),
    ).rejects.toBeInstanceOf(Error);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it("rejects malformed team output", async () => {
    const findById = vi.fn<TeamRepository["findById"]>(
      async () => await Promise.resolve({ ...testTeam, id: "not-a-uuid" }),
    );
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
    expect(repository.update).not.toHaveBeenCalled();
  });

  it.each(["missing", "foreign-owned"])(
    "returns the same not-found error for a %s team",
    async () => {
      const repository = createTeamRepository({
        findById: vi.fn<TeamRepository["findById"]>(async () => await Promise.resolve(null)),
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
    },
  );

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
    expect(repository.update).toHaveBeenCalledWith(USER_ID, TEAM_ID, {
      memberCount: 12,
      name: "Updated Team",
    });
  });

  it.each(teamAwardValues)("updates an owned team to the %s award", async (award) => {
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
    expect(repository.update).toHaveBeenCalledWith(USER_ID, TEAM_ID, { award });
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
    expect(repository.update).not.toHaveBeenCalled();
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
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("returns not found when an owned team cannot be updated", async () => {
    const repository = createTeamRepository({
      update: vi.fn<TeamRepository["update"]>(async () => await Promise.resolve(null)),
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
    expect(repository.delete).toHaveBeenCalledWith(USER_ID, TEAM_ID);
  });

  it("rejects an invalid team ID before deleting", async () => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(router.teams.delete, { id: "not-a-uuid" }, { context, path: ["teams", "delete"] }),
    ).rejects.toBeInstanceOf(Error);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("returns not found when an owned team cannot be deleted", async () => {
    const repository = createTeamRepository({
      delete: vi.fn<TeamRepository["delete"]>(async () => await Promise.resolve(false)),
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
