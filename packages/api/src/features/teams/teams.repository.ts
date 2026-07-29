import { db } from "@bmhk-2026/db";
import { teams } from "@bmhk-2026/db/schema/teams";
import { files } from "@bmhk-2026/db/schema/files";
import { and, asc, count, eq } from "drizzle-orm";

import { createTeamAlreadyExistsError, createTeamRepositoryError } from "./teams.service";
import type { CreateTeamData, Team, UpdateTeamData } from "./teams.schema";
import type { CreateStoredFileData, StoredFile } from "../files/files.schema";
import { toStoredFile } from "../files/files.schema";

export interface TeamRepository {
  create: (userId: string, data: CreateTeamData) => Promise<Team>;
  delete: (userId: string, id: string) => Promise<boolean>;
  findById: (userId: string, id: string) => Promise<TeamWithStoredImage | null>;
  findByUserId: (userId: string) => Promise<Team | null>;
  list: (
    userId: string,
    pagination: { limit: number; offset: number },
  ) => Promise<{ data: Team[]; total: number }>;
  update: (userId: string, id: string, data: UpdateTeamData) => Promise<Team | null>;
  replaceImage: (
    userId: string,
    id: string,
    file: CreateStoredFileData,
  ) => Promise<{ previous: StoredFile | null; team: Team } | null>;
  deleteFile: (userId: string, id: string) => Promise<boolean>;
}

type Database = typeof db;

export type TeamWithStoredImage = Omit<Team, "image"> & {
  image: StoredFile | null;
};

function toTeamStoredFile(file: typeof files.$inferSelect): StoredFile {
  try {
    return toStoredFile(file);
  } catch (error) {
    throw createTeamRepositoryError(
      error instanceof Error ? error.message : "Unsupported stored team image",
    );
  }
}

function isTeamUserUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return (
    "code" in error &&
    error.code === "23505" &&
    "constraint" in error &&
    error.constraint === "teams_user_id_unique"
  );
}

export function createTeamRepository(database: Database = db): TeamRepository {
  return {
    create: async (userId, data) => {
      try {
        const [team] = await database
          .insert(teams)
          .values({ ...data, userId })
          .returning();

        if (!team) {
          throw createTeamRepositoryError("Team insert returned no row");
        }

        return team;
      } catch (error) {
        if (isTeamUserUniqueViolation(error)) {
          throw createTeamAlreadyExistsError();
        }

        throw createTeamRepositoryError(
          error instanceof Error ? error.message : "Unknown team repository error",
        );
      }
    },
    delete: async (userId, id) => {
      const [team] = await database
        .delete(teams)
        .where(and(eq(teams.id, id), eq(teams.userId, userId)))
        .returning({ id: teams.id });

      return team !== undefined;
    },
    deleteFile: async (userId, id) => {
      const deleted = await database
        .delete(files)
        .where(and(eq(files.id, id), eq(files.uploadedBy, userId)))
        .returning({ id: files.id });
      return deleted.length > 0;
    },
    findById: async (userId, id) => {
      const [result] = await database
        .select({ image: files, team: teams })
        .from(teams)
        .leftJoin(files, and(eq(files.id, teams.image), eq(files.uploadedBy, userId)))
        .where(and(eq(teams.id, id), eq(teams.userId, userId)))
        .limit(1);

      if (!result) {
        return null;
      }

      return {
        ...result.team,
        image: result.image ? toTeamStoredFile(result.image) : null,
      };
    },
    findByUserId: async (userId) => {
      const [team] = await database.select().from(teams).where(eq(teams.userId, userId)).limit(1);

      return team ?? null;
    },
    list: async (userId, { limit, offset }) =>
      await database.transaction(
        async (transaction) => {
          const [totalResult] = await transaction
            .select({ value: count() })
            .from(teams)
            .where(eq(teams.userId, userId));
          const data = await transaction
            .select()
            .from(teams)
            .where(eq(teams.userId, userId))
            .orderBy(asc(teams.index))
            .limit(limit)
            .offset(offset);

          return {
            data,
            total: totalResult?.value ?? 0,
          };
        },
        {
          accessMode: "read only",
          isolationLevel: "repeatable read",
        },
      ),
    replaceImage: async (userId, id, file) =>
      await database.transaction(async (transaction) => {
        const [current] = await transaction
          .select()
          .from(teams)
          .where(and(eq(teams.id, id), eq(teams.userId, userId)))
          .for("update")
          .limit(1);
        if (!current) {
          return null;
        }
        let previous: StoredFile | null = null;
        if (current.image !== null) {
          const [oldFile] = await transaction
            .select()
            .from(files)
            .where(eq(files.id, current.image))
            .limit(1);
          previous = oldFile ? toTeamStoredFile(oldFile) : null;
        }
        await transaction.insert(files).values(file);
        const [team] = await transaction
          .update(teams)
          .set({ image: file.id })
          .where(and(eq(teams.id, id), eq(teams.userId, userId)))
          .returning();
        if (!team) {
          throw createTeamRepositoryError("Team image update returned no row");
        }
        return { previous, team };
      }),
    update: async (userId, id, data) => {
      const [team] = await database
        .update(teams)
        .set(data)
        .where(and(eq(teams.id, id), eq(teams.userId, userId)))
        .returning();

      return team ?? null;
    },
  };
}
