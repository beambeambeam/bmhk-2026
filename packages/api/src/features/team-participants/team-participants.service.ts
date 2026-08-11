import { createError } from "evlog";

import { toError } from "../../core/errors";
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
import type {
  TeamParticipantRepository,
  TeamParticipantWithStoredDocuments,
} from "./team-participants.repository";
import type {
  CreateTeamParticipantData,
  TeamParticipant,
  TeamParticipantDetails,
  UpdateTeamParticipantData,
} from "./team-participants.schema";

export type TeamParticipantDocumentType =
  | "portraitPhoto"
  | "identityDocument"
  | "academicRecordDocument";

export interface TeamParticipantDocumentUploadResult {
  file: CreateStoredFileData;
  participant: TeamParticipant;
}

export interface TeamParticipantService {
  create: (userId: string, data: CreateTeamParticipantData) => Promise<TeamParticipant>;
  get: (userId: string, teamId: string, index: number) => Promise<TeamParticipantDetails>;
  list: (userId: string, teamId: string) => Promise<TeamParticipantDetails[]>;
  update: (
    userId: string,
    teamId: string,
    index: number,
    data: UpdateTeamParticipantData,
  ) => Promise<TeamParticipant>;
  uploadDocument: (input: {
    documentType: TeamParticipantDocumentType;
    file: File;
    index: number;
    log: FileServiceLog;
    teamId: string;
    userId: string;
  }) => Promise<TeamParticipantDocumentUploadResult>;
}

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

export function createTeamParticipantRepositoryError(
  cause: unknown = new Error("Unknown team participant repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown team participant repository error"),
    code: "TEAM_PARTICIPANT_REPOSITORY_ERROR",
    fix: "Try again or contact support",
    message: "Team participant operation failed",
    status: 500,
    why: "The team participant repository could not complete the operation",
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

async function toTeamParticipantDetails(
  participant: TeamParticipantWithStoredDocuments,
  storage: FileStorage,
): Promise<TeamParticipantDetails> {
  const [academicRecordDocument, identityDocument, portraitPhoto] = await Promise.all([
    participant.academicRecordDocument
      ? toPublicFileWithUrl(participant.academicRecordDocument, storage)
      : null,
    participant.identityDocument
      ? toPublicFileWithUrl(participant.identityDocument, storage)
      : null,
    participant.portraitPhoto ? toPublicFileWithUrl(participant.portraitPhoto, storage) : null,
  ]);
  const {
    academicRecordDocument: _academicRecordDocument,
    academicRecordDocumentFileId: _academicRecordDocumentFileId,
    identityDocument: _identityDocument,
    identityDocumentFileId: _identityDocumentFileId,
    portraitPhoto: _portraitPhoto,
    portraitPhotoFileId: _portraitPhotoFileId,
    ...participantFields
  } = participant;

  return {
    ...participantFields,
    academicRecordDocument,
    identityDocument,
    portraitPhoto,
  };
}

export function createTeamParticipantService(
  repository: TeamParticipantRepository,
  storage: FileStorage,
  fileRepository: FileRepository,
): TeamParticipantService {
  return {
    create: async (userId, data) => {
      const participant = await repository.create(userId, data);
      if (!participant) {
        throw createTeamNotFoundError();
      }

      return participant;
    },
    get: async (userId, teamId, index) => {
      const participant = await repository.findBySlot(userId, teamId, index);
      if (!participant) {
        throw createTeamParticipantNotFoundError();
      }

      return await toTeamParticipantDetails(participant, storage);
    },
    list: async (userId, teamId) => {
      const participants = await repository.listByTeamId(userId, teamId);
      if (!participants) {
        throw createTeamNotFoundError();
      }

      return await Promise.all(
        participants.map(
          async (participant) => await toTeamParticipantDetails(participant, storage),
        ),
      );
    },
    update: async (userId, teamId, index, data) => {
      const participant = await repository.update(userId, teamId, index, data);
      if (!participant) {
        throw createTeamParticipantNotFoundError();
      }

      return participant;
    },
    uploadDocument: async ({ documentType, file, index, log, teamId, userId }) => {
      const participant = await repository.findBySlot(userId, teamId, index);
      if (!participant) {
        throw createTeamParticipantNotFoundError();
      }

      const storedFile = await storeUploadedFile({
        file,
        keyPrefix: `team-participants/${participant.id}/documents/${getTeamParticipantDocumentPath(documentType)}`,
        kind: documentType === "portraitPhoto" ? "image" : "pdf",
        storage,
        uploadedBy: userId,
      });
      const replacement = await persistUploadedFile({
        data: storedFile,
        log,
        persist: async (data) => {
          const participantReplacement = await repository.replaceDocument(
            userId,
            teamId,
            index,
            documentType,
            data,
          );
          if (!participantReplacement) {
            throw createTeamParticipantNotFoundError();
          }

          return participantReplacement;
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

      return { file: storedFile, participant: replacement.participant };
    },
  };
}
