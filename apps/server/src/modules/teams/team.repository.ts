import type { TeamRepository } from "@bmhk-2026/api";
import { db } from "@bmhk-2026/db";
import { teams } from "@bmhk-2026/db/schema/teams";
import { and, asc, count, eq } from "drizzle-orm";

type Database = typeof db;

export function createTeamRepository(database: Database = db): TeamRepository {
  return {
    create: async (userId, data) => {
      const [team] = await database
        .insert(teams)
        .values({ ...data, userId })
        .returning();

      if (!team) {
        throw new Error("Team insert returned no row");
      }

      return team;
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
