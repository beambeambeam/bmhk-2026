import { env } from "@bmhk-2026/env/server";
import type { z } from "zod";
import type { ApiSession } from "../../core/auth";
import type { ApiContext } from "../../core/context";
import type { ProtectedProcedure } from "../../core/procedure";
import {
  assertAllowedOrigin,
  createStoredFileData,
  toPublicFileWithUrl,
  uploadValidatedFile,
  validateUploadedImage,
  validateUploadedPdf,
} from "../files/files.service";
import { createTeamNotFoundError } from "../teams/teams.service";
import type { TeamParticipantDocumentType } from "./team-participants.service";
import {
  getTeamParticipantDocumentPath,
  createTeamParticipantNotFoundError,
} from "./team-participants.service";
import type { TeamParticipantRepository } from "./team-participants.repository";
import {
  createTeamParticipantSchema,
  teamParticipantDetailsSchema,
  teamParticipantDocumentUploadSchema,
  teamParticipantSchema,
  teamParticipantSlotSchema,
  updateTeamParticipantSchema,
} from "./team-participants.schema";

type ProtectedContext = ApiContext & { session: ApiSession };

async function upload({
  context,
  input,
  type,
  repository,
}: {
  context: ProtectedContext;
  input: z.output<typeof teamParticipantDocumentUploadSchema>;
  type: TeamParticipantDocumentType;
  repository: TeamParticipantRepository;
}) {
  assertAllowedOrigin(context.headers);

  const participant = await repository.findBySlot(
    context.session.user.id,
    input.teamId,
    input.index,
  );

  if (!participant) {
    throw createTeamParticipantNotFoundError();
  }

  const validated =
    type === "portraitPhoto"
      ? await validateUploadedImage(input.file)
      : await validateUploadedPdf(input.file);
  const id = crypto.randomUUID();
  const bucket = env.AWS_S3_BUCKET;
  const objectKey = `team-participants/${participant.id}/documents/${getTeamParticipantDocumentPath(type)}/${id}`;
  await uploadValidatedFile({ bucket, file: validated, objectKey });

  const file = createStoredFileData({
    bucket,
    file: validated,
    id,
    objectKey,
    uploadedBy: context.session.user.id,
  });

  const result = await repository.replaceDocument(
    context.session.user.id,
    input.teamId,
    input.index,
    type,
    file,
  );

  if (!result) {
    throw createTeamParticipantNotFoundError();
  }

  context.log.set({
    file: { contentType: file.contentType, id: file.id, sizeBytes: file.sizeBytes },
    teamParticipant: { id: result.id, index: result.index, teamId: result.teamId },
  });

  return result;
}
export function createTeamParticipantsRouter(
  protectedProcedure: ProtectedProcedure,
  repository: TeamParticipantRepository,
) {
  return {
    academicRecordDocument: protectedProcedure
      .route({ method: "POST", tags: ["Team Participant", "File"] })
      .input(teamParticipantDocumentUploadSchema)
      .output(teamParticipantSchema)
      .handler(
        async ({ context, input }) =>
          await upload({ context, input, repository, type: "academicRecordDocument" }),
      ),
    create: protectedProcedure
      .route({ method: "POST", tags: ["Team Participant"] })
      .input(createTeamParticipantSchema)
      .output(teamParticipantSchema)
      .handler(async ({ context, input }) => {
        const result = await repository.create(context.session.user.id, input);

        if (!result) {
          throw createTeamNotFoundError();
        }

        context.log.set({
          teamParticipant: { id: result.id, index: result.index, teamId: result.teamId },
        });

        return result;
      }),
    get: protectedProcedure
      .route({ method: "GET", tags: ["Team Participant"] })
      .input(teamParticipantSlotSchema)
      .output(teamParticipantDetailsSchema)
      .handler(async ({ context, input }) => {
        const row = await repository.findBySlot(context.session.user.id, input.teamId, input.index);

        if (!row) {
          throw createTeamParticipantNotFoundError();
        }

        return await details(row);
      }),
    identityDocument: protectedProcedure
      .route({ method: "POST", tags: ["Team Participant", "File"] })
      .input(teamParticipantDocumentUploadSchema)
      .output(teamParticipantSchema)
      .handler(
        async ({ context, input }) =>
          await upload({ context, input, repository, type: "identityDocument" }),
      ),
    list: protectedProcedure
      .route({ method: "GET", tags: ["Team Participant"] })
      .input(teamParticipantSlotSchema.pick({ teamId: true }))
      .output(teamParticipantDetailsSchema.array())
      .handler(async ({ context, input }) => {
        const rows = await repository.listByTeamId(context.session.user.id, input.teamId);

        if (!rows) {
          throw createTeamNotFoundError();
        }

        return await Promise.all(rows.map(async (row) => await details(row)));
      }),
    portraitPhoto: protectedProcedure
      .route({ method: "POST", tags: ["Team Participant", "File"] })
      .input(teamParticipantDocumentUploadSchema)
      .output(teamParticipantSchema)
      .handler(
        async ({ context, input }) =>
          await upload({ context, input, repository, type: "portraitPhoto" }),
      ),
    update: protectedProcedure
      .route({ method: "PATCH", tags: ["Team Participant"] })
      .input(updateTeamParticipantSchema)
      .output(teamParticipantSchema)
      .handler(async ({ context, input }) => {
        const result = await repository.update(
          context.session.user.id,
          input.teamId,
          input.index,
          input.data,
        );

        if (!result) {
          throw createTeamParticipantNotFoundError();
        }

        return result;
      }),
  };
}
async function details(
  row: Awaited<ReturnType<TeamParticipantRepository["findBySlot"]>> extends infer T
    ? NonNullable<T>
    : never,
) {
  const [academicRecordDocument, identityDocument, portraitPhoto] = await Promise.all([
    row.academicRecordDocument ? toPublicFileWithUrl(row.academicRecordDocument) : null,
    row.identityDocument ? toPublicFileWithUrl(row.identityDocument) : null,
    row.portraitPhoto ? toPublicFileWithUrl(row.portraitPhoto) : null,
  ]);
  const {
    academicRecordDocument: _a,
    identityDocument: _i,
    portraitPhoto: _p,
    academicRecordDocumentFileId: _af,
    identityDocumentFileId: _if,
    portraitPhotoFileId: _pf,
    ...fields
  } = row;

  return { ...fields, academicRecordDocument, identityDocument, portraitPhoto };
}
