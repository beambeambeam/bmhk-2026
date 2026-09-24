import { createError } from "evlog";
import { toError } from "../../core/errors";

const conflicts = {
  ROUND2_CONFIRMATION_ALREADY_SUBMITTED: [
    "Team is already confirmed",
    "Submitted confirmations cannot be changed",
  ],
  ROUND2_CONFIRMATION_CLOSED: [
    "Confirmation is closed",
    "Wait for the announced confirmation period",
  ],
  ROUND2_CONFIRMATION_INCOMPLETE: [
    "Confirmation is incomplete",
    "Upload both cards for every registered participant",
  ],
  ROUND2_CONFIRMATION_INELIGIBLE: [
    "Team is not eligible for confirmation",
    "Only teams advanced to round 2 may confirm",
  ],
} as const;
export function createRound2Conflict(code: keyof typeof conflicts) {
  const [message, fix] = conflicts[code];
  return createError({ code, fix, message, status: 409, why: message });
}
export function createRound2RepositoryError(cause: unknown) {
  return createError({
    cause: toError(cause, "Unknown confirmation repository error"),
    code: "ROUND2_CONFIRMATION_REPOSITORY_ERROR",
    fix: "Try again shortly",
    message: "Round 2 confirmation operation failed",
    status: 500,
    why: "The confirmation repository could not complete the operation",
  });
}
export const round2DeniedCodes = [
  ...Object.keys(conflicts),
  "TEAM_NOT_FOUND",
  "TEAM_PARTICIPANT_NOT_FOUND",
  "FILE_NOT_FOUND",
] as const;
