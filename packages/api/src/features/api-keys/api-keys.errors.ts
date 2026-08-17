import { createError } from "evlog";

import { toError } from "../../core/errors";

const API_KEY_REPOSITORY_ERROR_CODE = "API_KEY_REPOSITORY_ERROR";

export function createApiKeyNotFoundError() {
  return createError({
    code: "API_KEY_NOT_FOUND",
    fix: "Refresh the key list and try again",
    message: "API key not found",
    status: 404,
    why: "The target API key does not exist",
  });
}

export function createApiKeyRepositoryError(
  cause: unknown = new Error("Unknown API key repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown API key repository error"),
    code: API_KEY_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "API key operation failed",
    status: 500,
    why: "The API key repository could not complete the operation",
  });
}

export const apiKeyRepositoryError = {
  code: API_KEY_REPOSITORY_ERROR_CODE,
  create: createApiKeyRepositoryError,
} as const;
