import { db } from "@bmhk-2026/db";
import { teamConsents } from "@bmhk-2026/db/schema/team-consents";
import { teams } from "@bmhk-2026/db/schema/teams";
import { and, eq } from "drizzle-orm";

import type {
  CreateTeamConsentData,
  TeamConsent,
  UpdateTeamConsentData,
} from "./team-consents.schema";
import {
  createTeamConsentAlreadyExistsError,
  createTeamConsentRepositoryError,
} from "./team-consents.service";

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

function isTeamConsentUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return (
    "code" in error &&
    error.code === "23505" &&
    "constraint" in error &&
    error.constraint === "team_consents_team_id_unique"
  );
}

function isTeamConsentRepositoryError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "TEAM_CONSENT_REPOSITORY_ERROR"
  );
}

function repositoryError(error: unknown): never {
  if (isTeamConsentRepositoryError(error)) {
    throw error;
  }

  throw createTeamConsentRepositoryError();
}

export function createTeamConsentRepository(database: Database = db): TeamConsentRepository {
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
            throw createTeamConsentRepositoryError();
          }

          return consent;
        });
      } catch (error) {
        if (isTeamConsentUniqueViolation(error)) {
          throw createTeamConsentAlreadyExistsError();
        }

        return repositoryError(error);
      }
    },
    findByTeamId: async (userId, teamId) => {
      try {
        const [consent] = await database
          .select({ consent: teamConsents })
          .from(teamConsents)
          .innerJoin(teams, eq(teams.id, teamConsents.teamId))
          .where(and(eq(teamConsents.teamId, teamId), eq(teams.userId, userId)))
          .limit(1);

        return consent?.consent ?? null;
      } catch (error) {
        return repositoryError(error);
      }
    },
    update: async (userId, teamId, data) => {
      try {
        return await database.transaction(async (transaction) => {
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
            throw createTeamConsentRepositoryError();
          }

          return consent;
        });
      } catch (error) {
        return repositoryError(error);
      }
    },
  };
}
