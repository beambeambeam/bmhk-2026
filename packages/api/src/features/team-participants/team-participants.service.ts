import { createError } from "evlog";

export type TeamParticipantDocumentType =
  | "portraitPhoto"
  | "identityDocument"
  | "academicRecordDocument";

export function createTeamParticipantAlreadyExistsError() {
  return createError({
    code: "TEAM_PARTICIPANT_ALREADY_EXISTS",
    fix: "Use another participant slot",
    message: "Participant slot is already occupied",
    status: 409,
    why: "Each team participant slot may contain only one participant",
  });
}

export function createTeamParticipantNotFoundError() {
  return createError({
    code: "TEAM_PARTICIPANT_NOT_FOUND",
    fix: "Check the team and participant slot",
    message: "Team participant not found",
    status: 404,
    why: "No participant owned by the current user matches this team and slot",
  });
}

export function createTeamParticipantRepositoryError(message: string) {
  return createError({
    code: "TEAM_PARTICIPANT_REPOSITORY_ERROR",
    fix: "Try again or contact support",
    message,
    status: 500,
    why: "The team participant repository could not satisfy an internal invariant",
  });
}

export function getTeamParticipantDocumentPath(type: TeamParticipantDocumentType): string {
  if (type === "portraitPhoto") {
    return "portrait";
  }
  if (type === "identityDocument") {
    return "identity";
  }
  return "academic-record";
}
