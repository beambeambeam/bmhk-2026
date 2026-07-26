import type { ProtectedProcedure } from "../../core/procedure";
import { createTeamNotFoundError } from "./teams.errors";
import { createTeamListPagination } from "./teams.pagination";
import type { TeamRepository } from "./teams.repository";
import {
  createTeamSchema,
  listTeamsSchema,
  teamIdInputSchema,
  updateTeamSchema,
} from "./teams.schemas";

export function createTeamsRouter(
  protectedProcedure: ProtectedProcedure,
  repository: TeamRepository,
) {
  return {
    create: protectedProcedure.input(createTeamSchema).handler(async ({ context, input }) => {
      const team = await repository.create(context.session.user.id, input);
      context.log.set({ team: { id: team.id } });
      return team;
    }),
    delete: protectedProcedure.input(teamIdInputSchema).handler(async ({ context, input }) => {
      const deleted = await repository.delete(context.session.user.id, input.id);
      if (!deleted) {
        throw createTeamNotFoundError();
      }

      context.log.set({ team: { id: input.id } });
      return { id: input.id };
    }),
    get: protectedProcedure.input(teamIdInputSchema).handler(async ({ context, input }) => {
      const team = await repository.findById(context.session.user.id, input.id);
      if (!team) {
        throw createTeamNotFoundError();
      }

      context.log.set({ team: { id: team.id } });
      return team;
    }),
    list: protectedProcedure.input(listTeamsSchema).handler(async ({ context, input }) => {
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
    update: protectedProcedure.input(updateTeamSchema).handler(async ({ context, input }) => {
      const team = await repository.update(context.session.user.id, input.id, input.data);
      if (!team) {
        throw createTeamNotFoundError();
      }

      context.log.set({ team: { id: team.id } });
      return team;
    }),
  };
}
