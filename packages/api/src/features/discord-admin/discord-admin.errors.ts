import { createError } from "evlog";

import { toError } from "../../core/errors";

const DISCORD_ADMIN_REPOSITORY_ERROR_CODE = "DISCORD_ADMIN_REPOSITORY_ERROR";

export function createDiscordAdminRepositoryError(
  cause: unknown = new Error("Unknown discord admin repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown discord admin repository error"),
    code: DISCORD_ADMIN_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "Discord admin operation failed",
    status: 500,
    why: "The discord admin repository could not complete the operation",
  });
}

export const discordAdminRepositoryError = {
  code: DISCORD_ADMIN_REPOSITORY_ERROR_CODE,
  create: createDiscordAdminRepositoryError,
} as const;
