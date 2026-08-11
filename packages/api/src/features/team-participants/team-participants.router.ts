import type { TeamAccessProcedure } from "../../core/procedure";
import { assertAllowedOrigin } from "../files/files.service";
import { auditTeamMutation } from "../teams/teams.audit";
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
      assertAllowedOrigin(context.headers);
      const { file, participant } = await service.uploadDocument({
        access: context.teamAccess,
        documentType,
        file: input.file,
        index: input.index,
        log: context.log,
        teamId: input.teamId,
      });

      auditTeamMutation(
        context.log,
        context.teamAccess,
        "team-participant.document.replace",
        participant.teamId,
      );
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

        auditTeamMutation(
          context.log,
          context.teamAccess,
          "team-participant.create",
          result.teamId,
        );
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
        auditTeamMutation(
          context.log,
          context.teamAccess,
          "team-participant.update",
          participant.teamId,
        );
        return participant;
      }),
  };
}
