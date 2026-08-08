import type { ProtectedProcedure } from "../../core/procedure";
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

export function createTeamParticipantsRouter(
  protectedProcedure: ProtectedProcedure,
  service: TeamParticipantService,
) {
  return {
    academicRecordDocument: protectedProcedure
      .route({ method: "POST", tags: ["Team Participant", "File"] })
      .input(teamParticipantDocumentUploadSchema)
      .output(teamParticipantSchema)
      .handler(async ({ context, input }) => {
        assertAllowedOrigin(context.headers);
        const { file, participant } = await service.uploadDocument({
          documentType: "academicRecordDocument",
          file: input.file,
          index: input.index,
          teamId: input.teamId,
          userId: context.session.user.id,
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
      }),
    create: protectedProcedure
      .route({ method: "POST", tags: ["Team Participant"] })
      .input(createTeamParticipantSchema)
      .output(teamParticipantSchema)
      .handler(async ({ context, input }) => {
        const result = await service.create(context.session.user.id, input);

        context.log.set({
          teamParticipant: { id: result.id, index: result.index, teamId: result.teamId },
        });

        return result;
      }),
    get: protectedProcedure
      .route({ method: "GET", tags: ["Team Participant"] })
      .input(teamParticipantSlotSchema)
      .output(teamParticipantDetailsSchema)
      .handler(
        async ({ context, input }) =>
          await service.get(context.session.user.id, input.teamId, input.index),
      ),
    identityDocument: protectedProcedure
      .route({ method: "POST", tags: ["Team Participant", "File"] })
      .input(teamParticipantDocumentUploadSchema)
      .output(teamParticipantSchema)
      .handler(async ({ context, input }) => {
        assertAllowedOrigin(context.headers);
        const { file, participant } = await service.uploadDocument({
          documentType: "identityDocument",
          file: input.file,
          index: input.index,
          teamId: input.teamId,
          userId: context.session.user.id,
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
      }),
    list: protectedProcedure
      .route({ method: "GET", tags: ["Team Participant"] })
      .input(teamParticipantSlotSchema.pick({ teamId: true }))
      .output(teamParticipantDetailsSchema.array())
      .handler(
        async ({ context, input }) => await service.list(context.session.user.id, input.teamId),
      ),
    portraitPhoto: protectedProcedure
      .route({ method: "POST", tags: ["Team Participant", "File"] })
      .input(teamParticipantDocumentUploadSchema)
      .output(teamParticipantSchema)
      .handler(async ({ context, input }) => {
        assertAllowedOrigin(context.headers);
        const { file, participant } = await service.uploadDocument({
          documentType: "portraitPhoto",
          file: input.file,
          index: input.index,
          teamId: input.teamId,
          userId: context.session.user.id,
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
      }),
    update: protectedProcedure
      .route({ method: "PATCH", tags: ["Team Participant"] })
      .input(updateTeamParticipantSchema)
      .output(teamParticipantSchema)
      .handler(
        async ({ context, input }) =>
          await service.update(context.session.user.id, input.teamId, input.index, input.data),
      ),
  };
}
