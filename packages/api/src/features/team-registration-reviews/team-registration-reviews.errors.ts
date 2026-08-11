import { createError } from "evlog";

import { toError } from "../../core/errors";

export function createTeamRegistrationReviewRepositoryError(
  cause: unknown = new Error("Unknown team registration review repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown team registration review repository error"),
    code: "TEAM_REGISTRATION_REVIEW_REPOSITORY_ERROR",
    fix: "Try again shortly",
    message: "Team registration review operation failed",
    status: 500,
    why: "The team registration review repository could not complete the operation",
  });
}

export const teamRegistrationReviewRepositoryError = {
  code: "TEAM_REGISTRATION_REVIEW_REPOSITORY_ERROR",
  create: createTeamRegistrationReviewRepositoryError,
} as const;
