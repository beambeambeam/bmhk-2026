import { createError } from "evlog";

import { toError } from "../../core/errors";

const FILE_REPOSITORY_ERROR_CODE = "FILE_REPOSITORY_ERROR";

export function createFileRepositoryError(
  cause: unknown = new Error("Unknown file repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown file repository error"),
    code: FILE_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "File operation failed",
    status: 500,
    why: "The file repository could not complete the operation",
  });
}

export const fileRepositoryError = {
  code: FILE_REPOSITORY_ERROR_CODE,
  create: createFileRepositoryError,
} as const;
