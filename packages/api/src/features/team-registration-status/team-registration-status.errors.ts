import { createError } from "evlog";

import { toError } from "../../core/errors";

const TEAM_REGISTRATION_STATUS_REPOSITORY_ERROR_CODE = "TEAM_REGISTRATION_STATUS_REPOSITORY_ERROR";

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
