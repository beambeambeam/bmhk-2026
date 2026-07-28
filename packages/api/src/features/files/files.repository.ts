import { db } from "@bmhk-2026/db";
import { files } from "@bmhk-2026/db/schema/files";
import { and, eq } from "drizzle-orm";

import type { CreateStoredFileData, StoredFile } from "./files.schema";
import { toStoredFile } from "./files.schema";

export interface FileRepository {
  create: (data: CreateStoredFileData) => Promise<StoredFile>;
  findById: (userId: string, id: string) => Promise<StoredFile | null>;
}

type Database = typeof db;

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
