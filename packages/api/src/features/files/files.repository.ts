import { db } from "@bmhk-2026/db";
import { files } from "@bmhk-2026/db/schema/files";
import { and, eq } from "drizzle-orm";

import { allowedFileContentTypes } from "./files.types";
import type { CreateStoredFileData, StoredFile } from "./files.types";

export interface FileRepository {
  create: (data: CreateStoredFileData) => Promise<StoredFile>;
  findById: (userId: string, id: string) => Promise<StoredFile | null>;
}

type Database = typeof db;

function isAllowedFileContentType(value: string): value is StoredFile["contentType"] {
  return allowedFileContentTypes.some((contentType) => contentType === value);
}

function toStoredFile(file: typeof files.$inferSelect): StoredFile {
  if (!isAllowedFileContentType(file.contentType)) {
    throw new Error(`Unsupported stored file content type: ${file.contentType}`);
  }

  return {
    bucket: file.bucket,
    contentType: file.contentType,
    id: file.id,
    objectKey: file.objectKey,
    originalName: file.originalName,
    sizeBytes: file.sizeBytes,
    uploadedAt: file.uploadedAt,
    uploadedBy: file.uploadedBy,
  };
}

export function createFileRepository(database: Database = db): FileRepository {
  return {
    create: async (data) => {
      const [file] = await database.insert(files).values(data).returning();

      if (!file) {
        throw new Error("File insert returned no row");
      }

      return toStoredFile(file);
    },
    findById: async (userId, id) => {
      const [file] = await database
        .select()
        .from(files)
        .where(and(eq(files.id, id), eq(files.uploadedBy, userId)))
        .limit(1);

      return file ? toStoredFile(file) : null;
    },
  };
}
