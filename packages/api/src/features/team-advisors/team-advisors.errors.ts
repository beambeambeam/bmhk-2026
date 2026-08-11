import { createError } from "evlog";

import { toError } from "../../core/errors";

const TEAM_ADVISOR_REPOSITORY_ERROR_CODE = "TEAM_ADVISOR_REPOSITORY_ERROR";

export function createTeamAdvisorAlreadyExistsError() {
  return createError({
    code: "TEAM_ADVISOR_ALREADY_EXISTS",
    fix: "Use the existing team advisor or update it instead",
    message: "Team already has an advisor",
    status: 409,
    why: "Each team may have only one advisor",
  });
}

export function createTeamAdvisorRepositoryError(
  cause: unknown = new Error("Unknown team advisor repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown team advisor repository error"),
    code: TEAM_ADVISOR_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "Team advisor operation failed",
    status: 500,
    why: "The team advisor repository could not complete the operation",
  });
}

export const teamAdvisorRepositoryError = {
  code: TEAM_ADVISOR_REPOSITORY_ERROR_CODE,
  create: createTeamAdvisorRepositoryError,
} as const;
