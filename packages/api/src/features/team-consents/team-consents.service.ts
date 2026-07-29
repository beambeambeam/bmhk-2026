import { createError } from "evlog";

export function createTeamConsentAlreadyExistsError() {
  return createError({
    code: "TEAM_CONSENT_ALREADY_EXISTS",
    fix: "Use the existing team consent or update it instead",
    message: "Team already has a consent record",
    status: 409,
    why: "Each team may have only one consent record",
  });
}

export function createTeamConsentNotFoundError() {
  return createError({
    code: "TEAM_CONSENT_NOT_FOUND",
    fix: "Check the team ID and try again",
    message: "Team consent not found",
    status: 404,
    why: "No consent record owned by the current user matches this team",
  });
}

export function createTeamConsentRepositoryError() {
  return createError({
    code: "TEAM_CONSENT_REPOSITORY_ERROR",
    fix: "Try again or contact support",
    message: "Team consent operation failed",
    status: 500,
    why: "The team consent repository could not satisfy an internal invariant",
  });
}
