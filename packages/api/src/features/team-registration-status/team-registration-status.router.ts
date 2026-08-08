import type { ProtectedProcedure } from "../../core/procedure";
import type { TeamRegistrationStatusService } from "./team-registration-status.service";
import {
  teamRegistrationStatusInputSchema,
  teamRegistrationStatusSchema,
} from "./team-registration-status.schema";

export function createTeamRegistrationStatusRouter(
  protectedProcedure: ProtectedProcedure,
  service: TeamRegistrationStatusService,
) {
  return {
    get: protectedProcedure
      .route({ method: "GET", tags: ["Team Registration Status"] })
      .input(teamRegistrationStatusInputSchema)
      .output(teamRegistrationStatusSchema)
      .handler(async ({ context }) => {
        const status = await service.get(context.session.user.id);
        context.log.set({ teamRegistrationStatus: { teamId: status.teamId } });

        return status;
      }),
  };
}
