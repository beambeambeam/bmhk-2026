import type { ProtectedProcedure } from "../../core/procedure";
import { createTeamAlreadyExistsError, createTeamNotFoundError } from "./teams.errors";
import { createTeamListPagination } from "./teams.pagination";
import type { TeamRepository } from "./teams.repository";
import {
  createTeamSchema,
  deleteTeamResultSchema,
  listTeamsSchema,
  teamIdInputSchema,
  teamListResultSchema,
  teamSchema,
  updateTeamSchema,
} from "./teams.schemas";

export function createTeamsRouter(
  protectedProcedure: ProtectedProcedure,
  repository: TeamRepository,
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
        const existingTeam = await repository.findByUserId(context.session.user.id);
        if (existingTeam) {
          throw createTeamAlreadyExistsError();
        }

        const team = await repository.create(context.session.user.id, input);
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
        const deleted = await repository.delete(context.session.user.id, input.id);
        if (!deleted) {
          throw createTeamNotFoundError();
        }

        context.log.set({ team: { id: input.id } });
        return { id: input.id };
      }),
    get: protectedProcedure
      .route({
        method: "GET",
        tags: ["Team"],
      })
      .input(teamIdInputSchema)
      .output(teamSchema)
      .handler(async ({ context, input }) => {
        const team = await repository.findById(context.session.user.id, input.id);
        if (!team) {
          throw createTeamNotFoundError();
        }

        context.log.set({ team: { id: team.id } });
        return team;
      }),
    list: protectedProcedure
      .route({
        method: "GET",
        tags: ["Team"],
      })
      .input(listTeamsSchema)
      .output(teamListResultSchema)
      .handler(async ({ context, input }) => {
        const result = await repository.list(context.session.user.id, input);
        return {
          data: result.data,
          pagination: createTeamListPagination({
            limit: input.limit,
            offset: input.offset,
            total: result.total,
          }),
        };
      }),
    update: protectedProcedure
      .route({
        method: "PATCH",
        tags: ["Team"],
      })
      .input(updateTeamSchema)
      .output(teamSchema)
      .handler(async ({ context, input }) => {
        const team = await repository.update(context.session.user.id, input.id, input.data);
        if (!team) {
          throw createTeamNotFoundError();
        }

        context.log.set({ team: { id: team.id } });
        return team;
      }),
  };
}
