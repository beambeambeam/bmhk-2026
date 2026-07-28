import { db } from "@bmhk-2026/db";
import { teams } from "@bmhk-2026/db/schema/teams";
import { and, asc, count, eq } from "drizzle-orm";

import { createTeamAlreadyExistsError } from "./teams.errors";
import type { CreateTeamData, Team, UpdateTeamData } from "./teams.types";

export interface TeamRepository {
  create: (userId: string, data: CreateTeamData) => Promise<Team>;
  delete: (userId: string, id: string) => Promise<boolean>;
  findById: (userId: string, id: string) => Promise<Team | null>;
  findByUserId: (userId: string) => Promise<Team | null>;
  list: (
    userId: string,
    pagination: { limit: number; offset: number },
  ) => Promise<{ data: Team[]; total: number }>;
  update: (userId: string, id: string, data: UpdateTeamData) => Promise<Team | null>;
}

type Database = typeof db;

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
          throw new Error("Team insert returned no row");
        }

        return team;
      } catch (error) {
        if (isTeamUserUniqueViolation(error)) {
          throw createTeamAlreadyExistsError();
        }

        throw error;
      }
    },
    delete: async (userId, id) => {
      const [team] = await database
        .delete(teams)
        .where(and(eq(teams.id, id), eq(teams.userId, userId)))
        .returning({ id: teams.id });

      return team !== undefined;
    },
    findById: async (userId, id) => {
      const [team] = await database
        .select()
        .from(teams)
        .where(and(eq(teams.id, id), eq(teams.userId, userId)))
        .limit(1);

      return team ?? null;
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
