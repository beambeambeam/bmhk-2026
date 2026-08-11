import { call } from "@orpc/server";
import type { DeleteObjectInput, GetPresignedInput, PutObjectInput } from "@bmhk-2026/s3";
import { describe, expect, it, vi } from "vitest";

import type {
  AuthReader,
  FileRepository,
  StoredFile,
  Team,
  TeamAccessContext,
  TeamAward,
  TeamRepository,
} from "../../../index";
import { createAppRouter } from "../../../index";
import type { TeamWithStoredImage } from "../teams.repository";
import {
  createTestAuthReader as createAuthReader,
  createTestContext as createContext,
  createTestSession,
  createUnusedFileRepository,
} from "../../../__test__/test-support";

const s3Mocks = vi.hoisted(() => ({
  deleteObject: vi.fn<(input: DeleteObjectInput) => Promise<void>>(async () => {
    await Promise.resolve();
  }),
  getPresigned: vi.fn<(input: GetPresignedInput) => Promise<string>>(
    async () => await Promise.resolve("https://storage.test/team-image"),
  ),
  putObject: vi.fn<(input: PutObjectInput) => Promise<void>>(async () => {
    await Promise.resolve();
  }),
}));

vi.mock(import("@bmhk-2026/s3"), () => s3Mocks);

const { deleteObject, getPresigned } = s3Mocks;

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

const testImage: StoredFile = {
  bucket: "uploads",
  contentType: "image/png",
  id: "22222222-2222-4222-8222-222222222222",
  objectKey: `teams/${TEAM_ID}/images/22222222-2222-4222-8222-222222222222`,
  originalName: "team.png",
  sizeBytes: 12,
  uploadedAt: new Date("2026-01-02T00:00:00.000Z"),
  uploadedBy: USER_ID,
};

function createTeamRepository(overrides: Partial<TeamRepository> = {}): TeamRepository {
  return {
    create:
      overrides.create ??
      (async (userId, data) => await Promise.resolve({ ...testTeam, ...data, userId })),
    delete: overrides.delete ?? (async () => await Promise.resolve(true)),
    findById: overrides.findById ?? (async () => await Promise.resolve(testTeam)),
    findByUserId: overrides.findByUserId ?? (async () => await Promise.resolve(null)),
    list: overrides.list ?? (async () => await Promise.resolve({ data: [testTeam], total: 1 })),
    replaceImage:
      overrides.replaceImage ??
      (async (_userId, _id, file) =>
        await Promise.resolve({ previous: null, team: { ...testTeam, image: file.id } })),
    setAward:
      overrides.setAward ??
      (async (_access, _id, award) =>
        await Promise.resolve({
          previous: testTeam,
          team: { ...testTeam, award },
        })),
    update:
      overrides.update ??
      (async (_userId, _id, data) => await Promise.resolve({ ...testTeam, ...data })),
  };
}

function createRouter(
  repository: TeamRepository,
  auth: AuthReader = createAuthReader(),
  fileRepository: FileRepository = createUnusedFileRepository(),
) {
  return createAppRouter({ auth, files: fileRepository, teams: repository });
}

function createRegistrationAuthReader(): AuthReader {
  return createAuthReader(createTestSession({ user: { role: "registrationStaff" } }));
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

  it.each(expectedAwards)(
    "rejects staff-controlled %s award when creating a team",
    async (award) => {
      const repository = createTeamRepository();
      const router = createRouter(repository);
      const { context } = createContext();

      await expect(
        call(
          router.teams.create,
          {
            // @ts-expect-error -- award is controlled by registration staff
            award,
            name: "Team One",
            school: "Test School",
          },
          { context, path: ["teams", "create"] },
        ),
      ).rejects.toBeInstanceOf(Error);
    },
  );

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
  ])("returns registration-team pagination metadata", async ({ expected, input, total }) => {
    async function list(
      _access: TeamAccessContext,
      _pagination: { limit: number; offset: number },
    ): Promise<{ data: Team[]; total: number }> {
      return await Promise.resolve({ data: total > 0 ? [testTeam] : [], total });
    }

    const repository = createTeamRepository({ list });
    const router = createRouter(repository, createRegistrationAuthReader());
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
      _access: TeamAccessContext,
      _pagination: { limit: number; offset: number },
    ): Promise<{ data: Team[]; total: number }> {
      return await Promise.resolve({ data: [malformedTeam], total: 1 });
    }

    const repository = createTeamRepository({ list });
    const router = createRouter(repository, createRegistrationAuthReader());
    const { context } = createContext();

    await expect(
      call(router.teams.list, {}, { context, path: ["teams", "list"] }),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Output validation failed",
    });
  });

  it("requires registration permission to list teams", async () => {
    const router = createRouter(
      createTeamRepository(),
      createAuthReader(createTestSession({ user: { role: "staff" } })),
    );
    const { context, log } = createContext();

    await expect(
      call(router.teams.list, {}, { context, path: ["teams", "list"] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(log.audit.deny).toHaveBeenCalledWith("registration access permission missing", {
      action: "registration.access",
      actor: { id: USER_ID, type: "user" },
    });
  });

  it("gets an owned team", async () => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();
    getPresigned.mockClear();

    await expect(
      call(router.teams.get, { id: TEAM_ID }, { context, path: ["teams", "get"] }),
    ).resolves.toStrictEqual(testTeam);
    expect(getPresigned).not.toHaveBeenCalled();
  });

  it("gives registration staff cross-team access", async () => {
    const repository = createTeamRepository({
      findById: async (access) => {
        expect(access).toStrictEqual({ actorId: "staff-user", scope: "ALL_TEAMS" });
        return await Promise.resolve(testTeam);
      },
    });
    const router = createRouter(
      repository,
      createAuthReader(
        createTestSession({ user: { id: "staff-user", role: "registrationStaff" } }),
      ),
    );
    const { context } = createContext();

    await expect(
      call(router.teams.get, { id: TEAM_ID }, { context, path: ["teams", "get"] }),
    ).resolves.toMatchObject({ id: TEAM_ID });
  });

  it("returns an owned team with public image metadata and URL", async () => {
    const repository = createTeamRepository({
      findById: async () => await Promise.resolve({ ...testTeam, image: testImage }),
    });
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(router.teams.get, { id: TEAM_ID }, { context, path: ["teams", "get"] }),
    ).resolves.toStrictEqual({
      ...testTeam,
      image: {
        contentType: "image/png",
        id: testImage.id,
        originalName: "team.png",
        sizeBytes: 12,
        uploadedAt: new Date("2026-01-02T00:00:00.000Z"),
        url: "https://storage.test/team-image",
      },
    });
    expect(getPresigned).toHaveBeenCalledWith({
      bucket: "uploads",
      contentType: "image/png",
      key: testImage.objectKey,
      method: "GET",
      originalName: "team.png",
    });
  });

  it("returns storage unavailable when team image URL signing fails", async () => {
    const repository = createTeamRepository({
      findById: async () => await Promise.resolve({ ...testTeam, image: testImage }),
    });
    const router = createRouter(repository);
    const { context } = createContext();
    getPresigned.mockRejectedValueOnce(new Error("signer offline"));

    await expect(
      call(router.teams.get, { id: TEAM_ID }, { context, path: ["teams", "get"] }),
    ).rejects.toMatchObject({ code: "FILE_STORAGE_UNAVAILABLE", status: 503 });
  });

  it("deletes an uploaded image when the team disappears before replacement", async () => {
    const repository = createTeamRepository({
      replaceImage: async () => await Promise.resolve(null),
    });
    const router = createRouter(repository);
    const { context } = createContext();
    const image = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1])], "team.png", {
      type: "image/png",
    });
    deleteObject.mockClear();

    await expect(
      call(router.teams.image, { file: image, id: TEAM_ID }, { context, path: ["teams", "image"] }),
    ).rejects.toMatchObject({ code: "TEAM_NOT_FOUND", status: 404 });
    const deleteInput = deleteObject.mock.calls[0]?.[0];
    expect(deleteInput?.bucket).toBe("uploads");
    expect(deleteInput?.key).toMatch(new RegExp(`^teams/${TEAM_ID}/images/[0-9a-f-]{36}$`, "u"));
  });

  it("logs rollback failure without hiding the team replacement error", async () => {
    const repository = createTeamRepository({
      replaceImage: async () => await Promise.resolve(null),
    });
    const router = createRouter(repository);
    const { context, log } = createContext();
    const image = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1])], "team.png", {
      type: "image/png",
    });
    const cleanupError = new Error("storage cleanup failed");
    deleteObject.mockRejectedValueOnce(cleanupError);

    await expect(
      call(router.teams.image, { file: image, id: TEAM_ID }, { context, path: ["teams", "image"] }),
    ).rejects.toMatchObject({ code: "TEAM_NOT_FOUND", status: 404 });
    const rollbackLog = log.set.mock.calls
      .map(([entry]) => entry)
      .find((entry) => entry.event === "file.upload.rollback_failed");
    expect(rollbackLog).toMatchObject({
      event: "file.upload.rollback_failed",
      file: { bucket: "uploads" },
    });
    expect(log.error).toHaveBeenCalledWith(cleanupError);
  });

  it("deletes the previous image after a successful replacement", async () => {
    const repository = createTeamRepository({
      replaceImage: async (_userId, _id, file) =>
        await Promise.resolve({
          previous: testImage,
          team: { ...testTeam, image: file.id },
        }),
    });
    const deleteMetadata = vi.fn<FileRepository["deleteById"]>(
      async () => await Promise.resolve(true),
    );
    const fileRepository = { ...createUnusedFileRepository(), deleteById: deleteMetadata };
    const router = createRouter(repository, createAuthReader(), fileRepository);
    const { context } = createContext();
    const image = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1])], "team.png", {
      type: "image/png",
    });
    deleteObject.mockClear();

    await expect(
      call(router.teams.image, { file: image, id: TEAM_ID }, { context, path: ["teams", "image"] }),
    ).resolves.toMatchObject({ id: TEAM_ID });
    expect(deleteObject).toHaveBeenCalledWith({
      bucket: testImage.bucket,
      key: testImage.objectKey,
    });
    expect(deleteMetadata).toHaveBeenCalledWith(testImage.id);
  });

  it("cleans up an owner-uploaded image replaced by registration staff", async () => {
    const repository = createTeamRepository({
      replaceImage: async (_access, _id, file) =>
        await Promise.resolve({
          previous: testImage,
          team: { ...testTeam, image: file.id },
        }),
    });
    const deleteMetadata = vi.fn<FileRepository["deleteById"]>(
      async () => await Promise.resolve(true),
    );
    const fileRepository = { ...createUnusedFileRepository(), deleteById: deleteMetadata };
    const router = createRouter(
      repository,
      createAuthReader(
        createTestSession({ user: { id: "staff-user", role: "registrationStaff" } }),
      ),
      fileRepository,
    );
    const { context } = createContext();
    const image = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1])], "team.png", {
      type: "image/png",
    });

    await expect(
      call(router.teams.image, { file: image, id: TEAM_ID }, { context, path: ["teams", "image"] }),
    ).resolves.toMatchObject({ id: TEAM_ID });
    expect(deleteMetadata).toHaveBeenCalledWith(testImage.id);
  });

  it("keeps a successful image replacement when old-image cleanup fails", async () => {
    const repository = createTeamRepository({
      replaceImage: async (_userId, _id, file) =>
        await Promise.resolve({
          previous: testImage,
          team: { ...testTeam, image: file.id },
        }),
    });
    const deleteMetadata = vi.fn<FileRepository["deleteById"]>(
      async () => await Promise.resolve(true),
    );
    const fileRepository = { ...createUnusedFileRepository(), deleteById: deleteMetadata };
    const router = createRouter(repository, createAuthReader(), fileRepository);
    const { context, log } = createContext();
    const image = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1])], "team.png", {
      type: "image/png",
    });
    const cleanupError = new Error("storage cleanup failed");
    deleteObject.mockRejectedValueOnce(cleanupError);

    await expect(
      call(router.teams.image, { file: image, id: TEAM_ID }, { context, path: ["teams", "image"] }),
    ).resolves.toMatchObject({ id: TEAM_ID });
    expect(deleteMetadata).not.toHaveBeenCalled();
    expect(log.set).toHaveBeenCalledWith({
      event: "file.replacement.cleanup_failed",
      file: {
        bucket: testImage.bucket,
        id: testImage.id,
        objectKey: testImage.objectKey,
      },
    });
    expect(log.error).toHaveBeenCalledWith(cleanupError);
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
    const malformedTeam = { ...testTeam, id: "not-a-uuid" } as unknown as TeamWithStoredImage;
    async function findById(
      _access: TeamAccessContext,
      _id: string,
    ): Promise<TeamWithStoredImage | null> {
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
      findById: async (access) =>
        await Promise.resolve(
          team && (access.scope === "ALL_TEAMS" || team.userId === access.actorId)
            ? { ...team, image: null }
            : null,
        ),
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

  it("updates team fields for registration staff", async () => {
    const router = createRouter(createTeamRepository(), createRegistrationAuthReader());
    const { context } = createContext();

    await expect(
      call(
        router.teams.update,
        { data: { name: "Updated Team" }, id: TEAM_ID },
        { context, path: ["teams", "update"] },
      ),
    ).resolves.toMatchObject({ name: "Updated Team" });
  });

  it.each(expectedAwards)("rejects owner update to staff-controlled %s award", async (award) => {
    const repository = createTeamRepository();
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(
        router.teams.update,
        {
          // @ts-expect-error -- award is controlled by registration staff
          data: { award },
          id: TEAM_ID,
        },
        { context, path: ["teams", "update"] },
      ),
    ).rejects.toBeInstanceOf(Error);
  });

  it.each(expectedAwards)("lets registration staff set the %s award", async (award) => {
    const repository = createTeamRepository({
      setAward: async (access, _id, nextAward) => {
        expect(access).toStrictEqual({ actorId: USER_ID, scope: "ALL_TEAMS" });
        return await Promise.resolve({
          previous: testTeam,
          team: { ...testTeam, award: nextAward },
        });
      },
    });
    const router = createRouter(repository, createRegistrationAuthReader());
    const { context, log } = createContext();

    await expect(
      call(router.teams.setAward, { award, id: TEAM_ID }, { context, path: ["teams", "setAward"] }),
    ).resolves.toMatchObject({ award });
    expect(log.audit).toHaveBeenCalledWith({
      action: "team.award.changed",
      actor: { id: USER_ID, type: "user" },
      changes: {
        after: { award },
        before: { award: "NO_ACHIEVEMENT" },
      },
      outcome: "success",
      target: { id: TEAM_ID, teamId: TEAM_ID, type: "team" },
    });
  });

  it("audits a failed award change", async () => {
    const repository = createTeamRepository({
      setAward: async () => await Promise.resolve(null),
    });
    const router = createRouter(repository, createRegistrationAuthReader());
    const { context, log } = createContext();

    await expect(
      call(
        router.teams.setAward,
        { award: "FIRST_PLACE", id: TEAM_ID },
        { context, path: ["teams", "setAward"] },
      ),
    ).rejects.toMatchObject({ code: "TEAM_NOT_FOUND", status: 404 });
    expect(log.audit).toHaveBeenCalledWith({
      action: "team.award.changed",
      actor: { id: USER_ID, type: "user" },
      outcome: "failure",
      reason: "TEAM_NOT_FOUND",
      target: { id: TEAM_ID, teamId: TEAM_ID, type: "team" },
    });
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
    const { context, log } = createContext();

    await expect(
      call(router.teams.delete, { id: TEAM_ID }, { context, path: ["teams", "delete"] }),
    ).resolves.toStrictEqual({ id: TEAM_ID });
    expect(log.audit).toHaveBeenCalledWith({
      action: "team.deleted",
      actor: { id: USER_ID, type: "user" },
      outcome: "success",
      target: { id: TEAM_ID, teamId: TEAM_ID, type: "team" },
    });
  });

  it("does not let registration staff delete another user's team", async () => {
    const repository = createTeamRepository({
      delete: async (access) => {
        expect(access).toStrictEqual({ actorId: "staff-user", scope: "OWN_TEAM" });
        return await Promise.resolve(false);
      },
    });
    const router = createRouter(
      repository,
      createAuthReader(
        createTestSession({ user: { id: "staff-user", role: "registrationStaff" } }),
      ),
    );
    const { context, log } = createContext();

    await expect(
      call(router.teams.delete, { id: TEAM_ID }, { context, path: ["teams", "delete"] }),
    ).rejects.toMatchObject({ code: "TEAM_NOT_FOUND", status: 404 });
    expect(log.audit).toHaveBeenCalledWith({
      action: "team.deleted",
      actor: { id: "staff-user", type: "user" },
      outcome: "denied",
      reason: "TEAM_NOT_FOUND",
      target: { id: TEAM_ID, teamId: TEAM_ID, type: "team" },
    });
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
    const { context, log } = createContext();

    await expect(
      call(router.teams.delete, { id: TEAM_ID }, { context, path: ["teams", "delete"] }),
    ).rejects.toMatchObject({
      code: "TEAM_NOT_FOUND",
      status: 404,
    });
    expect(log.audit).toHaveBeenCalledWith({
      action: "team.deleted",
      actor: { id: USER_ID, type: "user" },
      outcome: "denied",
      reason: "TEAM_NOT_FOUND",
      target: { id: TEAM_ID, teamId: TEAM_ID, type: "team" },
    });
  });
});
