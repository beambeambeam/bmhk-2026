import { env } from "@bmhk-2026/env/server";
import { createError } from "evlog";

import { toError } from "../../core/errors";
import type { CreateStoredFileData } from "../files/files.schema";
import {
  createStoredFileData,
  toPublicFileWithUrl,
  uploadValidatedFile,
  validateUploadedPdf,
} from "../files/files.service";
import { createTeamNotFoundError } from "../teams/teams.service";
import type { TeamAdvisorRepository } from "./team-advisors.repository";
import type {
  CreateTeamAdvisorData,
  TeamAdvisor,
  TeamAdvisorDetails,
  UpdateTeamAdvisorData,
} from "./team-advisors.schema";

export type TeamAdvisorDocumentType = "identity" | "teacherStatus";

export interface TeamAdvisorDocumentUploadResult {
  advisor: TeamAdvisor;
  file: CreateStoredFileData;
}

export interface TeamAdvisorService {
  create: (userId: string, data: CreateTeamAdvisorData) => Promise<TeamAdvisor>;
  get: (userId: string, teamId: string) => Promise<TeamAdvisorDetails>;
  update: (userId: string, teamId: string, data: UpdateTeamAdvisorData) => Promise<TeamAdvisor>;
  uploadDocument: (input: {
    documentType: TeamAdvisorDocumentType;
    file: File;
    teamId: string;
    userId: string;
  }) => Promise<TeamAdvisorDocumentUploadResult>;
}

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

export function createTeamAdvisorRepositoryError(
  cause: unknown = new Error("Unknown team advisor repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown team advisor repository error"),
    code: "TEAM_ADVISOR_REPOSITORY_ERROR",
    fix: "Try again or contact support",
    message: "Team advisor operation failed",
    status: 500,
    why: "The team advisor repository could not complete the operation",
  });
}

export function getTeamAdvisorDocumentPath(documentType: TeamAdvisorDocumentType): string {
  return documentType === "identity" ? "identity" : "teacher-status";
}

export function createTeamAdvisorService(repository: TeamAdvisorRepository): TeamAdvisorService {
  return {
    create: async (userId, data) => {
      const advisor = await repository.create(userId, data);
      if (!advisor) {
        throw createTeamNotFoundError();
      }

      return advisor;
    },
    get: async (userId, teamId) => {
      const advisor = await repository.findByTeamId(userId, teamId);
      if (!advisor) {
        throw createTeamAdvisorNotFoundError();
      }

      const [identityDocument, teacherStatusDocument] = await Promise.all([
        advisor.identityDocument ? toPublicFileWithUrl(advisor.identityDocument) : null,
        advisor.teacherStatusDocument ? toPublicFileWithUrl(advisor.teacherStatusDocument) : null,
      ]);
      const {
        identityDocument: _identityDocument,
        identityDocumentFileId: _identityDocumentFileId,
        teacherStatusDocument: _teacherStatusDocument,
        teacherStatusDocumentFileId: _teacherStatusDocumentFileId,
        ...advisorFields
      } = advisor;

      return {
        ...advisorFields,
        identityDocument,
        teacherStatusDocument,
      };
    },
    update: async (userId, teamId, data) => {
      const advisor = await repository.update(userId, teamId, data);
      if (!advisor) {
        throw createTeamAdvisorNotFoundError();
      }

      return advisor;
    },
    uploadDocument: async ({ documentType, file, teamId, userId }) => {
      const advisor = await repository.findByTeamId(userId, teamId);
      if (!advisor) {
        throw createTeamAdvisorNotFoundError();
      }

      const validated = await validateUploadedPdf(file);
      const id = crypto.randomUUID();
      const bucket = env.AWS_S3_BUCKET;
      const objectKey = `team-advisors/${advisor.id}/documents/${getTeamAdvisorDocumentPath(documentType)}/${id}`;
      await uploadValidatedFile({ bucket, file: validated, objectKey });

      const storedFile = createStoredFileData({
        bucket,
        file: validated,
        id,
        objectKey,
        uploadedBy: userId,
      });
      const updatedAdvisor = await repository.replaceDocument(
        userId,
        teamId,
        documentType,
        storedFile,
      );

      if (!updatedAdvisor) {
        throw createTeamAdvisorNotFoundError();
      }

      return { advisor: updatedAdvisor, file: storedFile };
    },
  };
}
