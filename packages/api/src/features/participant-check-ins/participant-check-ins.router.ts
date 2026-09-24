import type { RegistrationProcedure } from "../../core/procedure";
import { executeAudited } from "../audit/audit.service";
import {
  participantCheckInCancelledAudit,
  participantCheckInCreatedAudit,
  participantCheckInFlagChangedAudit,
  teamCheckInCreatedAudit,
  teamCheckInCancelledAudit,
} from "../audit/audit.actions";
import {
  createParticipantCheckInSchema,
  listParticipantCheckInsSchema,
  participantCheckInListResultSchema,
  updateParticipantCheckInFlagSchema,
  teamCheckInInputSchema,
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
            await service.cancel(input.participantId, input.round);
          },
          log: context.log,
          // A participant can hold a check-in per round, so the round is what makes this
          // destructive record identifiable in the audit trail.
          onSuccess: () => ({ changes: { before: { round: input.round, status: "checked-in" } } }),
        });
        return input;
      }),
    cancelTeam: registrationProcedure
      .route({ method: "DELETE", tags: ["Participant Check-in"] })
      .input(teamCheckInInputSchema)
      .output(teamCheckInInputSchema)
      .handler(async ({ context, input }) => {
        await executeAudited({
          audit: teamCheckInCancelledAudit({
            actor: { id: context.session.user.id, type: "user" },
            target: { id: input.teamId },
          }),
          deniedErrorCodes: ["PARTICIPANT_CHECK_IN_NOT_FOUND"],
          execute: async () => {
            await service.cancelTeam(input.teamId);
          },
          log: context.log,
          onSuccess: () => ({
            changes: {
              after: { award: "REGISTRATION_COMPLETE" },
              before: { award: "ROUND_1_PARTICIPATED", round: "ROUND_1", status: "checked-in" },
            },
          }),
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
            await service.checkIn(input.participantId, context.session.user.id, input.round);
          },
          log: context.log,
          onSuccess: () => ({ changes: { after: { round: input.round, status: "checked-in" } } }),
        });
        return input;
      }),
    list: registrationProcedure
      .route({ method: "GET", tags: ["Participant Check-in"] })
      .input(listParticipantCheckInsSchema)
      .output(participantCheckInListResultSchema)
      .handler(async ({ input }) => await service.list(input)),
    registerTeam: registrationProcedure
      .route({ method: "POST", tags: ["Participant Check-in"] })
      .input(teamCheckInInputSchema)
      .output(teamCheckInInputSchema)
      .handler(async ({ context, input }) => {
        await executeAudited({
          audit: teamCheckInCreatedAudit({
            actor: { id: context.session.user.id, type: "user" },
            target: { id: input.teamId },
          }),
          deniedErrorCodes: [
            "PARTICIPANT_CHECK_IN_TARGET_NOT_FOUND",
            "PARTICIPANT_NOT_ROUND_ELIGIBLE",
            "PARTICIPANT_ALREADY_CHECKED_IN",
          ],
          execute: async () => {
            await service.registerTeam(input.teamId, context.session.user.id);
          },
          log: context.log,
          onSuccess: () => ({
            changes: {
              after: { award: "ROUND_1_PARTICIPATED", round: "ROUND_1", status: "checked-in" },
            },
          }),
        });
        return input;
      }),
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
            await service.updateFlag(input.participantId, input.flag, input.round);
          },
          log: context.log,
          onSuccess: () => ({ changes: { after: { flag: input.flag, round: input.round } } }),
        });
        return input;
      }),
  };
}
