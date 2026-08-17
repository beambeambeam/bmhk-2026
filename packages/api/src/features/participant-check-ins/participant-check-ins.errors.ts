import { createError } from "evlog";

import { toError } from "../../core/errors";

const PARTICIPANT_CHECK_IN_REPOSITORY_ERROR_CODE = "PARTICIPANT_CHECK_IN_REPOSITORY_ERROR";

export function createParticipantAlreadyCheckedInError() {
  return createError({
    code: "PARTICIPANT_ALREADY_CHECKED_IN",
    fix: "Refresh the participant list",
    message: "This participant has already checked in",
    status: 409,
    why: "A check-in record already exists for this participant",
  });
}

export function createParticipantCheckInNotFoundError() {
  return createError({
    code: "PARTICIPANT_CHECK_IN_NOT_FOUND",
    fix: "Refresh the participant list and try again",
    message: "Participant check-in not found",
    status: 404,
    why: "The participant does not have an active check-in record",
  });
}

export function createParticipantCheckInTargetNotFoundError() {
  return createError({
    code: "PARTICIPANT_CHECK_IN_TARGET_NOT_FOUND",
    fix: "Refresh the participant list and try again",
    message: "Participant not found",
    status: 404,
    why: "The target participant does not exist",
  });
}

export function createParticipantCheckInRepositoryError(
  cause: unknown = new Error("Unknown participant check-in repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown participant check-in repository error"),
    code: PARTICIPANT_CHECK_IN_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "Participant check-in operation failed",
    status: 500,
    why: "The participant check-in repository could not complete the operation",
  });
}
export const participantCheckInRepositoryError = {
  code: PARTICIPANT_CHECK_IN_REPOSITORY_ERROR_CODE,
  create: createParticipantCheckInRepositoryError,
} as const;
