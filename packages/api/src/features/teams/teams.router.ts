import { z } from "zod";
import type {
  ProtectedProcedure,
  RegistrationProcedure,
  TeamAccessProcedure,
  TeamOwnerProcedure,
} from "../../core/procedure";
import { awardChangedAudit, teamCreatedAudit, teamDeletedAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import { assertAllowedOrigin } from "../files/files.service";
import type { TeamService } from "./teams.service";
import {
  createTeamSchema,
  deleteTeamResultSchema,
  listTeamsSchema,
  setTeamAwardSchema,
  teamDetailsSchema,
  teamIdInputSchema,
  teamListResultSchema,
  teamSchema,
  updateTeamSchema,
} from "./teams.schema";

const imageSchema = teamIdInputSchema.extend({ file: z.file() }).strict();

export function createTeamsRouter(
  protectedProcedure: ProtectedProcedure,
  registrationProcedure: RegistrationProcedure,
  teamAccessProcedure: TeamAccessProcedure,
  teamOwnerProcedure: TeamOwnerProcedure,
  service: TeamService,
) {
  return {
    create: protectedProcedure
      .route({
        method: "POST",
        tags: ["Team"],
      })
      .input(createTeamSchema)
      .output(teamSchema)
      .handler(async ({ context, input }) => {
        const actorId = context.session.user.id;
        const team = await executeAudited({
          audit: teamCreatedAudit({
            actor: { id: actorId, type: "user" },
            target: { id: actorId, type: "team" },
          }),
          deniedErrorCodes: ["TEAM_ALREADY_EXISTS"],
          execute: async () => await service.create(actorId, input),
          log: context.log,
          onSuccess: (created) => ({
            target: { id: created.id, teamId: created.id, type: "team" },
          }),
        });
        context.log.set({ team: { id: team.id } });
        return team;
      }),
    delete: teamOwnerProcedure
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
      .output(teamDetailsSchema)
      .handler(async ({ context, input }) => {
        const team = await service.get(context.teamAccess, input.id);

        context.log.set({ team: { id: team.id } });
        return team;
      }),
    image: teamAccessProcedure
      .route({ method: "POST", tags: ["Team", "File"] })
      .input(imageSchema)
      .output(teamSchema)
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

        return team;
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
      .output(teamSchema)
      .handler(async ({ context, input }) => {
        const team = await service.update(context.teamAccess, input.id, input.data);

        context.log.set({ team: { id: team.id } });
        return team;
      }),
  };
}
