import { db } from "@bmhk-2026/db";
import { teamConsents } from "@bmhk-2026/db/schema/team-consents";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teams } from "@bmhk-2026/db/schema/teams";
import { asc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
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
    submittedAt: Date | null;
  };
}

export interface TeamRegistrationStatusRepository {
  findByOwnerId: (ownerId: string) => Promise<TeamRegistrationStatusFacts | null>;
  findByTeamId: (
    access: TeamAccessContext,
    teamId: string,
  ) => Promise<TeamRegistrationStatusFacts | null>;
  submit: (
    access: TeamAccessContext,
    teamId: string,
    submittedAt: Date,
  ) => Promise<TeamRegistrationSubmissionResult>;
}

export type TeamRegistrationSubmissionResult = "ALREADY_SUBMITTED" | "NOT_FOUND" | "SUBMITTED";

type Database = typeof db;

export function createTeamRegistrationStatusRepository(
  database: Database = db,
): TeamRegistrationStatusRepository {
  const execute = createRepositoryExecutor(teamRegistrationStatusRepositoryError);

  async function find(condition: SQL | undefined) {
    return await execute(async () => {
      if (!condition) {
        throw new Error("Team registration status query requires an access condition");
      }

      return await database.transaction(
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
              teamSubmittedAt: teams.registrationSubmittedAt,
            })
            .from(teams)
            .leftJoin(teamParticipants, eq(teamParticipants.teamId, teams.id))
            .leftJoin(teamConsents, eq(teamConsents.teamId, teams.id))
            .where(condition)
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
              submittedAt: firstRow.teamSubmittedAt,
            },
          };
        },
        { accessMode: "read only", isolationLevel: "repeatable read" },
      );
    });
  }

  return {
    findByOwnerId: async (ownerId) => await find(eq(teams.userId, ownerId)),
    findByTeamId: async (access, teamId) => await find(createTeamAccessCondition(access, teamId)),
    submit: async (access, teamId, submittedAt) =>
      await execute(
        async () =>
          await database.transaction(async (transaction) => {
            const [team] = await transaction
              .select({ submittedAt: teams.registrationSubmittedAt })
              .from(teams)
              .where(createTeamAccessCondition(access, teamId))
              .for("update")
              .limit(1);
            if (!team) {
              return "NOT_FOUND";
            }
            if (team.submittedAt !== null) {
              return "ALREADY_SUBMITTED";
            }

            const [submittedTeam] = await transaction
              .update(teams)
              .set({ registrationSubmittedAt: submittedAt })
              .where(createTeamAccessCondition(access, teamId))
              .returning({ id: teams.id });
            if (!submittedTeam) {
              throw new Error("Team registration submission update returned no row");
            }

            return "SUBMITTED";
          }),
      ),
  };
}
