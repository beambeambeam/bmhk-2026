import type { ProtectedProcedure } from "../../core/procedure";
import { createTeamNotFoundError } from "../teams/teams.service";
import type { TeamRegistrationStatusRepository } from "./team-registration-status.repository";
import { calculateTeamRegistrationStatus } from "./team-registration-status.service";
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
      .handler(async ({ context }) => {
        const findTeamStatus = repository.find;
        const facts = await findTeamStatus(context.session.user.id);

        if (!facts) {
          throw createTeamNotFoundError();
        }

        const status = calculateTeamRegistrationStatus(facts);
        context.log.set({ teamRegistrationStatus: { teamId: status.teamId } });
        return status;
      }),
  };
}
