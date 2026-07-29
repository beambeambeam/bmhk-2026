import type { ProtectedProcedure } from "../../core/procedure";
import { createTeamNotFoundError } from "../teams/teams.service";
import type { TeamConsentRepository } from "./team-consents.repository";
import { createTeamConsentNotFoundError } from "./team-consents.service";
import {
  createTeamConsentSchema,
  teamConsentSchema,
  teamConsentTeamInputSchema,
  updateTeamConsentSchema,
} from "./team-consents.schema";

export function createTeamConsentsRouter(
  protectedProcedure: ProtectedProcedure,
  repository: TeamConsentRepository,
) {
  return {
    create: protectedProcedure
      .route({ method: "POST", tags: ["Team Consent"] })
      .input(createTeamConsentSchema)
      .output(teamConsentSchema)
      .handler(async ({ context, input }) => {
        const consent = await repository.create(context.session.user.id, input);

        if (!consent) {
          throw createTeamNotFoundError();
        }

        context.log.set({ teamConsent: { id: consent.id, teamId: consent.teamId } });
        return consent;
      }),
    get: protectedProcedure
      .route({ method: "GET", tags: ["Team Consent"] })
      .input(teamConsentTeamInputSchema)
      .output(teamConsentSchema)
      .handler(async ({ context, input }) => {
        const consent = await repository.findByTeamId(context.session.user.id, input.teamId);

        if (!consent) {
          throw createTeamConsentNotFoundError();
        }

        context.log.set({ teamConsent: { id: consent.id, teamId: consent.teamId } });
        return consent;
      }),
    update: protectedProcedure
      .route({ method: "PATCH", tags: ["Team Consent"] })
      .input(updateTeamConsentSchema)
      .output(teamConsentSchema)
      .handler(async ({ context, input }) => {
        const consent = await repository.update(context.session.user.id, input.teamId, input.data);

        if (!consent) {
          throw createTeamConsentNotFoundError();
        }

        context.log.set({ teamConsent: { id: consent.id, teamId: consent.teamId } });
        return consent;
      }),
  };
}
