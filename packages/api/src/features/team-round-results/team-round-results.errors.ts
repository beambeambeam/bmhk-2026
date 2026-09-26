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

export function createTeamRoundOutcomeCheckInRequiredError() {
  return createTeamRoundOutcomeConflictError(
    "TEAM_ROUND_OUTCOME_CHECK_IN_REQUIRED",
    "Team must be checked in for this round before changing its outcome",
    "A round outcome can only be changed after the Team has checked in for that round",
  );
}

export function createTeamRoundOutcomeStaleError() {
  return createTeamRoundOutcomeConflictError(
    "TEAM_ROUND_OUTCOME_STALE",
    "Refresh the Team outcome and try again",
    "The Team award changed after the current outcome was loaded",
  );
}

export function createTeamRoundOutcomeLaterCheckInError() {
  return createTeamRoundOutcomeConflictError(
    "TEAM_ROUND_OUTCOME_LATER_CHECK_IN",
    "A later round already has check-ins, so this eligibility cannot be reverted",
    "The Team has at least one later-round check-in",
  );
}

export function createTeamRoundOutcomeInvalidTransitionError() {
  return createTeamRoundOutcomeConflictError(
    "TEAM_ROUND_OUTCOME_INVALID_TRANSITION",
    "Refresh the Team outcome and choose an available action",
    "The requested outcome change is not valid for the Team's current award",
  );
}

function createTeamRoundOutcomeConflictError(code: string, fix: string, why: string) {
  return createError({
    code,
    fix,
    message: "Team round outcome could not be changed",
    status: 409,
    why,
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
