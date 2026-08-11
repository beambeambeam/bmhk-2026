import { createTeamNotFoundError } from "../teams/teams.service";
import type { TeamAccessContext } from "../../core/auth";
import type {
  TeamRegistrationItemStatus,
  TeamRegistrationStatus,
} from "./team-registration-status.schema";
import type {
  TeamRegistrationStatusFacts,
  TeamRegistrationStatusRepository,
} from "./team-registration-status.repository";
import {
  createTeamRegistrationAlreadySubmittedError,
  createTeamRegistrationIncompleteError,
} from "./team-registration-status.errors";

export interface TeamRegistrationStatusService {
  get: (access: TeamAccessContext, teamId: string) => Promise<TeamRegistrationStatus>;
  submit: (access: TeamAccessContext, teamId: string) => Promise<TeamRegistrationStatus>;
}

const COMPLETED: TeamRegistrationItemStatus = "COMPLETED";
const IN_PROGRESS: TeamRegistrationItemStatus = "IN_PROGRESS";
const NOT_APPLICABLE: TeamRegistrationItemStatus = "NOT_APPLICABLE";
const NOT_STARTED: TeamRegistrationItemStatus = "NOT_STARTED";

function participantStatus(
  participant: TeamRegistrationStatusFacts["participants"][number] | undefined,
): TeamRegistrationItemStatus {
  if (participant === undefined) {
    return NOT_STARTED;
  }

  const hasDocuments =
    participant.academicRecordDocumentFileId !== null &&
    participant.identityDocumentFileId !== null &&
    participant.portraitPhotoFileId !== null;

  return hasDocuments ? COMPLETED : IN_PROGRESS;
}

function teamStatus(team: TeamRegistrationStatusFacts["team"]): TeamRegistrationItemStatus {
  const hasValidMemberCount = team.memberCount === 2 || team.memberCount === 3;
  const hasCoreFields = team.name.trim().length > 0 && team.school.trim().length > 0;

  return hasCoreFields && hasValidMemberCount && team.image !== null ? COMPLETED : IN_PROGRESS;
}

function consentStatus(
  consent: TeamRegistrationStatusFacts["consent"],
): TeamRegistrationItemStatus {
  if (consent === null) {
    return NOT_STARTED;
  }
  const hasAcceptedConsent =
    consent.codernTermsAccepted ||
    consent.competitionRulesAccepted ||
    consent.guardianConsentObtained ||
    consent.healthDataConsent ||
    consent.privacyPolicyAccepted ||
    consent.publicityMediaConsent;
  if (!hasAcceptedConsent) {
    return NOT_STARTED;
  }
  const hasAllConsent =
    consent.codernTermsAccepted &&
    consent.competitionRulesAccepted &&
    consent.guardianConsentObtained &&
    consent.healthDataConsent &&
    consent.privacyPolicyAccepted &&
    consent.publicityMediaConsent;
  return hasAllConsent ? COMPLETED : IN_PROGRESS;
}

function participant3Status(
  memberCount: number,
  participant: TeamRegistrationStatusFacts["participants"][number] | undefined,
): TeamRegistrationItemStatus {
  if (memberCount === 2) {
    return NOT_APPLICABLE;
  }

  if (memberCount === 3) {
    return participantStatus(participant);
  }

  return NOT_STARTED;
}

export function calculateTeamRegistrationStatus(
  facts: TeamRegistrationStatusFacts,
): TeamRegistrationStatus {
  const participants = new Map(
    facts.participants.map((participant) => [participant.index, participant]),
  );
  const participant1 = participantStatus(participants.get(1));
  const participant2 = participantStatus(participants.get(2));
  const participant3 = participant3Status(facts.team.memberCount, participants.get(3));
  const team = teamStatus(facts.team);
  const termsAndConditions = consentStatus(facts.consent);
  const isComplete =
    team === COMPLETED &&
    participant1 === COMPLETED &&
    participant2 === COMPLETED &&
    termsAndConditions === COMPLETED &&
    (participant3 === COMPLETED || participant3 === NOT_APPLICABLE);

  return {
    isComplete,
    memberCount: facts.team.memberCount,
    participant1,
    participant2,
    participant3,
    submissionState: facts.team.submittedAt === null ? "DRAFT" : "SUBMITTED",
    submittedAt: facts.team.submittedAt,
    team,
    teamId: facts.team.id,
    termsAndConditions,
  };
}

export function createTeamRegistrationStatusService(
  repository: TeamRegistrationStatusRepository,
  now: () => Date = () => new Date(),
): TeamRegistrationStatusService {
  return {
    get: async (access, teamId) => {
      const facts = await repository.findByTeamId(access, teamId);
      if (!facts) {
        throw createTeamNotFoundError();
      }

      return calculateTeamRegistrationStatus(facts);
    },
    submit: async (access, teamId) => {
      const facts = await repository.findByTeamId(access, teamId);
      if (!facts) {
        throw createTeamNotFoundError();
      }

      const status = calculateTeamRegistrationStatus(facts);
      if (status.submissionState === "SUBMITTED") {
        throw createTeamRegistrationAlreadySubmittedError();
      }
      if (!status.isComplete) {
        throw createTeamRegistrationIncompleteError();
      }

      const submittedAt = now();
      const result = await repository.submit(access, teamId, submittedAt);
      if (result === "NOT_FOUND") {
        throw createTeamNotFoundError();
      }
      if (result === "ALREADY_SUBMITTED") {
        throw createTeamRegistrationAlreadySubmittedError();
      }

      return {
        ...status,
        submissionState: "SUBMITTED",
        submittedAt,
      };
    },
  };
}
