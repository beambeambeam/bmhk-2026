import { createError } from "evlog";

import type { FileRepository } from "../files/files.repository";
import type { CreateStoredFileData } from "../files/files.schema";
import type { FileServiceLog } from "../files/files.service";
import {
  cleanupReplacedFile,
  persistUploadedFile,
  storeUploadedFile,
  toPublicFileWithUrl,
} from "../files/files.service";
import type { FileStorage } from "../files/files.storage";
import { createTeamNotFoundError } from "../teams/teams.service";
import type { TeamAdvisorRepository } from "./team-advisors.repository";
import type {
  CreateTeamAdvisorData,
  TeamAdvisor,
  TeamAdvisorDetails,
  TeamAdvisorDocumentType,
  UpdateTeamAdvisorData,
} from "./team-advisors.schema";

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
    log: FileServiceLog;
    teamId: string;
    userId: string;
  }) => Promise<TeamAdvisorDocumentUploadResult>;
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

export function getTeamAdvisorDocumentPath(documentType: TeamAdvisorDocumentType): string {
  return documentType === "identity" ? "identity" : "teacher-status";
}

export function createTeamAdvisorService(
  repository: TeamAdvisorRepository,
  storage: FileStorage,
  fileRepository: FileRepository,
): TeamAdvisorService {
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
        advisor.identityDocument ? toPublicFileWithUrl(advisor.identityDocument, storage) : null,
        advisor.teacherStatusDocument
          ? toPublicFileWithUrl(advisor.teacherStatusDocument, storage)
          : null,
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
    uploadDocument: async ({ documentType, file, log, teamId, userId }) => {
      const advisor = await repository.findByTeamId(userId, teamId);
      if (!advisor) {
        throw createTeamAdvisorNotFoundError();
      }

      const storedFile = await storeUploadedFile({
        file,
        keyPrefix: `team-advisors/${advisor.id}/documents/${getTeamAdvisorDocumentPath(documentType)}`,
        kind: "pdf",
        storage,
        uploadedBy: userId,
      });
      const replacement = await persistUploadedFile({
        data: storedFile,
        log,
        persist: async (data) => {
          const advisorReplacement = await repository.replaceDocument(
            userId,
            teamId,
            documentType,
            data,
          );
          if (!advisorReplacement) {
            throw createTeamAdvisorNotFoundError();
          }

          return advisorReplacement;
        },
        storage,
      });
      await cleanupReplacedFile({
        file: replacement.previous,
        log,
        repository: fileRepository,
        storage,
        userId,
      });

      return { advisor: replacement.advisor, file: storedFile };
    },
  };
}
