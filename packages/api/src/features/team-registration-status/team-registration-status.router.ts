import type { RegistrationProcedure, TeamOwnerProcedure } from "../../core/procedure";
import type { TeamRegistrationStatusService } from "./team-registration-status.service";
import {
  currentTeamRegistrationStatusInputSchema,
  teamRegistrationStatusSchema,
  teamRegistrationStatusTeamInputSchema,
} from "./team-registration-status.schema";
import { teamRegistrationSubmittedAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";

export function createTeamRegistrationStatusRouter(
  registrationProcedure: RegistrationProcedure,
  teamOwnerProcedure: TeamOwnerProcedure,
  service: TeamRegistrationStatusService,
) {
  return {
    get: teamOwnerProcedure
      .route({ method: "GET", tags: ["Team Registration Status"] })
      .input(currentTeamRegistrationStatusInputSchema)
      .output(teamRegistrationStatusSchema)
      .handler(async ({ context }) => {
        const status = await service.getCurrent(context.teamAccess);
        context.log.set({ teamRegistrationStatus: { teamId: status.teamId } });

        return status;
      }),
    getByTeamId: registrationProcedure
      .route({ method: "GET", tags: ["Team Registration Status"] })
      .input(teamRegistrationStatusTeamInputSchema)
      .output(teamRegistrationStatusSchema)
      .handler(async ({ context, input }) => {
        const status = await service.getByTeamId(context.teamAccess, input.teamId);
        context.log.set({ teamRegistrationStatus: { teamId: status.teamId } });

        return status;
      }),
    submit: teamOwnerProcedure
      .route({ method: "POST", tags: ["Team Registration Status"] })
      .input(teamRegistrationStatusTeamInputSchema)
      .output(teamRegistrationStatusSchema)
      .handler(async ({ context, input }) => {
        const status = await executeAudited({
          audit: teamRegistrationSubmittedAudit({
            actor: { id: context.teamAccess.actorId, type: "user" },
            target: { id: input.teamId, teamId: input.teamId },
          }),
          deniedErrorCodes: [
            "TEAM_NOT_FOUND",
            "TEAM_REGISTRATION_ALREADY_SUBMITTED",
            "TEAM_REGISTRATION_INCOMPLETE",
          ],
          execute: async () => await service.submit(context.teamAccess, input.teamId),
          log: context.log,
          onSuccess: (submitted) => ({
            changes: {
              after: {
                submissionState: submitted.submissionState,
                submittedAt: submitted.submittedAt,
              },
              before: { submissionState: "DRAFT", submittedAt: null },
            },
          }),
        });
        context.log.set({ teamRegistrationStatus: { teamId: status.teamId } });

        return status;
      }),
  };
}
