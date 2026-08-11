import type { TeamAccessProcedure, TeamOwnerProcedure } from "../../core/procedure";
import type { TeamRegistrationStatusService } from "./team-registration-status.service";
import {
  teamRegistrationStatusInputSchema,
  teamRegistrationStatusSchema,
} from "./team-registration-status.schema";
import { teamRegistrationSubmittedAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";

export function createTeamRegistrationStatusRouter(
  teamAccessProcedure: TeamAccessProcedure,
  teamOwnerProcedure: TeamOwnerProcedure,
  service: TeamRegistrationStatusService,
) {
  return {
    get: teamAccessProcedure
      .route({ method: "GET", tags: ["Team Registration Status"] })
      .input(teamRegistrationStatusInputSchema)
      .output(teamRegistrationStatusSchema)
      .handler(async ({ context, input }) => {
        const status = await service.get(context.teamAccess, input.teamId);
        context.log.set({ teamRegistrationStatus: { teamId: status.teamId } });

        return status;
      }),
    submit: teamOwnerProcedure
      .route({ method: "POST", tags: ["Team Registration Status"] })
      .input(teamRegistrationStatusInputSchema)
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
