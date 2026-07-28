import { call } from "@orpc/server";
import type { DeleteObjectInput, GetPresignedInput, PutObjectInput } from "@bmhk-2026/s3";
import { describe, expect, it, vi } from "vitest";

import type { ApiContext, ApiSession, AuthReader } from "../../../index";
import { createProcedures } from "../../../core/procedure";
import { createFilesRouter } from "../files.router";
import type { FileRepository } from "../files.repository";
import type { StoredFile } from "../files.types";

vi.mock(import("@bmhk-2026/env/server"), () => ({
  env: {
    AWS_ACCESS_KEY_ID: "test-access-key",
    AWS_ENDPOINT_URL_S3: "http://localhost:9000",
    AWS_REGION: "us-east-1",
    AWS_S3_BUCKET: "uploads",
    AWS_SECRET_ACCESS_KEY: "test-secret-key",
    BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
    BETTER_AUTH_URL: "http://localhost:3000",
    CORS_ORIGIN: ["http://localhost:3001"],
    DATABASE_URL: "postgresql://localhost/test",
    NODE_ENV: "test" as const,
    PORT: 3000,
  },
}));

const s3Mocks = vi.hoisted(() => ({
  deleteObject: vi.fn<(input: DeleteObjectInput) => Promise<void>>(async () => {
    await Promise.resolve();
  }),
  getPresigned: vi.fn<(input: GetPresignedInput) => Promise<string>>(
    async () => await Promise.resolve("https://storage.test/file"),
  ),
  putObject: vi.fn<(input: PutObjectInput) => Promise<void>>(async () => {
    await Promise.resolve();
  }),
}));

vi.mock(import("@bmhk-2026/s3"), () => s3Mocks);

const { deleteObject, getPresigned, putObject } = s3Mocks;

const USER_ID = "user-1";
const FILE_ID = "11111111-1111-4111-8111-111111111111";

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

const testFile: StoredFile = {
  bucket: "uploads",
  contentType: "application/pdf",
  id: FILE_ID,
  objectKey: `files/${FILE_ID}`,
  originalName: "submission.pdf",
  sizeBytes: 9,
  uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
  uploadedBy: USER_ID,
};

function createTestLogger() {
  return {
    audit: Object.assign(vi.fn<(...args: never[]) => void>(), {
      deny: vi.fn<(...args: never[]) => void>(),
    }),
    emit: vi.fn<() => null>(() => null),
    error: vi.fn<(error: Error) => void>(),
    getContext: vi.fn<() => Record<string, unknown>>(() => ({})),
    info: vi.fn<(...args: never[]) => void>(),
    set: vi.fn<(...args: never[]) => void>(),
    setLevel: vi.fn<(...args: never[]) => void>(),
    warn: vi.fn<(...args: never[]) => void>(),
  };
}

function createContext(headers = new Headers()) {
  const log = createTestLogger();

  return {
    context: {
      headers,
      // eslint-disable-next-line typescript/no-unsafe-type-assertion
      log: log as unknown as ApiContext["log"],
    } satisfies ApiContext,
    log,
  };
}

function createAuthReader(
  getSession: AuthReader["getSession"] = async () => await Promise.resolve(testSession),
): AuthReader {
  return { getSession: vi.fn<AuthReader["getSession"]>(getSession) };
}

function createRepository(overrides: Partial<FileRepository> = {}): FileRepository {
  return {
    create:
      overrides.create ??
      vi.fn<FileRepository["create"]>(
        async (data) => await Promise.resolve({ ...testFile, ...data }),
      ),
    findById:
      overrides.findById ??
      vi.fn<FileRepository["findById"]>(async () => await Promise.resolve(testFile)),
  };
}

function createRouter(repository: FileRepository, auth: AuthReader = createAuthReader()) {
  const { protectedProcedure } = createProcedures({ auth });
  return createFilesRouter(protectedProcedure, repository);
}

function pdfFile(name = "submission.pdf", type = "application/pdf") {
  return new File(["%PDF-1.7\n"], name, { type });
}

describe("files RPC router", () => {
  it("uploads a valid file and returns public metadata", async () => {
    putObject.mockClear();
    const repository = createRepository();
    const router = createRouter(repository);
    const { context } = createContext(new Headers({ origin: "http://localhost:3001" }));

    const uploaded = await call(
      router.upload,
      { file: pdfFile("nested\\submission.pdf") },
      { context, path: ["files", "upload"] },
    );

    expect(uploaded).toMatchObject({
      contentType: "application/pdf",
      originalName: "submission.pdf",
      sizeBytes: 9,
    });
    expect(uploaded.id).toMatch(/^[0-9a-f-]{36}$/u);
    const putInput = putObject.mock.calls[0]?.[0];
    expect({
      bodyIsUint8Array: putInput?.body instanceof Uint8Array,
      bucket: putInput?.bucket,
      contentType: putInput?.contentType,
      keyIsUuid: /^files\/[0-9a-f-]{36}$/u.test(putInput?.key ?? ""),
      originalName: putInput?.originalName,
    }).toStrictEqual({
      bodyIsUint8Array: true,
      bucket: "uploads",
      contentType: "application/pdf",
      keyIsUuid: true,
      originalName: "submission.pdf",
    });
  });

  it("rejects unauthenticated uploads before storage", async () => {
    putObject.mockClear();
    const router = createRouter(
      createRepository(),
      createAuthReader(async () => await Promise.resolve(null)),
    );
    const { context } = createContext();

    await expect(
      call(router.upload, { file: pdfFile() }, { context, path: ["files", "upload"] }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
    expect(putObject).not.toHaveBeenCalled();
  });

  it("rejects an untrusted upload origin", async () => {
    putObject.mockClear();
    const router = createRouter(createRepository());
    const { context } = createContext(new Headers({ origin: "https://evil.test" }));

    await expect(
      call(router.upload, { file: pdfFile() }, { context, path: ["files", "upload"] }),
    ).rejects.toMatchObject({ code: "ORIGIN_NOT_ALLOWED", status: 403 });
    expect(putObject).not.toHaveBeenCalled();
  });

  it("deletes the object when metadata persistence fails", async () => {
    deleteObject.mockClear();
    const repository = createRepository({
      create: vi.fn<FileRepository["create"]>(async () => {
        await Promise.resolve();
        throw new Error("database offline");
      }),
    });
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(router.upload, { file: pdfFile() }, { context, path: ["files", "upload"] }),
    ).rejects.toMatchObject({ code: "FILE_METADATA_SAVE_FAILED", status: 500 });
    const deleteInput = deleteObject.mock.calls[0]?.[0];
    expect(deleteInput?.bucket).toBe("uploads");
    expect(deleteInput?.key).toMatch(/^files\/[0-9a-f-]{36}$/u);
  });

  it("returns an owned file URL", async () => {
    getPresigned.mockClear();
    const router = createRouter(createRepository());
    const { context } = createContext();

    await expect(
      call(router.get, { id: FILE_ID }, { context, path: ["files", "get"] }),
    ).resolves.toStrictEqual({ url: "https://storage.test/file" });
    expect(getPresigned).toHaveBeenCalledWith({
      bucket: "uploads",
      contentType: "application/pdf",
      key: `files/${FILE_ID}`,
      method: "GET",
      originalName: "submission.pdf",
    });
  });

  it("hides files that are not owned by the current user", async () => {
    getPresigned.mockClear();
    const repository = createRepository({
      findById: vi.fn<FileRepository["findById"]>(async () => await Promise.resolve(null)),
    });
    const router = createRouter(repository);
    const { context } = createContext();

    await expect(
      call(router.get, { id: FILE_ID }, { context, path: ["files", "get"] }),
    ).rejects.toMatchObject({ code: "FILE_NOT_FOUND", status: 404 });
    expect(getPresigned).not.toHaveBeenCalled();
  });
});
