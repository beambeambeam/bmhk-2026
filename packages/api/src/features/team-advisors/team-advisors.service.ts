import { createError } from "evlog";

export type TeamAdvisorDocumentType = "identity" | "teacherStatus";

export function createTeamAdvisorAlreadyExistsError() {
  return createError({
    code: "TEAM_ADVISOR_ALREADY_EXISTS",
    fix: "Use the existing team advisor or update it instead",
    message: "Team already has an advisor",
    status: 409,
    why: "Each team may have only one advisor",
  });
}

export function createTeamAdvisorNotFoundError() {
  return createError({
    code: "TEAM_ADVISOR_NOT_FOUND",
    fix: "Check the team ID and try again",
    message: "Team advisor not found",
    status: 404,
    why: "No advisor owned by the current user matches this team",
  });
}

export function createTeamAdvisorRepositoryError(message: string) {
  return createError({
    code: "TEAM_ADVISOR_REPOSITORY_ERROR",
    fix: "Try again or contact support",
    message,
    status: 500,
    why: "The team advisor repository could not satisfy an internal invariant",
  });
}

export function getTeamAdvisorDocumentPath(documentType: TeamAdvisorDocumentType): string {
  return documentType === "identity" ? "identity" : "teacher-status";
}
