import { createError } from "evlog";

import { toError } from "../../core/errors";

const ADMIN_USER_REPOSITORY_ERROR_CODE = "ADMIN_USER_REPOSITORY_ERROR";

export function createAdminUserNotFoundError() {
  return createError({
    code: "ADMIN_USER_NOT_FOUND",
    fix: "Refresh the user list and try again",
    message: "User not found",
    status: 404,
    why: "The target user does not exist",
  });
}

export function createAdminUserRepositoryError(
  cause: unknown = new Error("Unknown admin user repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown admin user repository error"),
    code: ADMIN_USER_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "User role update failed",
    status: 500,
    why: "The admin user repository could not update the role",
  });
}

export const adminUserRepositoryError = {
  code: ADMIN_USER_REPOSITORY_ERROR_CODE,
  create: createAdminUserRepositoryError,
} as const;
