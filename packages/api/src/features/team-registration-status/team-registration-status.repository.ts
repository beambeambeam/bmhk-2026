import { db } from "@bmhk-2026/db";
import { teamConsents } from "@bmhk-2026/db/schema/team-consents";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teams } from "@bmhk-2026/db/schema/teams";
import { asc, eq } from "drizzle-orm";
import type { TeamAccessContext } from "../../core/auth";

import { createRepositoryExecutor } from "../../core/repository";
import { teamRegistrationStatusRepositoryError } from "./team-registration-status.errors";
import { createTeamAccessCondition } from "../teams/teams.repository";

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
    image: string | null;
    id: string;
    memberCount: number;
    name: string;
    school: string;
  };
}

export interface TeamRegistrationStatusRepository {
  findByTeamId: (
    access: TeamAccessContext,
    teamId: string,
  ) => Promise<TeamRegistrationStatusFacts | null>;
}

type Database = typeof db;

export function createTeamRegistrationStatusRepository(
  database: Database = db,
): TeamRegistrationStatusRepository {
  const execute = createRepositoryExecutor(teamRegistrationStatusRepositoryError);

  return {
    findByTeamId: async (access, teamId) =>
      await execute(
        async () =>
          await database.transaction(
            async (transaction) => {
              const rows = await transaction
                .select({
                  consentCodernTermsAccepted: teamConsents.codernTermsAccepted,
                  consentCompetitionRulesAccepted: teamConsents.competitionRulesAccepted,
                  consentGuardianConsentObtained: teamConsents.guardianConsentObtained,
                  consentHealthDataConsent: teamConsents.healthDataConsent,
                  consentId: teamConsents.id,
                  consentPrivacyPolicyAccepted: teamConsents.privacyPolicyAccepted,
                  consentPublicityMediaConsent: teamConsents.publicityMediaConsent,
                  participantAcademicRecordDocumentFileId:
                    teamParticipants.academicRecordDocumentFileId,
                  participantIdentityDocumentFileId: teamParticipants.identityDocumentFileId,
                  participantIndex: teamParticipants.index,
                  participantPortraitPhotoFileId: teamParticipants.portraitPhotoFileId,
                  teamId: teams.id,
                  teamImage: teams.image,
                  teamMemberCount: teams.memberCount,
                  teamName: teams.name,
                  teamSchool: teams.school,
                })
                .from(teams)
                .leftJoin(teamParticipants, eq(teamParticipants.teamId, teams.id))
                .leftJoin(teamConsents, eq(teamConsents.teamId, teams.id))
                .where(createTeamAccessCondition(access, teamId))
                .orderBy(asc(teamParticipants.index));

              const [firstRow] = rows;
              if (!firstRow) {
                return null;
              }

              const participants = rows.flatMap((row) => {
                if (row.participantIndex === null) {
                  return [];
                }

                return [
                  {
                    academicRecordDocumentFileId: row.participantAcademicRecordDocumentFileId,
                    identityDocumentFileId: row.participantIdentityDocumentFileId,
                    index: row.participantIndex,
                    portraitPhotoFileId: row.participantPortraitPhotoFileId,
                  },
                ];
              });

              const consent =
                firstRow.consentId === null
                  ? null
                  : {
                      codernTermsAccepted: firstRow.consentCodernTermsAccepted ?? false,
                      competitionRulesAccepted: firstRow.consentCompetitionRulesAccepted ?? false,
                      guardianConsentObtained: firstRow.consentGuardianConsentObtained ?? false,
                      healthDataConsent: firstRow.consentHealthDataConsent ?? false,
                      privacyPolicyAccepted: firstRow.consentPrivacyPolicyAccepted ?? false,
                      publicityMediaConsent: firstRow.consentPublicityMediaConsent ?? false,
                    };

              return {
                consent,
                participants,
                team: {
                  id: firstRow.teamId,
                  image: firstRow.teamImage,
                  memberCount: firstRow.teamMemberCount,
                  name: firstRow.teamName,
                  school: firstRow.teamSchool,
                },
              };
            },
            { accessMode: "read only", isolationLevel: "repeatable read" },
          ),
      ),
  };
}
