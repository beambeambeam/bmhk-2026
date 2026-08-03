import { createError } from "evlog";

import type { TeamRegistrationStatus } from "./team-registration-status.schema";
import type { TeamRegistrationStatusFacts } from "./team-registration-status.repository";

export function createTeamRegistrationStatusRepositoryError() {
  return createError({
    code: "TEAM_REGISTRATION_STATUS_REPOSITORY_ERROR",
    fix: "Try again or contact support",
    message: "Team registration status operation failed",
    status: 500,
    why: "The team registration status repository could not satisfy an internal invariant",
  });
}

function hasParticipantDocuments(
  participant: TeamRegistrationStatusFacts["participants"][number] | undefined,
): boolean {
  return (
    participant !== undefined &&
    participant.academicRecordDocumentFileId !== null &&
    participant.identityDocumentFileId !== null &&
    participant.portraitPhotoFileId !== null
  );
}

function hasTeamCoreFields(team: TeamRegistrationStatusFacts["team"]): boolean {
  return team.name.trim().length > 0 && team.school.trim().length > 0;
}

function hasAllConsentFlags(consent: TeamRegistrationStatusFacts["consent"]): boolean {
  return (
    consent !== null &&
    consent.codernTermsAccepted &&
    consent.competitionRulesAccepted &&
    consent.guardianConsentObtained &&
    consent.healthDataConsent &&
    consent.privacyPolicyAccepted &&
    consent.publicityMediaConsent
  );
}

export function calculateTeamRegistrationStatus(
  facts: TeamRegistrationStatusFacts,
): TeamRegistrationStatus {
  const participants = new Map(
    facts.participants.map((participant) => [participant.index, participant]),
  );
  const participant1 = hasParticipantDocuments(participants.get(1));
  const participant2 = hasParticipantDocuments(participants.get(2));
  const participant3 =
    facts.team.memberCount === 2 ? null : hasParticipantDocuments(participants.get(3));
  const team = hasTeamCoreFields(facts.team);
  const termsAndConditions = hasAllConsentFlags(facts.consent);
  const isComplete =
    team &&
    participant1 &&
    participant2 &&
    termsAndConditions &&
    (facts.team.memberCount === 2 || participant3 === true);

  return {
    isComplete,
    memberCount: facts.team.memberCount,
    participant1,
    participant2,
    participant3,
    team,
    teamId: facts.team.id,
    termsAndConditions,
  };
}
