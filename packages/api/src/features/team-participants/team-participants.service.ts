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
import type {
  TeamParticipantRepository,
  TeamParticipantWithStoredDocuments,
} from "./team-participants.repository";
import type {
  CreateTeamParticipantData,
  TeamParticipant,
  TeamParticipantDetails,
  TeamParticipantDocumentType,
  UpdateTeamParticipantData,
} from "./team-participants.schema";

export interface TeamParticipantDocumentUploadResult {
  file: CreateStoredFileData;
  participant: TeamParticipant;
}

export interface TeamParticipantService {
  create: (access: TeamAccessContext, data: CreateTeamParticipantData) => Promise<TeamParticipant>;
  get: (
    access: TeamAccessContext,
    teamId: string,
    index: number,
  ) => Promise<TeamParticipantDetails>;
  list: (access: TeamAccessContext, teamId: string) => Promise<TeamParticipantDetails[]>;
  update: (
    access: TeamAccessContext,
    teamId: string,
    index: number,
    data: UpdateTeamParticipantData,
  ) => Promise<TeamParticipant>;
  uploadDocument: (input: {
    access: TeamAccessContext;
    documentType: TeamParticipantDocumentType;
    file: File;
    index: number;
    log: FileServiceLog;
    teamId: string;
  }) => Promise<TeamParticipantDocumentUploadResult>;
}

export function createTeamParticipantNotFoundError() {
  return createError({
    code: "TEAM_PARTICIPANT_NOT_FOUND",
    fix: "Check the team and participant slot",
    message: "Team participant not found",
    status: 404,
    why: "No participant accessible to the current user matches this team and slot",
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
    create: async (access, data) => {
      const participant = await repository.create(access, data);
      if (!participant) {
        throw createTeamNotFoundError();
      }

      return participant;
    },
    get: async (access, teamId, index) => {
      const participant = await repository.findBySlot(access, teamId, index);
      if (!participant) {
        throw createTeamParticipantNotFoundError();
      }

      return await toTeamParticipantDetails(participant, storage);
    },
    list: async (access, teamId) => {
      const participants = await repository.listByTeamId(access, teamId);
      if (!participants) {
        throw createTeamNotFoundError();
      }

      return await Promise.all(
        participants.map(
          async (participant) => await toTeamParticipantDetails(participant, storage),
        ),
      );
    },
    update: async (access, teamId, index, data) => {
      const participant = await repository.update(access, teamId, index, data);
      if (!participant) {
        throw createTeamParticipantNotFoundError();
      }

      return participant;
    },
    uploadDocument: async ({ access, documentType, file, index, log, teamId }) => {
      const participant = await repository.findBySlot(access, teamId, index);
      if (!participant) {
        throw createTeamParticipantNotFoundError();
      }

      const storedFile = await storeUploadedFile({
        file,
        keyPrefix: `team-participants/${participant.id}/documents/${getTeamParticipantDocumentPath(documentType)}`,
        kind: documentType === "portraitPhoto" ? "image" : "pdf",
        storage,
        uploadedBy: access.actorId,
      });
      const replacement = await persistUploadedFile({
        data: storedFile,
        log,
        persist: async (data) => {
          const participantReplacement = await repository.replaceDocument(
            access,
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
      });

      return { file: storedFile, participant: replacement.participant };
    },
  };
}
