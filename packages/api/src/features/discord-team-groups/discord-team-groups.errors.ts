import { createError } from "evlog";

import { toError } from "../../core/errors";

const DISCORD_TEAM_GROUPS_REPOSITORY_ERROR_CODE = "DISCORD_TEAM_GROUPS_REPOSITORY_ERROR";

export function createTeamGroupsProvisionedError() {
  return createError({
    code: "TEAM_GROUPS_ALREADY_PROVISIONED",
    fix: "Run /cleanupteamschannel in Discord to remove the existing channels, then try again",
    message: "Team groups already have Discord channels provisioned",
    status: 409,
    why: "Reassigning would orphan Discord categories/channels that are already provisioned for the current groups",
  });
}

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
