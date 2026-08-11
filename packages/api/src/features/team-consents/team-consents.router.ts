import type { TeamAccessProcedure } from "../../core/procedure";
import type { TeamConsentService } from "./team-consents.service";
import {
  createTeamConsentSchema,
  teamConsentSchema,
  teamConsentTeamInputSchema,
  updateTeamConsentSchema,
} from "./team-consents.schema";

export function createTeamConsentsRouter(
  teamAccessProcedure: TeamAccessProcedure,
  service: TeamConsentService,
) {
  return {
    create: teamAccessProcedure
      .route({ method: "POST", tags: ["Team Consent"] })
      .input(createTeamConsentSchema)
      .output(teamConsentSchema)
      .handler(async ({ context, input }) => {
        const consent = await service.create(context.teamAccess, input);

        context.log.set({ teamConsent: { id: consent.id, teamId: consent.teamId } });
        return consent;
      }),
    get: teamAccessProcedure
      .route({ method: "GET", tags: ["Team Consent"] })
      .input(teamConsentTeamInputSchema)
      .output(teamConsentSchema)
      .handler(async ({ context, input }) => {
        const consent = await service.get(context.teamAccess, input.teamId);

        context.log.set({ teamConsent: { id: consent.id, teamId: consent.teamId } });
        return consent;
      }),
    update: teamAccessProcedure
      .route({ method: "PATCH", tags: ["Team Consent"] })
      .input(updateTeamConsentSchema)
      .output(teamConsentSchema)
      .handler(async ({ context, input }) => {
        const consent = await service.update(context.teamAccess, input.teamId, input.data);

        context.log.set({ teamConsent: { id: consent.id, teamId: consent.teamId } });
        return consent;
      }),
  };
}
