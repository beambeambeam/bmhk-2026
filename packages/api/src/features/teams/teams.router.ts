import { createError } from "evlog";
import { z } from "zod";

import type { ProtectedProcedure } from "../../core/procedure";
import type { TeamRepository } from "./teams.repository";
import type { TeamListPagination } from "./teams.types";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const awardSchema = z.string().trim().min(1).max(200);
const memberCountSchema = z.int().nonnegative();
const nameSchema = z.string().trim().min(1).max(120);
const schoolSchema = z.string().trim().min(1).max(200);
const teamIdSchema = z.uuid();

const createTeamSchema = z
  .object({
    award: awardSchema,
    memberCount: memberCountSchema.default(0),
    name: nameSchema,
    school: schoolSchema,
  })
  .strict();

const listTeamsSchema = z
  .object({
    limit: z.int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
    offset: z.int().nonnegative().default(0),
  })
  .strict()
  .default({ limit: DEFAULT_LIMIT, offset: 0 });

const updateTeamDataSchema = z
  .object({
    award: awardSchema.optional(),
    memberCount: memberCountSchema.optional(),
    name: nameSchema.optional(),
    school: schoolSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one team field is required",
  });

const updateTeamSchema = z
  .object({
    data: updateTeamDataSchema,
    id: teamIdSchema,
  })
  .strict();

function createTeamNotFoundError() {
  return createError({
    code: "TEAM_NOT_FOUND",
    fix: "Check the team ID and try again",
    message: "Team not found",
    status: 404,
    why: "No team owned by the current user matches this ID",
  });
}

function createPagination({
  limit,
  offset,
  total,
}: {
  limit: number;
  offset: number;
  total: number;
}): TeamListPagination {
  return {
    currentPage: Math.floor(offset / limit) + 1,
    limit,
    nextOffset: offset + limit < total ? offset + limit : null,
    offset,
    previousOffset: offset > 0 ? Math.max(0, offset - limit) : null,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

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
    delete: protectedProcedure
      .input(z.object({ id: teamIdSchema }).strict())
      .handler(async ({ context, input }) => {
        const deleted = await repository.delete(context.session.user.id, input.id);
        if (!deleted) {
          throw createTeamNotFoundError();
        }

        context.log.set({ team: { id: input.id } });
        return { id: input.id };
      }),
    get: protectedProcedure
      .input(z.object({ id: teamIdSchema }).strict())
      .handler(async ({ context, input }) => {
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
        pagination: createPagination({
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
