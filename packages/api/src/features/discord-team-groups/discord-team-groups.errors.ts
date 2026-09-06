import { createError } from "evlog";

import { toError } from "../../core/errors";

const DISCORD_TEAM_GROUPS_REPOSITORY_ERROR_CODE = "DISCORD_TEAM_GROUPS_REPOSITORY_ERROR";

export function createDiscordTeamGroupsRepositoryError(
  cause: unknown = new Error("Unknown discord team groups repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown discord team groups repository error"),
    code: DISCORD_TEAM_GROUPS_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "Discord team group operation failed",
    status: 500,
    why: "The discord team groups repository could not complete the operation",
  });
}

export const discordTeamGroupsRepositoryError = {
  code: DISCORD_TEAM_GROUPS_REPOSITORY_ERROR_CODE,
  create: createDiscordTeamGroupsRepositoryError,
} as const;
