import { createError } from "evlog";
import type { TeamAccessContext } from "../../core/auth";

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
  create: (access: TeamAccessContext, data: CreateTeamAdvisorData) => Promise<TeamAdvisor>;
  get: (access: TeamAccessContext, teamId: string) => Promise<TeamAdvisorDetails>;
  update: (
    access: TeamAccessContext,
    teamId: string,
    data: UpdateTeamAdvisorData,
  ) => Promise<TeamAdvisor>;
  uploadDocument: (input: {
    access: TeamAccessContext;
    documentType: TeamAdvisorDocumentType;
    file: File;
    log: FileServiceLog;
    teamId: string;
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
    create: async (access, data) => {
      const advisor = await repository.create(access, data);
      if (!advisor) {
        throw createTeamNotFoundError();
      }

      return advisor;
    },
    get: async (access, teamId) => {
      const advisor = await repository.findByTeamId(access, teamId);
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
    update: async (access, teamId, data) => {
      const advisor = await repository.update(access, teamId, data);
      if (!advisor) {
        throw createTeamAdvisorNotFoundError();
      }

      return advisor;
    },
    uploadDocument: async ({ access, documentType, file, log, teamId }) => {
      const advisor = await repository.findByTeamId(access, teamId);
      if (!advisor) {
        throw createTeamAdvisorNotFoundError();
      }

      const storedFile = await storeUploadedFile({
        file,
        keyPrefix: `team-advisors/${advisor.id}/documents/${getTeamAdvisorDocumentPath(documentType)}`,
        kind: "pdf",
        storage,
        uploadedBy: access.actorId,
      });
      const replacement = await persistUploadedFile({
        data: storedFile,
        log,
        persist: async (data) => {
          const advisorReplacement = await repository.replaceDocument(
            access,
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
        userId: access.actorId,
      });

      return { advisor: replacement.advisor, file: storedFile };
    },
  };
}
