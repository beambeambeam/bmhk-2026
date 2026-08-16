import { createError } from "evlog";

import { toError } from "../../core/errors";

const STAFF_CHECK_IN_REPOSITORY_ERROR_CODE = "STAFF_CHECK_IN_REPOSITORY_ERROR";

export function createStaffAlreadyCheckedInError() {
  return createError({
    code: "STAFF_ALREADY_CHECKED_IN",
    fix: "Refresh the staff list",
    message: "This staff member has already checked in",
    status: 409,
    why: "A check-in record already exists for this staff member",
  });
}

export function createStaffCheckInTargetNotFoundError() {
  return createError({
    code: "STAFF_CHECK_IN_TARGET_NOT_FOUND",
    fix: "Refresh the staff list and try again",
    message: "Staff member not found",
    status: 404,
    why: "The target user is not eligible for staff check-in",
  });
}

export function createStaffCheckInNotFoundError() {
  return createError({
    code: "STAFF_CHECK_IN_NOT_FOUND",
    fix: "Refresh the staff list and try again",
    message: "Staff check-in not found",
    status: 404,
    why: "The staff member does not have an active check-in record",
  });
}

export function createStaffCheckInRepositoryError(
  cause: unknown = new Error("Unknown staff check-in repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown staff check-in repository error"),
    code: STAFF_CHECK_IN_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "Staff check-in operation failed",
    status: 500,
    why: "The staff check-in repository could not complete the operation",
  });
}

export const staffCheckInRepositoryError = {
  code: STAFF_CHECK_IN_REPOSITORY_ERROR_CODE,
  create: createStaffCheckInRepositoryError,
} as const;
