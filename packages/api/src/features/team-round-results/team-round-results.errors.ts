import { createError } from "evlog";

import { toError } from "../../core/errors";

export function createTeamRoundResultTeamNotFoundError() {
  return createError({
    code: "TEAM_ROUND_RESULT_TEAM_NOT_FOUND",
    fix: "Refresh the team list and try again",
    message: "Team not found",
    status: 404,
    why: "The requested team does not exist",
  });
}

export const teamRoundResultRepositoryError = {
  code: "TEAM_ROUND_RESULT_UNAVAILABLE",
  create: (cause: unknown) =>
    createError({
      cause: toError(cause, "Unknown team round result persistence error"),
      code: "TEAM_ROUND_RESULT_UNAVAILABLE",
      fix: "Try again shortly",
      message: "Team round results are temporarily unavailable",
      status: 503,
      why: "The result could not be read or saved",
    }),
} as const;
