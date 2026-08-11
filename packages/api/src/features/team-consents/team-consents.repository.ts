import { db } from "@bmhk-2026/db";
import { teamConsents } from "@bmhk-2026/db/schema/team-consents";
import { teams } from "@bmhk-2026/db/schema/teams";
import { isPostgresUniqueViolation } from "@bmhk-2026/db/errors";
import { and, eq } from "drizzle-orm";
import type { TeamAccessContext } from "../../core/auth";

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
import { createTeamAccessCondition } from "../teams/teams.repository";

export interface TeamConsentRepository {
  create: (
    access: TeamAccessContext,
    data: CreateTeamConsentRecordData,
  ) => Promise<TeamConsent | null>;
  findByTeamId: (access: TeamAccessContext, teamId: string) => Promise<TeamConsent | null>;
  update: (
    access: TeamAccessContext,
    teamId: string,
    data: UpdateTeamConsentRecordData,
  ) => Promise<TeamConsentUpdateResult | null>;
}

export type TeamConsentTimestampData = Pick<
  TeamConsent,
  | "codernTermsAcceptedAt"
  | "competitionRulesAcceptedAt"
  | "guardianConsentObtainedAt"
  | "healthDataConsentAt"
  | "privacyPolicyAcceptedAt"
  | "publicityMediaConsentAt"
>;

export type CreateTeamConsentRecordData = CreateTeamConsentData & TeamConsentTimestampData;

export type UpdateTeamConsentRecordData = UpdateTeamConsentData & Partial<TeamConsentTimestampData>;

export interface TeamConsentUpdateResult {
  consent: TeamConsent;
  previous: TeamConsent;
}

type Database = typeof db;

export function createTeamConsentRepository(database: Database = db): TeamConsentRepository {
  const execute = createRepositoryExecutor(teamConsentRepositoryError);

  return {
    create: async (access, data) => {
      try {
        return await database.transaction(async (transaction) => {
          const [team] = await transaction
            .select({ id: teams.id })
            .from(teams)
            .where(createTeamAccessCondition(access, data.teamId))
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
    findByTeamId: async (access, teamId) =>
      await execute(async () => {
        const [consent] = await database
          .select({ consent: teamConsents })
          .from(teamConsents)
          .innerJoin(teams, eq(teams.id, teamConsents.teamId))
          .where(and(eq(teamConsents.teamId, teamId), createTeamAccessCondition(access, teamId)))
          .limit(1);

        return consent?.consent ?? null;
      }),
    update: async (access, teamId, data) =>
      await execute(
        async () =>
          await database.transaction(async (transaction) => {
            const [current] = await transaction
              .select({ consent: teamConsents })
              .from(teamConsents)
              .innerJoin(teams, eq(teams.id, teamConsents.teamId))
              .where(
                and(eq(teamConsents.teamId, teamId), createTeamAccessCondition(access, teamId)),
              )
              .for("update")
              .limit(1);

            if (!current) {
              return null;
            }

            const [consent] = await transaction
              .update(teamConsents)
              .set(data)
              .where(eq(teamConsents.id, current.consent.id))
              .returning();

            if (!consent) {
              throw createTeamConsentRepositoryError(
                new Error("Team consent update returned no row"),
              );
            }

            return { consent, previous: current.consent };
          }),
      ),
  };
}
