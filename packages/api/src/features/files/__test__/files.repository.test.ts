import type { CreateStoredFileData, StoredFile } from "../../../index";
import type { db as database } from "@bmhk-2026/db";
import { describe, expect, it, vi } from "vitest";

import { createFileRepository } from "../files.repository";

vi.mock(import("@bmhk-2026/db"), () => ({
  // Test mock only needs satisfy import-time default dependency.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  db: {} as typeof database,
}));

const USER_ID = "user-1";
const FILE_ID = "11111111-1111-4111-8111-111111111111";

const testFile: StoredFile = {
  bucket: "uploads",
  contentType: "application/pdf",
  id: FILE_ID,
  objectKey: `files/${FILE_ID}`,
  originalName: "submission.pdf",
  sizeBytes: 5,
  uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
  uploadedBy: USER_ID,
};

const createData: CreateStoredFileData = {
  bucket: testFile.bucket,
  contentType: testFile.contentType,
  id: testFile.id,
  objectKey: testFile.objectKey,
  originalName: testFile.originalName,
  sizeBytes: testFile.sizeBytes,
  uploadedBy: USER_ID,
};

type Database = Parameters<typeof createFileRepository>[0];

function createInsertDatabase(row: StoredFile) {
  const returning = vi.fn<() => Promise<StoredFile[]>>(async () => await Promise.resolve([row]));
  const values = vi.fn<() => { returning: typeof returning }>(() => ({ returning }));
  const insert = vi.fn<() => { values: typeof values }>(() => ({ values }));
  // Test double implements only insert methods exercised by repository tests.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const database = { insert } as unknown as NonNullable<Database>;

  return { database, values };
}

function createSelectDatabase(rows: StoredFile[]) {
  const limit = vi.fn<() => Promise<StoredFile[]>>(async () => await Promise.resolve(rows));
  const where = vi.fn<() => { limit: typeof limit }>(() => ({ limit }));
  const from = vi.fn<() => { where: typeof where }>(() => ({ where }));
  const select = vi.fn<() => { from: typeof from }>(() => ({ from }));
  // Test double implements only select methods exercised by repository tests.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const database = { select } as unknown as NonNullable<Database>;

  return { database };
}

describe("file repository", () => {
  it("creates every metadata field", async () => {
    const { database, values } = createInsertDatabase(testFile);
    const repository = createFileRepository(database);

    await expect(repository.create(createData)).resolves.toStrictEqual(testFile);
    expect(values).toHaveBeenCalledWith(createData);
  });

  it("finds metadata by ID and owner", async () => {
    const { database } = createSelectDatabase([testFile]);
    const repository = createFileRepository(database);

    await expect(repository.findById(USER_ID, FILE_ID)).resolves.toStrictEqual(testFile);
  });

  it("returns null when owned metadata is missing", async () => {
    const { database } = createSelectDatabase([]);
    const repository = createFileRepository(database);

    await expect(repository.findById(USER_ID, FILE_ID)).resolves.toBeNull();
  });
});
