import type { ProtectedProcedure } from "../../core/procedure";
import { createTeamNotFoundError } from "../teams/teams.service";
import type { TeamRegistrationStatusRepository } from "./team-registration-status.repository";
import {
  calculateTeamRegistrationStatus,
  createNotStartedTeamRegistrationStatus,
} from "./team-registration-status.service";
import {
  teamRegistrationStatusInputSchema,
  teamRegistrationStatusSchema,
} from "./team-registration-status.schema";

export function createTeamRegistrationStatusRouter(
  protectedProcedure: ProtectedProcedure,
  repository: TeamRegistrationStatusRepository,
) {
  return {
    get: protectedProcedure
      .route({ method: "GET", tags: ["Team Registration Status"] })
      .input(teamRegistrationStatusInputSchema)
      .output(teamRegistrationStatusSchema)
      .handler(async ({ context, input }) => {
        const findTeamStatus = repository.find;
        const facts = await findTeamStatus(context.session.user.id, input.teamId);

        if (!facts && input.teamId !== undefined) {
          throw createTeamNotFoundError();
        }

        const status = facts
          ? calculateTeamRegistrationStatus(facts)
          : createNotStartedTeamRegistrationStatus();
        context.log.set({ teamRegistrationStatus: { teamId: status.teamId } });
        return status;
      }),
  };
}
