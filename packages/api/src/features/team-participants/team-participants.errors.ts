import { createError } from "evlog";

import { toError } from "../../core/errors";

const TEAM_PARTICIPANT_REPOSITORY_ERROR_CODE = "TEAM_PARTICIPANT_REPOSITORY_ERROR";

export function createTeamParticipantAlreadyExistsError() {
  return createError({
    code: "TEAM_PARTICIPANT_ALREADY_EXISTS",
    fix: "Use another participant slot",
    message: "Participant slot is already occupied",
    status: 409,
    why: "Each team participant slot may contain only one participant",
  });
}

export function createTeamParticipantRepositoryError(
  cause: unknown = new Error("Unknown team participant repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown team participant repository error"),
    code: TEAM_PARTICIPANT_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "Team participant operation failed",
    status: 500,
    why: "The team participant repository could not complete the operation",
  });
}

export const teamParticipantRepositoryError = {
  code: TEAM_PARTICIPANT_REPOSITORY_ERROR_CODE,
  create: createTeamParticipantRepositoryError,
} as const;
