import { db } from "@bmhk-2026/db";
import { teamConsents } from "@bmhk-2026/db/schema/team-consents";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teams } from "@bmhk-2026/db/schema/teams";
import { and, asc, eq } from "drizzle-orm";

import { createTeamRegistrationStatusRepositoryError } from "./team-registration-status.service";

type RegistrationMemberCount = 2 | 3;

export interface TeamRegistrationStatusFacts {
  consent: {
    codernTermsAccepted: boolean;
    competitionRulesAccepted: boolean;
    guardianConsentObtained: boolean;
    healthDataConsent: boolean;
    privacyPolicyAccepted: boolean;
    publicityMediaConsent: boolean;
  } | null;
  participants: {
    academicRecordDocumentFileId: string | null;
    identityDocumentFileId: string | null;
    index: number;
    portraitPhotoFileId: string | null;
  }[];
  team: {
    id: string;
    memberCount: RegistrationMemberCount;
    name: string;
    school: string;
  };
}

export interface TeamRegistrationStatusRepository {
  findByTeamId: (userId: string, teamId: string) => Promise<TeamRegistrationStatusFacts | null>;
}

type Database = typeof db;

function toRegistrationMemberCount(memberCount: number): RegistrationMemberCount {
  if (memberCount !== 2 && memberCount !== 3) {
    throw createTeamRegistrationStatusRepositoryError();
  }

  return memberCount;
}

export function createTeamRegistrationStatusRepository(
  database: Database = db,
): TeamRegistrationStatusRepository {
  return {
    findByTeamId: async (userId, teamId) => {
      try {
        return await database.transaction(
          async (transaction) => {
            const [team] = await transaction
              .select({
                id: teams.id,
                memberCount: teams.memberCount,
                name: teams.name,
                school: teams.school,
              })
              .from(teams)
              .where(and(eq(teams.id, teamId), eq(teams.userId, userId)))
              .limit(1);

            if (!team) {
              return null;
            }

            const participants = await transaction
              .select({
                academicRecordDocumentFileId: teamParticipants.academicRecordDocumentFileId,
                identityDocumentFileId: teamParticipants.identityDocumentFileId,
                index: teamParticipants.index,
                portraitPhotoFileId: teamParticipants.portraitPhotoFileId,
              })
              .from(teamParticipants)
              .where(eq(teamParticipants.teamId, team.id))
              .orderBy(asc(teamParticipants.index));

            const [consent] = await transaction
              .select({
                codernTermsAccepted: teamConsents.codernTermsAccepted,
                competitionRulesAccepted: teamConsents.competitionRulesAccepted,
                guardianConsentObtained: teamConsents.guardianConsentObtained,
                healthDataConsent: teamConsents.healthDataConsent,
                privacyPolicyAccepted: teamConsents.privacyPolicyAccepted,
                publicityMediaConsent: teamConsents.publicityMediaConsent,
              })
              .from(teamConsents)
              .where(eq(teamConsents.teamId, team.id))
              .limit(1);

            return {
              consent: consent ?? null,
              participants,
              team: {
                id: team.id,
                memberCount: toRegistrationMemberCount(team.memberCount),
                name: team.name,
                school: team.school,
              },
            };
          },
          { accessMode: "read only", isolationLevel: "repeatable read" },
        );
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "TEAM_REGISTRATION_STATUS_REPOSITORY_ERROR"
        ) {
          throw error;
        }

        throw createTeamRegistrationStatusRepositoryError();
      }
    },
  };
}
