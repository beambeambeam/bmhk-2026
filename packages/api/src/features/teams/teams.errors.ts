import { createError } from "evlog";

export function createTeamAlreadyExistsError() {
  return createError({
    code: "TEAM_ALREADY_EXISTS",
    fix: "Use the existing team or delete it before creating another",
    message: "User already owns a team",
    status: 409,
    why: "Each user may own only one team",
  });
}

export function createTeamNotFoundError() {
  return createError({
    code: "TEAM_NOT_FOUND",
    fix: "Check the team ID and try again",
    message: "Team not found",
    status: 404,
    why: "No team owned by the current user matches this ID",
  });
}

export function createTeamRepositoryError(message: string) {
  return createError({
    code: "TEAM_REPOSITORY_ERROR",
    fix: "Try again or contact support",
    message,
    status: 500,
    why: "The team repository could not satisfy an internal invariant",
  });
}
