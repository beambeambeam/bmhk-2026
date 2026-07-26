import { teams } from "@bmhk-2026/db/schema/teams";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const teamFieldRefinements = {
  memberCount: (schema: z.ZodNumber) => schema.nonnegative(),
  name: (schema: z.ZodString) => schema.trim().min(1).max(120),
  school: (schema: z.ZodString) => schema.trim().min(1).max(200),
};

const teamInsertSchema = createInsertSchema(teams, teamFieldRefinements);
const teamUpdateSchema = createUpdateSchema(teams, teamFieldRefinements);

export const teamSchema = createSelectSchema(teams).strict();

const createTeamFieldsSchema = teamInsertSchema
  .pick({
    award: true,
    memberCount: true,
    name: true,
    school: true,
  })
  .strict();

export const createTeamSchema = createTeamFieldsSchema
  .extend({
    award: createTeamFieldsSchema.shape.award.default("NO_ACHIEVEMENT"),
    memberCount: createTeamFieldsSchema.shape.memberCount.default(0),
  })
  .strict();

export const listTeamsSchema = z
  .object({
    limit: z.int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
    offset: z.int().nonnegative().default(0),
  })
  .strict()
  .default({ limit: DEFAULT_LIMIT, offset: 0 });

export const teamIdInputSchema = teamSchema.pick({ id: true }).strict();
export const deleteTeamResultSchema = teamIdInputSchema;

export const updateTeamDataSchema = teamUpdateSchema
  .pick({
    award: true,
    memberCount: true,
    name: true,
    school: true,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one team field is required",
  });

export const updateTeamSchema = teamIdInputSchema.extend({ data: updateTeamDataSchema }).strict();

export const teamListPaginationSchema = z
  .object({
    currentPage: z.int().positive(),
    limit: z.int().min(1).max(MAX_LIMIT),
    nextOffset: z.int().nonnegative().nullable(),
    offset: z.int().nonnegative(),
    previousOffset: z.int().nonnegative().nullable(),
    total: z.int().nonnegative(),
    totalPages: z.int().nonnegative(),
  })
  .strict();

export const teamListResultSchema = z
  .object({
    data: z.array(teamSchema),
    pagination: teamListPaginationSchema,
  })
  .strict();
