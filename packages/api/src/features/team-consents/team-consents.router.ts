import type { ProtectedProcedure } from "../../core/procedure";
import type { TeamConsentService } from "./team-consents.service";
import {
  createTeamConsentSchema,
  teamConsentSchema,
  teamConsentTeamInputSchema,
  updateTeamConsentSchema,
} from "./team-consents.schema";

export function createTeamConsentsRouter(
  protectedProcedure: ProtectedProcedure,
  service: TeamConsentService,
) {
  return {
    create: protectedProcedure
      .route({ method: "POST", tags: ["Team Consent"] })
      .input(createTeamConsentSchema)
      .output(teamConsentSchema)
      .handler(async ({ context, input }) => {
        const consent = await service.create(context.session.user.id, input);

        context.log.set({ teamConsent: { id: consent.id, teamId: consent.teamId } });
        return consent;
      }),
    get: protectedProcedure
      .route({ method: "GET", tags: ["Team Consent"] })
      .input(teamConsentTeamInputSchema)
      .output(teamConsentSchema)
      .handler(async ({ context, input }) => {
        const consent = await service.get(context.session.user.id, input.teamId);

        context.log.set({ teamConsent: { id: consent.id, teamId: consent.teamId } });
        return consent;
      }),
    update: protectedProcedure
      .route({ method: "PATCH", tags: ["Team Consent"] })
      .input(updateTeamConsentSchema)
      .output(teamConsentSchema)
      .handler(async ({ context, input }) => {
        const consent = await service.update(context.session.user.id, input.teamId, input.data);

        context.log.set({ teamConsent: { id: consent.id, teamId: consent.teamId } });
        return consent;
      }),
  };
}
