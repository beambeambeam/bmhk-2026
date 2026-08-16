import type { TeamAccessProcedure } from "../../core/procedure";
import {
  registrationDocumentReplacedAudit,
  registrationPersonCreatedAudit,
  registrationPersonUpdatedAudit,
  registrationPortraitReplacedAudit,
} from "../audit/audit.actions";
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
      if (documentType === "portraitPhoto") {
        const { file, participant } = await executeAudited({
          audit: registrationPortraitReplacedAudit({
            actor: { id: context.teamAccess.actorId, type: "user" },
            target: {
              id: input.teamId,
              participantIndex: input.index,
              teamId: input.teamId,
              type: "registration-portrait",
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
              id: result.participant.id,
              participantIndex: input.index,
              teamId: input.teamId,
              type: "registration-portrait",
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
        const result = await executeAudited({
          audit: registrationPersonCreatedAudit({
            actor: { id: context.teamAccess.actorId, type: "user" },
            target: {
              id: input.teamId,
              participantIndex: input.index,
              personType: "participant",
              teamId: input.teamId,
              type: "registration-person",
            },
          }),
          deniedErrorCodes: ["TEAM_NOT_FOUND", "TEAM_PARTICIPANT_ALREADY_EXISTS"],
          execute: async () => await service.create(context.teamAccess, input),
          log: context.log,
          onSuccess: (created) => ({
            target: {
              id: created.id,
              participantIndex: created.index,
              personType: "participant",
              teamId: created.teamId,
              type: "registration-person",
            },
          }),
        });

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
        const participant = await executeAudited({
          audit: registrationPersonUpdatedAudit({
            actor: { id: context.teamAccess.actorId, type: "user" },
            changes: { after: { changedFields: Object.keys(input.data) } },
            target: {
              id: input.teamId,
              participantIndex: input.index,
              personType: "participant",
              teamId: input.teamId,
              type: "registration-person",
            },
          }),
          deniedErrorCodes: ["TEAM_PARTICIPANT_NOT_FOUND"],
          execute: async () =>
            await service.update(context.teamAccess, input.teamId, input.index, input.data),
          log: context.log,
          onSuccess: (updated) => ({
            target: {
              id: updated.id,
              participantIndex: updated.index,
              personType: "participant",
              teamId: updated.teamId,
              type: "registration-person",
            },
          }),
        });
        return participant;
      }),
  };
}
