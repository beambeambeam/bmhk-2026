import { db } from "@bmhk-2026/db";
import { teams } from "@bmhk-2026/db/schema/teams";
import { isPostgresUniqueViolation } from "@bmhk-2026/db/errors";
import { files } from "@bmhk-2026/db/schema/files";
import { and, asc, count, eq } from "drizzle-orm";
import type { TeamAccessContext } from "../../core/auth";

import { createRepositoryExecutor, rethrowRepositoryError } from "../../core/repository";
import {
  createTeamAlreadyExistsError,
  createTeamRepositoryError,
  teamRepositoryError,
} from "./teams.errors";
import type { CreateTeamData, Team, TeamAward, UpdateTeamData } from "./teams.schema";
import { toStoredFileOfKind } from "../files/files.schema";
import type { CreateStoredFileData, StoredFile } from "../files/files.schema";

export interface TeamRepository {
  create: (userId: string, data: CreateTeamData) => Promise<Team>;
  delete: (access: TeamAccessContext, id: string) => Promise<boolean>;
  findById: (access: TeamAccessContext, id: string) => Promise<TeamWithStoredImage | null>;
  findByUserId: (userId: string) => Promise<Team | null>;
  list: (
    access: TeamAccessContext,
    pagination: { limit: number; offset: number },
  ) => Promise<{ data: Team[]; total: number }>;
  update: (
    access: TeamAccessContext,
    id: string,
    data: UpdateTeamData | { award: TeamAward },
  ) => Promise<Team | null>;
  replaceImage: (
    access: TeamAccessContext,
    id: string,
    file: CreateStoredFileData,
  ) => Promise<{ previous: StoredFile | null; team: Team } | null>;
}

type Database = typeof db;

export type TeamWithStoredImage = Omit<Team, "image"> & {
  image: StoredFile | null;
};

export function createTeamAccessCondition(access: TeamAccessContext, teamId: string) {
  const targetTeam = eq(teams.id, teamId);
  return access.scope === "ALL_TEAMS"
    ? targetTeam
    : and(targetTeam, eq(teams.userId, access.actorId));
}

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
    delete: async (access, id) =>
      await execute(async () => {
        const [team] = await database
          .delete(teams)
          .where(createTeamAccessCondition(access, id))
          .returning({ id: teams.id });

        return team !== undefined;
      }),
    findById: async (access, id) =>
      await execute(async () => {
        const [result] = await database
          .select({ image: files, team: teams })
          .from(teams)
          .leftJoin(files, eq(files.id, teams.image))
          .where(createTeamAccessCondition(access, id))
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
    list: async (access, { limit, offset }) =>
      await execute(
        async () =>
          await database.transaction(
            async (transaction) => {
              const [totalResult] = await transaction
                .select({ value: count() })
                .from(teams)
                .where(access.scope === "ALL_TEAMS" ? undefined : eq(teams.userId, access.actorId));
              const data = await transaction
                .select()
                .from(teams)
                .where(access.scope === "ALL_TEAMS" ? undefined : eq(teams.userId, access.actorId))
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
    replaceImage: async (access, id, file) =>
      await execute(
        async () =>
          await database.transaction(async (transaction) => {
            const [current] = await transaction
              .select()
              .from(teams)
              .where(createTeamAccessCondition(access, id))
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
              previous = oldFile ? toStoredFileOfKind(oldFile, "image") : null;
            }
            await transaction.insert(files).values(file);
            const [team] = await transaction
              .update(teams)
              .set({ image: file.id })
              .where(createTeamAccessCondition(access, id))
              .returning();
            if (!team) {
              throw createTeamRepositoryError(new Error("Team image update returned no row"));
            }
            return { previous, team };
          }),
      ),
    update: async (access, id, data) =>
      await execute(async () => {
        const [team] = await database
          .update(teams)
          .set(data)
          .where(createTeamAccessCondition(access, id))
          .returning();

        return team ?? null;
      }),
  };
}
