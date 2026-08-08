import { env } from "@bmhk-2026/env/server";
import { createError } from "evlog";

import { toError } from "../../core/errors";
import type { CreateStoredFileData } from "../files/files.schema";
import {
  createStoredFileData,
  toPublicFileWithUrl,
  uploadValidatedFile,
  validateUploadedImage,
  validateUploadedPdf,
} from "../files/files.service";
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
): Promise<TeamParticipantDetails> {
  const [academicRecordDocument, identityDocument, portraitPhoto] = await Promise.all([
    participant.academicRecordDocument
      ? toPublicFileWithUrl(participant.academicRecordDocument)
      : null,
    participant.identityDocument ? toPublicFileWithUrl(participant.identityDocument) : null,
    participant.portraitPhoto ? toPublicFileWithUrl(participant.portraitPhoto) : null,
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

      return await toTeamParticipantDetails(participant);
    },
    list: async (userId, teamId) => {
      const participants = await repository.listByTeamId(userId, teamId);
      if (!participants) {
        throw createTeamNotFoundError();
      }

      return await Promise.all(participants.map(toTeamParticipantDetails));
    },
    update: async (userId, teamId, index, data) => {
      const participant = await repository.update(userId, teamId, index, data);
      if (!participant) {
        throw createTeamParticipantNotFoundError();
      }

      return participant;
    },
    uploadDocument: async ({ documentType, file, index, teamId, userId }) => {
      const participant = await repository.findBySlot(userId, teamId, index);
      if (!participant) {
        throw createTeamParticipantNotFoundError();
      }

      const validated =
        documentType === "portraitPhoto"
          ? await validateUploadedImage(file)
          : await validateUploadedPdf(file);
      const id = crypto.randomUUID();
      const bucket = env.AWS_S3_BUCKET;
      const objectKey = `team-participants/${participant.id}/documents/${getTeamParticipantDocumentPath(documentType)}/${id}`;
      await uploadValidatedFile({ bucket, file: validated, objectKey });

      const storedFile = createStoredFileData({
        bucket,
        file: validated,
        id,
        objectKey,
        uploadedBy: userId,
      });
      const updatedParticipant = await repository.replaceDocument(
        userId,
        teamId,
        index,
        documentType,
        storedFile,
      );

      if (!updatedParticipant) {
        throw createTeamParticipantNotFoundError();
      }

      return { file: storedFile, participant: updatedParticipant };
    },
  };
}
