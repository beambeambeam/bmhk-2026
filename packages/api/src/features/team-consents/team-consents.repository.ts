import { db } from "@bmhk-2026/db";
import { teamConsents } from "@bmhk-2026/db/schema/team-consents";
import { teams } from "@bmhk-2026/db/schema/teams";
import { isPostgresUniqueViolation } from "@bmhk-2026/db/errors";
import { and, eq } from "drizzle-orm";

import { createRepositoryExecutor, rethrowRepositoryError } from "../../core/repository";
import type {
  CreateTeamConsentData,
  TeamConsent,
  UpdateTeamConsentData,
} from "./team-consents.schema";
import {
  createTeamConsentAlreadyExistsError,
  createTeamConsentRepositoryError,
  teamConsentRepositoryError,
} from "./team-consents.errors";

export interface TeamConsentRepository {
  create: (userId: string, data: CreateTeamConsentData) => Promise<TeamConsent | null>;
  findByTeamId: (userId: string, teamId: string) => Promise<TeamConsent | null>;
  update: (
    userId: string,
    teamId: string,
    data: UpdateTeamConsentData,
  ) => Promise<TeamConsent | null>;
}

type Database = typeof db;

export function createTeamConsentRepository(database: Database = db): TeamConsentRepository {
  const execute = createRepositoryExecutor(teamConsentRepositoryError);

  return {
    create: async (userId, data) => {
      try {
        return await database.transaction(async (transaction) => {
          const [team] = await transaction
            .select({ id: teams.id })
            .from(teams)
            .where(and(eq(teams.id, data.teamId), eq(teams.userId, userId)))
            .for("update")
            .limit(1);

          if (!team) {
            return null;
          }

          const [consent] = await transaction.insert(teamConsents).values(data).returning();
          if (!consent) {
            throw createTeamConsentRepositoryError(
              new Error("Team consent insert returned no row"),
            );
          }

          return consent;
        });
      } catch (error) {
        if (isPostgresUniqueViolation(error, "team_consents_team_id_unique")) {
          throw createTeamConsentAlreadyExistsError();
        }

        return rethrowRepositoryError(error, teamConsentRepositoryError);
      }
    },
    findByTeamId: async (userId, teamId) =>
      await execute(async () => {
        const [consent] = await database
          .select({ consent: teamConsents })
          .from(teamConsents)
          .innerJoin(teams, eq(teams.id, teamConsents.teamId))
          .where(and(eq(teamConsents.teamId, teamId), eq(teams.userId, userId)))
          .limit(1);

        return consent?.consent ?? null;
      }),
    update: async (userId, teamId, data) =>
      await execute(
        async () =>
          await database.transaction(async (transaction) => {
            const [current] = await transaction
              .select({ id: teamConsents.id })
              .from(teamConsents)
              .innerJoin(teams, eq(teams.id, teamConsents.teamId))
              .where(and(eq(teamConsents.teamId, teamId), eq(teams.userId, userId)))
              .for("update")
              .limit(1);

            if (!current) {
              return null;
            }

            const [consent] = await transaction
              .update(teamConsents)
              .set(data)
              .where(eq(teamConsents.id, current.id))
              .returning();

            if (!consent) {
              throw createTeamConsentRepositoryError(
                new Error("Team consent update returned no row"),
              );
            }

            return consent;
          }),
      ),
  };
}
