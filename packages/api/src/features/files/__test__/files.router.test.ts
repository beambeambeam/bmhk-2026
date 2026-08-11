import { call } from "@orpc/server";
import type { DeleteObjectInput, GetPresignedInput, PutObjectInput } from "@bmhk-2026/s3";
import { describe, expect, it, vi } from "vitest";

import type { AuthReader, FileRepository } from "../../../index";
import { createAppRouter } from "../../../index";
import type { CreateStoredFileData, StoredFile } from "../files.schema";
import {
  createTestAuthReader,
  createTestContext,
  createUnusedTeamRepository,
} from "../../../__test__/test-support";

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

function createRepository(overrides: Partial<FileRepository> = {}): FileRepository {
  return {
    create: overrides.create ?? (async (data) => await Promise.resolve({ ...testFile, ...data })),
    delete: overrides.delete ?? (async () => await Promise.resolve(true)),
    findById: overrides.findById ?? (async () => await Promise.resolve(testFile)),
  };
}

function createRouter(repository: FileRepository, auth: AuthReader = createTestAuthReader()) {
  return createAppRouter({ auth, files: repository, teams: createUnusedTeamRepository() }).files;
}

function pdfFile(name = "submission.pdf", type = "application/pdf") {
  return new File(["%PDF-1.7\n"], name, { type });
}

describe("files RPC router", () => {
  it("uploads a valid file and returns public metadata", async () => {
    let persistedFile: CreateStoredFileData | undefined;
    const repository = createRepository({
      create: async (data) => {
        persistedFile = data;
        return await Promise.resolve({ ...testFile, ...data });
      },
    });
    const router = createRouter(repository);
    const { context } = createTestContext(new Headers({ origin: "http://localhost:3001" }));

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
    expect(persistedFile).toStrictEqual({
      bucket: "uploads",
      contentType: "application/pdf",
      id: uploaded.id,
      objectKey: `files/${uploaded.id}`,
      originalName: "submission.pdf",
      sizeBytes: 9,
      uploadedBy: USER_ID,
    });
  });

  it("rejects unauthenticated uploads before storage", async () => {
    const router = createRouter(createRepository(), createTestAuthReader(null));
    const { context } = createTestContext();

    await expect(
      call(router.upload, { file: pdfFile() }, { context, path: ["files", "upload"] }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
    expect(putObject).not.toHaveBeenCalled();
  });

  it("rejects an untrusted upload origin", async () => {
    const router = createRouter(createRepository());
    const { context } = createTestContext(new Headers({ origin: "https://evil.test" }));

    await expect(
      call(router.upload, { file: pdfFile() }, { context, path: ["files", "upload"] }),
    ).rejects.toMatchObject({ code: "ORIGIN_NOT_ALLOWED", status: 403 });
    expect(putObject).not.toHaveBeenCalled();
  });

  it("deletes the object when metadata persistence fails", async () => {
    const repository = createRepository({
      create: async () => {
        await Promise.resolve();
        throw new Error("database offline");
      },
    });
    const router = createRouter(repository);
    const { context } = createTestContext();

    await expect(
      call(router.upload, { file: pdfFile() }, { context, path: ["files", "upload"] }),
    ).rejects.toMatchObject({ code: "FILE_METADATA_SAVE_FAILED", status: 500 });
    const deleteInput = deleteObject.mock.calls[0]?.[0];
    expect(deleteInput?.bucket).toBe("uploads");
    expect(deleteInput?.key).toMatch(/^files\/[0-9a-f-]{36}$/u);
  });

  it("returns storage unavailable without persisting metadata when object upload fails", async () => {
    let createWasCalled = false;
    const repository = createRepository({
      create: async (data) => {
        createWasCalled = true;
        return await Promise.resolve({ ...testFile, ...data });
      },
    });
    const router = createRouter(repository);
    const { context } = createTestContext();
    putObject.mockRejectedValueOnce(new Error("storage offline"));

    await expect(
      call(router.upload, { file: pdfFile() }, { context, path: ["files", "upload"] }),
    ).rejects.toMatchObject({ code: "FILE_STORAGE_UNAVAILABLE", status: 503 });
    expect(createWasCalled).toBeFalsy();
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("reports cleanup failure without hiding the metadata persistence error", async () => {
    const cleanupError = new Error("cleanup failed");
    const repository = createRepository({
      create: async () => {
        await Promise.resolve();
        throw new Error("database offline");
      },
    });
    const router = createRouter(repository);
    const { context, log } = createTestContext();
    deleteObject.mockRejectedValueOnce(cleanupError);

    await expect(
      call(router.upload, { file: pdfFile() }, { context, path: ["files", "upload"] }),
    ).rejects.toMatchObject({ code: "FILE_METADATA_SAVE_FAILED", status: 500 });
    const rollbackLog = log.set.mock.calls
      .map(([entry]) => entry)
      .find((entry) => entry.event === "file.upload.rollback_failed");
    if (!rollbackLog) {
      throw new Error("Rollback failure was not logged");
    }
    const rollbackFile = rollbackLog.file;
    if (typeof rollbackFile !== "object" || rollbackFile === null) {
      throw new Error("Rollback log did not include file context");
    }
    if (
      !("id" in rollbackFile) ||
      typeof rollbackFile.id !== "string" ||
      !("objectKey" in rollbackFile) ||
      typeof rollbackFile.objectKey !== "string"
    ) {
      throw new Error("Rollback log did not include file identity");
    }
    expect(rollbackLog).toMatchObject({
      event: "file.upload.rollback_failed",
      file: { bucket: "uploads" },
    });
    expect(rollbackFile.id).toMatch(/^[0-9a-f-]{36}$/u);
    expect(rollbackFile.objectKey).toBe(`files/${rollbackFile.id}`);
    expect(log.error).toHaveBeenCalledWith(cleanupError);
  });

  it("returns an owned file URL", async () => {
    const router = createRouter(createRepository());
    const { context } = createTestContext();

    await expect(
      call(router.get, { id: FILE_ID }, { context, path: ["files", "get"] }),
    ).resolves.toStrictEqual({
      contentType: "application/pdf",
      id: FILE_ID,
      originalName: "submission.pdf",
      sizeBytes: 9,
      uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
      url: "https://storage.test/file",
    });
    expect(getPresigned).toHaveBeenCalledWith({
      bucket: "uploads",
      contentType: "application/pdf",
      key: `files/${FILE_ID}`,
      method: "GET",
      originalName: "submission.pdf",
    });
  });

  it("returns storage unavailable when file URL signing fails", async () => {
    const router = createRouter(createRepository());
    const { context } = createTestContext();
    getPresigned.mockRejectedValueOnce(new Error("signer offline"));

    await expect(
      call(router.get, { id: FILE_ID }, { context, path: ["files", "get"] }),
    ).rejects.toMatchObject({ code: "FILE_STORAGE_UNAVAILABLE", status: 503 });
  });

  it("hides files that are not owned by the current user", async () => {
    const repository = createRepository({
      findById: async () => await Promise.resolve(null),
    });
    const router = createRouter(repository);
    const { context } = createTestContext();

    await expect(
      call(router.get, { id: FILE_ID }, { context, path: ["files", "get"] }),
    ).rejects.toMatchObject({ code: "FILE_NOT_FOUND", status: 404 });
    expect(getPresigned).not.toHaveBeenCalled();
  });
});
