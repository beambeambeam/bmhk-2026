import { createError } from "evlog";

import { toError } from "../../core/errors";

const STAFF_OVERSEERS_REPOSITORY_ERROR_CODE = "STAFF_OVERSEERS_REPOSITORY_ERROR";

export function createStaffOverseersRepositoryError(
  cause: unknown = new Error("Unknown staff overseers repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown staff overseers repository error"),
    code: STAFF_OVERSEERS_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "Staff overseer operation failed",
    status: 500,
    why: "The staff overseers repository could not complete the operation",
  });
}

export const staffOverseersRepositoryError = {
  code: STAFF_OVERSEERS_REPOSITORY_ERROR_CODE,
  create: createStaffOverseersRepositoryError,
} as const;
