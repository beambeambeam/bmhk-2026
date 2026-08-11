import type { TeamAccessProcedure } from "../../core/procedure";
import { registrationDocumentReplacedAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import { assertAllowedOrigin } from "../files/files.service";
import type { TeamParticipantService } from "./team-participants.service";
import {
  createTeamParticipantSchema,
  teamParticipantDetailsSchema,
  teamParticipantDocumentUploadSchema,
  teamParticipantSchema,
  teamParticipantSlotSchema,
  updateTeamParticipantSchema,
} from "./team-participants.schema";
import type { TeamParticipantDocumentType } from "./team-participants.schema";

function createTeamParticipantDocumentUploadProcedure(
  teamAccessProcedure: TeamAccessProcedure,
  service: TeamParticipantService,
  documentType: TeamParticipantDocumentType,
) {
  return teamAccessProcedure
    .route({ method: "POST", tags: ["Team Participant", "File"] })
    .input(teamParticipantDocumentUploadSchema)
    .output(teamParticipantSchema)
    .handler(async ({ context, input }) => {
      if (documentType !== "portraitPhoto") {
        const auditDocumentType =
          documentType === "identityDocument" ? "identity" : "academic-record";
        const { file, participant } = await executeAudited({
          audit: registrationDocumentReplacedAudit({
            actor: { id: context.teamAccess.actorId, type: "user" },
            target: {
              documentType: auditDocumentType,
              id: input.teamId,
              participantIndex: input.index,
              teamId: input.teamId,
              type: "registration-document",
            },
          }),
          deniedErrorCodes: ["TEAM_PARTICIPANT_NOT_FOUND"],
          execute: async () => {
            assertAllowedOrigin(context.headers);
            return await service.uploadDocument({
              access: context.teamAccess,
              documentType,
              file: input.file,
              index: input.index,
              log: context.log,
              teamId: input.teamId,
            });
          },
          log: context.log,
          onSuccess: (result) => ({
            changes: {
              after: { fileId: result.file.id },
              before: { fileId: result.previousFileId },
            },
            target: {
              documentType: auditDocumentType,
              id: input.teamId,
              participantId: result.participant.id,
              participantIndex: input.index,
              teamId: input.teamId,
              type: "registration-document",
            },
          }),
        });

        context.log.set({
          file: { contentType: file.contentType, id: file.id, sizeBytes: file.sizeBytes },
          teamParticipant: {
            id: participant.id,
            index: participant.index,
            teamId: participant.teamId,
          },
        });
        return participant;
      }

      assertAllowedOrigin(context.headers);
      const { file, participant } = await service.uploadDocument({
        access: context.teamAccess,
        documentType,
        file: input.file,
        index: input.index,
        log: context.log,
        teamId: input.teamId,
      });

      context.log.set({
        file: { contentType: file.contentType, id: file.id, sizeBytes: file.sizeBytes },
        teamParticipant: {
          id: participant.id,
          index: participant.index,
          teamId: participant.teamId,
        },
      });
      return participant;
    });
}

export function createTeamParticipantsRouter(
  teamAccessProcedure: TeamAccessProcedure,
  service: TeamParticipantService,
) {
  return {
    academicRecordDocument: createTeamParticipantDocumentUploadProcedure(
      teamAccessProcedure,
      service,
      "academicRecordDocument",
    ),
    create: teamAccessProcedure
      .route({ method: "POST", tags: ["Team Participant"] })
      .input(createTeamParticipantSchema)
      .output(teamParticipantSchema)
      .handler(async ({ context, input }) => {
        const result = await service.create(context.teamAccess, input);

        context.log.set({
          teamParticipant: { id: result.id, index: result.index, teamId: result.teamId },
        });

        return result;
      }),
    get: teamAccessProcedure
      .route({ method: "GET", tags: ["Team Participant"] })
      .input(teamParticipantSlotSchema)
      .output(teamParticipantDetailsSchema)
      .handler(
        async ({ context, input }) =>
          await service.get(context.teamAccess, input.teamId, input.index),
      ),
    identityDocument: createTeamParticipantDocumentUploadProcedure(
      teamAccessProcedure,
      service,
      "identityDocument",
    ),
    list: teamAccessProcedure
      .route({ method: "GET", tags: ["Team Participant"] })
      .input(teamParticipantSlotSchema.pick({ teamId: true }))
      .output(teamParticipantDetailsSchema.array())
      .handler(async ({ context, input }) => await service.list(context.teamAccess, input.teamId)),
    portraitPhoto: createTeamParticipantDocumentUploadProcedure(
      teamAccessProcedure,
      service,
      "portraitPhoto",
    ),
    update: teamAccessProcedure
      .route({ method: "PATCH", tags: ["Team Participant"] })
      .input(updateTeamParticipantSchema)
      .output(teamParticipantSchema)
      .handler(async ({ context, input }) => {
        const participant = await service.update(
          context.teamAccess,
          input.teamId,
          input.index,
          input.data,
        );
        return participant;
      }),
  };
}
