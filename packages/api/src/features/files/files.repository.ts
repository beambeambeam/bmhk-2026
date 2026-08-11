import { db } from "@bmhk-2026/db";
import { files } from "@bmhk-2026/db/schema/files";
import { and, eq } from "drizzle-orm";

import { createRepositoryExecutor } from "../../core/repository";
import { createFileRepositoryError, fileRepositoryError } from "./files.errors";
import type { CreateStoredFileData, StoredFile } from "./files.schema";
import { toStoredFile } from "./files.schema";

export interface FileRepository {
  create: (data: CreateStoredFileData) => Promise<StoredFile>;
  deleteById: (id: string) => Promise<boolean>;
  findById: (userId: string, id: string) => Promise<StoredFile | null>;
}

type Database = typeof db;

export function createFileRepository(database: Database = db): FileRepository {
  const execute = createRepositoryExecutor(fileRepositoryError);

  return {
    create: async (data) =>
      await execute(async () => {
        const [file] = await database.insert(files).values(data).returning();

        if (!file) {
          throw createFileRepositoryError(new Error("File insert returned no row"));
        }

        return toStoredFile(file);
      }),
    deleteById: async (id) =>
      await execute(async () => {
        const deleted = await database
          .delete(files)
          .where(eq(files.id, id))
          .returning({ id: files.id });

        return deleted.length > 0;
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
