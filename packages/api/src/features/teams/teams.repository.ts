import { db } from "@bmhk-2026/db";
import { teams } from "@bmhk-2026/db/schema/teams";
import { isPostgresUniqueViolation } from "@bmhk-2026/db/errors";
import { files } from "@bmhk-2026/db/schema/files";
import { and, asc, count, eq } from "drizzle-orm";

import { createRepositoryExecutor, rethrowRepositoryError } from "../../core/repository";
import {
  createTeamAlreadyExistsError,
  createTeamRepositoryError,
  teamRepositoryError,
} from "./teams.errors";
import type { CreateTeamData, Team, UpdateTeamData } from "./teams.schema";
import { toStoredFileOfKind } from "../files/files.schema";
import type { CreateStoredFileData, StoredFile } from "../files/files.schema";

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
}

type Database = typeof db;

export type TeamWithStoredImage = Omit<Team, "image"> & {
  image: StoredFile | null;
};

export function createTeamRepository(database: Database = db): TeamRepository {
  const execute = createRepositoryExecutor(teamRepositoryError);

  return {
    create: async (userId, data) => {
      try {
        const [team] = await database
          .insert(teams)
          .values({ ...data, userId })
          .returning();

        if (!team) {
          throw createTeamRepositoryError(new Error("Team insert returned no row"));
        }

        return team;
      } catch (error) {
        if (isPostgresUniqueViolation(error, "teams_user_id_unique")) {
          throw createTeamAlreadyExistsError();
        }

        return rethrowRepositoryError(error, teamRepositoryError);
      }
    },
    delete: async (userId, id) =>
      await execute(async () => {
        const [team] = await database
          .delete(teams)
          .where(and(eq(teams.id, id), eq(teams.userId, userId)))
          .returning({ id: teams.id });

        return team !== undefined;
      }),
    findById: async (userId, id) =>
      await execute(async () => {
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
          image: result.image ? toStoredFileOfKind(result.image, "image") : null,
        };
      }),
    findByUserId: async (userId) =>
      await execute(async () => {
        const [team] = await database.select().from(teams).where(eq(teams.userId, userId)).limit(1);

        return team ?? null;
      }),
    list: async (userId, { limit, offset }) =>
      await execute(
        async () =>
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
      ),
    replaceImage: async (userId, id, file) =>
      await execute(
        async () =>
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
                .where(and(eq(files.id, current.image), eq(files.uploadedBy, userId)))
                .limit(1);
              previous = oldFile ? toStoredFileOfKind(oldFile, "image") : null;
            }
            await transaction.insert(files).values(file);
            const [team] = await transaction
              .update(teams)
              .set({ image: file.id })
              .where(and(eq(teams.id, id), eq(teams.userId, userId)))
              .returning();
            if (!team) {
              throw createTeamRepositoryError(new Error("Team image update returned no row"));
            }
            return { previous, team };
          }),
      ),
    update: async (userId, id, data) =>
      await execute(async () => {
        const [team] = await database
          .update(teams)
          .set(data)
          .where(and(eq(teams.id, id), eq(teams.userId, userId)))
          .returning();

        return team ?? null;
      }),
  };
}
