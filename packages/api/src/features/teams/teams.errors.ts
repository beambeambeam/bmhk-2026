import { createError } from "evlog";

import { toError } from "../../core/errors";

const TEAM_REPOSITORY_ERROR_CODE = "TEAM_REPOSITORY_ERROR";

export function createTeamAlreadyExistsError() {
  return createError({
    code: "TEAM_ALREADY_EXISTS",
    fix: "Use the existing team or delete it before creating another",
    message: "User already owns a team",
    status: 409,
    why: "Each user may own only one team",
  });
}

export function createTeamRepositoryError(
  cause: unknown = new Error("Unknown team repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown team repository error"),
    code: TEAM_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "Team operation failed",
    status: 500,
    why: "The team repository could not complete the operation",
  });
}

export const teamRepositoryError = {
  code: TEAM_REPOSITORY_ERROR_CODE,
  create: createTeamRepositoryError,
} as const;
