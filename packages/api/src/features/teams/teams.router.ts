import { z } from "zod";
import type { ProtectedProcedure } from "../../core/procedure";
import { assertAllowedOrigin } from "../files/files.service";
import type { TeamService } from "./teams.service";
import {
  createTeamSchema,
  deleteTeamResultSchema,
  listTeamsSchema,
  teamDetailsSchema,
  teamIdInputSchema,
  teamListResultSchema,
  teamSchema,
  updateTeamSchema,
} from "./teams.schema";

const imageSchema = teamIdInputSchema.extend({ file: z.file() }).strict();

export function createTeamsRouter(protectedProcedure: ProtectedProcedure, service: TeamService) {
  return {
    create: protectedProcedure
      .route({
        method: "POST",
        tags: ["Team"],
      })
      .input(createTeamSchema)
      .output(teamSchema)
      .handler(async ({ context, input }) => {
        const team = await service.create(context.session.user.id, input);
        context.log.set({ team: { id: team.id } });
        return team;
      }),
    delete: protectedProcedure
      .route({
        method: "DELETE",
        tags: ["Team"],
      })
      .input(teamIdInputSchema)
      .output(deleteTeamResultSchema)
      .handler(async ({ context, input }) => {
        const result = await service.delete(context.session.user.id, input.id);

        context.log.set({ team: { id: input.id } });
        return result;
      }),
    get: protectedProcedure
      .route({
        method: "GET",
        tags: ["Team"],
      })
      .input(teamIdInputSchema)
      .output(teamDetailsSchema)
      .handler(async ({ context, input }) => {
        const team = await service.get(context.session.user.id, input.id);

        context.log.set({ team: { id: team.id } });
        return team;
      }),
    image: protectedProcedure
      .route({ method: "POST", tags: ["Team", "File"] })
      .input(imageSchema)
      .output(teamSchema)
      .handler(async ({ context, input }) => {
        assertAllowedOrigin(context.headers);
        const { file, team } = await service.uploadImage({
          file: input.file,
          id: input.id,
          log: context.log,
          userId: context.session.user.id,
        });

        context.log.set({
          file: { contentType: file.contentType, id: file.id, sizeBytes: file.sizeBytes },
          team: { id: input.id },
        });

        return team;
      }),
    list: protectedProcedure
      .route({
        method: "GET",
        tags: ["Team"],
      })
      .input(listTeamsSchema)
      .output(teamListResultSchema)
      .handler(async ({ context, input }) => await service.list(context.session.user.id, input)),
    update: protectedProcedure
      .route({
        method: "PATCH",
        tags: ["Team"],
      })
      .input(updateTeamSchema)
      .output(teamSchema)
      .handler(async ({ context, input }) => {
        const team = await service.update(context.session.user.id, input.id, input.data);

        context.log.set({ team: { id: team.id } });
        return team;
      }),
  };
}
