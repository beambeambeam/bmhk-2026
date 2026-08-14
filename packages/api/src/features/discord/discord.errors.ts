import { createError } from "evlog";

import { toError } from "../../core/errors";

const DISCORD_REPOSITORY_ERROR_CODE = "DISCORD_REPOSITORY_ERROR";

export function createDiscordRepositoryError(
  cause: unknown = new Error("Unknown discord repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown discord repository error"),
    code: DISCORD_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "Discord verification operation failed",
    status: 500,
    why: "The discord repository could not complete the operation",
  });
}

export const discordRepositoryError = {
  code: DISCORD_REPOSITORY_ERROR_CODE,
  create: createDiscordRepositoryError,
} as const;
