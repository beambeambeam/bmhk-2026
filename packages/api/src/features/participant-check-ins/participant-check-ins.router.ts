import type { RegistrationProcedure } from "../../core/procedure";
import { executeAudited } from "../audit/audit.service";
import {
  participantCheckInCancelledAudit,
  participantCheckInCreatedAudit,
  participantCheckInFlagChangedAudit,
} from "../audit/audit.actions";
import {
  createParticipantCheckInSchema,
  listParticipantCheckInsSchema,
  participantCheckInListResultSchema,
  updateParticipantCheckInFlagSchema,
} from "./participant-check-ins.schema";
import type { ParticipantCheckInService } from "./participant-check-ins.service";

export function createParticipantCheckInsRouter(
  registrationProcedure: RegistrationProcedure,
  service: ParticipantCheckInService,
) {
  return {
    cancel: registrationProcedure
      .route({ method: "DELETE", tags: ["Participant Check-in"] })
      .input(createParticipantCheckInSchema)
      .output(createParticipantCheckInSchema)
      .handler(async ({ context, input }) => {
        await executeAudited({
          audit: participantCheckInCancelledAudit({
            actor: { id: context.session.user.id, type: "user" },
            target: { id: input.participantId },
          }),
          deniedErrorCodes: ["PARTICIPANT_CHECK_IN_NOT_FOUND"],
          execute: async () => {
            await service.cancel(input.participantId);
          },
          log: context.log,
        });
        return input;
      }),
    checkIn: registrationProcedure
      .route({ method: "POST", tags: ["Participant Check-in"] })
      .input(createParticipantCheckInSchema)
      .output(createParticipantCheckInSchema)
      .handler(async ({ context, input }) => {
        await executeAudited({
          audit: participantCheckInCreatedAudit({
            actor: { id: context.session.user.id, type: "user" },
            target: { id: input.participantId },
          }),
          deniedErrorCodes: ["PARTICIPANT_CHECK_IN_TARGET_NOT_FOUND"],
          execute: async () => {
            await service.checkIn(input.participantId, context.session.user.id);
          },
          log: context.log,
          onSuccess: () => ({ changes: { after: { status: "checked-in" } } }),
        });
        return input;
      }),
    list: registrationProcedure
      .route({ method: "GET", tags: ["Participant Check-in"] })
      .input(listParticipantCheckInsSchema)
      .output(participantCheckInListResultSchema)
      .handler(async ({ input }) => await service.list(input)),
    updateFlag: registrationProcedure
      .route({ method: "PATCH", tags: ["Participant Check-in"] })
      .input(updateParticipantCheckInFlagSchema)
      .output(updateParticipantCheckInFlagSchema)
      .handler(async ({ context, input }) => {
        await executeAudited({
          audit: participantCheckInFlagChangedAudit({
            actor: { id: context.session.user.id, type: "user" },
            target: { id: input.participantId },
          }),
          deniedErrorCodes: ["PARTICIPANT_CHECK_IN_NOT_FOUND"],
          execute: async () => {
            await service.updateFlag(input.participantId, input.flag);
          },
          log: context.log,
          onSuccess: () => ({ changes: { after: { flag: input.flag } } }),
        });
        return input;
      }),
  };
}
