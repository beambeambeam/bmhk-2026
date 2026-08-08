import { db } from "@bmhk-2026/db";
import { files } from "@bmhk-2026/db/schema/files";
import { and, eq } from "drizzle-orm";

import { createRepositoryExecutor } from "../../core/repository";
import { createFileRepositoryError } from "./files.service";
import type { CreateStoredFileData, StoredFile } from "./files.schema";
import { toStoredFile } from "./files.schema";

export interface FileRepository {
  create: (data: CreateStoredFileData) => Promise<StoredFile>;
  findById: (userId: string, id: string) => Promise<StoredFile | null>;
}

type Database = typeof db;

export function createFileRepository(database: Database = db): FileRepository {
  const execute = createRepositoryExecutor("FILE_REPOSITORY_ERROR", createFileRepositoryError);

  return {
    create: async (data) =>
      await execute(async () => {
        const [file] = await database.insert(files).values(data).returning();

        if (!file) {
          throw createFileRepositoryError(new Error("File insert returned no row"));
        }

        return toStoredFile(file);
      }),
    findById: async (userId, id) =>
      await execute(async () => {
        const [file] = await database
          .select()
          .from(files)
          .where(and(eq(files.id, id), eq(files.uploadedBy, userId)))
          .limit(1);

        return file ? toStoredFile(file) : null;
      }),
  };
}
