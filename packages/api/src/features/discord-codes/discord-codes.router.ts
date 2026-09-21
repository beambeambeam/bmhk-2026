import type { RegistrationProcedure, TeamOwnerProcedure } from "../../core/procedure";
import { discordCodeListSchema, discordCodeTeamInputSchema } from "./discord-codes.schema";
import type { DiscordCodeService } from "./discord-codes.service";

export function createDiscordCodesRouter(
  registrationProcedure: RegistrationProcedure,
  teamOwnerProcedure: TeamOwnerProcedure,
  service: DiscordCodeService,
) {
  return {
    getByTeamId: registrationProcedure
      .route({ method: "GET", tags: ["Discord Codes"] })
      .input(discordCodeTeamInputSchema)
      .output(discordCodeListSchema)
      .handler(async ({ input }) => await service.getForTeam(input.teamId)),
    // Writes on first call, so POST rather than GET.
    getOrCreate: teamOwnerProcedure
      .route({ method: "POST", tags: ["Discord Codes"] })
      .output(discordCodeListSchema)
      .handler(
        async ({ context }) => await service.getOrCreateForOwner(context.teamAccess.actorId),
      ),
  };
}
