import { createError } from "evlog";

import { toError } from "../../core/errors";

const DISCORD_CODES_REPOSITORY_ERROR_CODE = "DISCORD_CODES_REPOSITORY_ERROR";

export function createDiscordCodesClosedError() {
  return createError({
    code: "DISCORD_CODES_CLOSED",
    fix: "Wait until the Discord identity confirmation window opens",
    message: "Discord code generation is not open",
    status: 403,
    why: "Discord codes are issued only during the published identity confirmation window",
  });
}

export function createDiscordCodesTeamNotEligibleError() {
  return createError({
    code: "DISCORD_CODES_TEAM_NOT_ELIGIBLE",
    fix: "Wait until the team is approved and qualified for round 1",
    message: "Team is not eligible for Discord codes",
    status: 403,
    why: "Discord codes are issued only to approved teams that are eligible for round 1",
  });
}

export function createDiscordCodesRepositoryError(
  cause: unknown = new Error("Unknown discord codes repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown discord codes repository error"),
    code: DISCORD_CODES_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "Discord codes operation failed",
    status: 500,
    why: "The discord codes repository could not complete the operation",
  });
}

export const discordCodesRepositoryError = {
  code: DISCORD_CODES_REPOSITORY_ERROR_CODE,
  create: createDiscordCodesRepositoryError,
} as const;
