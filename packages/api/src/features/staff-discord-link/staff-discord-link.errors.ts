import { createError } from "evlog";

import { toError } from "../../core/errors";

const STAFF_DISCORD_LINK_REPOSITORY_ERROR_CODE = "STAFF_DISCORD_LINK_REPOSITORY_ERROR";

export function createStaffDiscordLinkRepositoryError(
  cause: unknown = new Error("Unknown staff discord link repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown staff discord link repository error"),
    code: STAFF_DISCORD_LINK_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "Staff Discord link operation failed",
    status: 500,
    why: "The staff discord link repository could not complete the operation",
  });
}

export const staffDiscordLinkRepositoryError = {
  code: STAFF_DISCORD_LINK_REPOSITORY_ERROR_CODE,
  create: createStaffDiscordLinkRepositoryError,
} as const;
