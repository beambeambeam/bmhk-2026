import { createError } from "evlog";

import { toError } from "../../core/errors";

const TEAM_REGISTRATION_STATUS_REPOSITORY_ERROR_CODE = "TEAM_REGISTRATION_STATUS_REPOSITORY_ERROR";

export function createTeamRegistrationAlreadySubmittedError() {
  return createError({
    code: "TEAM_REGISTRATION_ALREADY_SUBMITTED",
    fix: "No action is required because this registration is already final",
    message: "Team registration already submitted",
    status: 409,
    why: "A Team Registration can be submitted only once",
  });
}

export function createTeamRegistrationIncompleteError() {
  return createError({
    code: "TEAM_REGISTRATION_INCOMPLETE",
    fix: "Complete every required registration section before submitting",
    message: "Team registration is incomplete",
    status: 409,
    why: "Final submission requires complete Registration Information and Legal Consent",
  });
}

export function createTeamRegistrationStatusRepositoryError(
  cause: unknown = new Error("Unknown team registration status repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown team registration status repository error"),
    code: TEAM_REGISTRATION_STATUS_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "Team registration status operation failed",
    status: 500,
    why: "The team registration status repository could not complete the operation",
  });
}

export const teamRegistrationStatusRepositoryError = {
  code: TEAM_REGISTRATION_STATUS_REPOSITORY_ERROR_CODE,
  create: createTeamRegistrationStatusRepositoryError,
} as const;
