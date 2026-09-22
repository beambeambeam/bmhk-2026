import { z } from "zod";
import type {
  RegistrationProcedure,
  TeamAccessProcedure,
  TeamRemovalProcedure,
} from "../../core/procedure";
import { awardChangedAudit, teamDeletedAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import type { FeatureFlagService } from "../feature-flags/feature-flags.service";
import { assertAllowedOrigin } from "../files/files.service";
import { createRegistrationClosedError } from "./teams.errors";
import type { TeamService } from "./teams.service";
import { toVisibleTeam } from "./teams.visibility";
import {
  createTeamSchema,
  deleteTeamResultSchema,
  listTeamsSchema,
  setTeamAwardSchema,
  teamIdInputSchema,
  teamListResultSchema,
  teamSchema,
  teamOwnerDetailsSchema,
  teamOwnerSchema,
  updateTeamSchema,
} from "./teams.schema";

const imageSchema = teamIdInputSchema.extend({ file: z.file() }).strict();

export function createTeamsRouter(
  registrationProcedure: RegistrationProcedure,
  teamAccessProcedure: TeamAccessProcedure,
  teamRemovalProcedure: TeamRemovalProcedure,
  service: TeamService,
  featureFlagService: FeatureFlagService,
) {
  return {
    create: teamAccessProcedure
      .route({
        method: "POST",
        tags: ["Team"],
      })
      .input(createTeamSchema)
      .output(teamOwnerSchema)
      .handler(async ({ context, input }) => {
        if (!featureFlagService.getAll().registration) {
          throw createRegistrationClosedError();
        }
        const team = toVisibleTeam(
          await service.create(context.session.user.id, input),
          context.teamAccess,
          featureFlagService,
        );
        context.log.set({ team: { id: team.id } });
        return team;
      }),
    delete: teamRemovalProcedure
      .route({
        method: "DELETE",
        tags: ["Team"],
      })
      .input(teamIdInputSchema)
      .output(deleteTeamResultSchema)
      .handler(async ({ context, input }) => {
        const result = await executeAudited({
          audit: teamDeletedAudit({
            actor: { id: context.teamAccess.actorId, type: "user" },
            target: { id: input.id, teamId: input.id },
          }),
          deniedErrorCodes: ["TEAM_NOT_FOUND"],
          execute: async () => await service.delete(context.teamAccess, input.id),
          log: context.log,
        });

        context.log.set({ team: { id: input.id } });
        return result;
      }),
    get: teamAccessProcedure
      .route({
        method: "GET",
        tags: ["Team"],
      })
      .input(teamIdInputSchema)
      .output(teamOwnerDetailsSchema)
      .handler(async ({ context, input }) => {
        const team = await service.get(context.teamAccess, input.id);
        const visibleTeam = toVisibleTeam(team, context.teamAccess, featureFlagService);

        context.log.set({ team: { id: visibleTeam.id } });
        return visibleTeam;
      }),
    image: teamAccessProcedure
      .route({ method: "POST", tags: ["Team", "File"] })
      .input(imageSchema)
      .output(teamOwnerSchema)
      .handler(async ({ context, input }) => {
        assertAllowedOrigin(context.headers);
        const { file, team } = await service.uploadImage({
          access: context.teamAccess,
          file: input.file,
          id: input.id,
          log: context.log,
        });

        context.log.set({
          file: { contentType: file.contentType, id: file.id, sizeBytes: file.sizeBytes },
          team: { id: input.id },
        });

        return toVisibleTeam(team, context.teamAccess, featureFlagService);
      }),
    list: registrationProcedure
      .route({
        method: "GET",
        tags: ["Team"],
      })
      .input(listTeamsSchema)
      .output(teamListResultSchema)
      .handler(async ({ context, input }) => await service.list(context.teamAccess, input)),
    setAward: registrationProcedure
      .route({ method: "PATCH", tags: ["Team"] })
      .input(setTeamAwardSchema)
      .output(teamSchema)
      .handler(async ({ context, input }) => {
        const { team } = await executeAudited({
          audit: awardChangedAudit({
            actor: { id: context.teamAccess.actorId, type: "user" },
            target: { id: input.id, teamId: input.id },
          }),
          execute: async () => await service.setAward(context.teamAccess, input.id, input.award),
          log: context.log,
          onSuccess: ({ previous, team: changedTeam }) => ({
            changes: {
              after: { award: changedTeam.award },
              before: { award: previous.award },
            },
          }),
        });
        context.log.set({ team: { id: team.id } });
        return team;
      }),
    update: teamAccessProcedure
      .route({
        method: "PATCH",
        tags: ["Team"],
      })
      .input(updateTeamSchema)
      .output(teamOwnerSchema)
      .handler(async ({ context, input }) => {
        const team = await service.update(context.teamAccess, input.id, input.data);
        const visibleTeam = toVisibleTeam(team, context.teamAccess, featureFlagService);

        context.log.set({ team: { id: visibleTeam.id } });
        return visibleTeam;
      }),
  };
}
