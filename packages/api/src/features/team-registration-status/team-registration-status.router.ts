import type { TeamAccessProcedure } from "../../core/procedure";
import type { TeamRegistrationStatusService } from "./team-registration-status.service";
import {
  teamRegistrationStatusInputSchema,
  teamRegistrationStatusSchema,
} from "./team-registration-status.schema";

export function createTeamRegistrationStatusRouter(
  teamAccessProcedure: TeamAccessProcedure,
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
  };
}
