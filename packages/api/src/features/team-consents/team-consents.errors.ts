import { createError } from "evlog";

import { toError } from "../../core/errors";

const TEAM_CONSENT_REPOSITORY_ERROR_CODE = "TEAM_CONSENT_REPOSITORY_ERROR";

export function createTeamConsentAlreadyExistsError() {
  return createError({
    code: "TEAM_CONSENT_ALREADY_EXISTS",
    fix: "Use the existing team consent or update it instead",
    message: "Team already has a consent record",
    status: 409,
    why: "Each team may have only one consent record",
  });
}

export function createTeamConsentRepositoryError(
  cause: unknown = new Error("Unknown team consent repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown team consent repository error"),
    code: TEAM_CONSENT_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "Team consent operation failed",
    status: 500,
    why: "The team consent repository could not complete the operation",
  });
}

export const teamConsentRepositoryError = {
  code: TEAM_CONSENT_REPOSITORY_ERROR_CODE,
  create: createTeamConsentRepositoryError,
} as const;
