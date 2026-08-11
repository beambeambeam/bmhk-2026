import { teams } from "@bmhk-2026/db/schema/teams";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

import { fileWithUrlSchema } from "../files/files.schema";

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
export const teamDetailsSchema = teamSchema
  .omit({ image: true })
  .extend({ image: fileWithUrlSchema.nullable() })
  .strict();
const createTeamFieldsSchema = teamInsertSchema
  .pick({ memberCount: true, name: true, school: true })
  .strict();
export const createTeamSchema = createTeamFieldsSchema
  .extend({
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
  .pick({ memberCount: true, name: true, school: true })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one team field is required",
  });
export const updateTeamSchema = teamIdInputSchema.extend({ data: updateTeamDataSchema }).strict();
export const setTeamAwardSchema = teamIdInputSchema
  .extend({ award: teamSchema.shape.award })
  .strict();
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
  .object({ data: z.array(teamSchema), pagination: teamListPaginationSchema })
  .strict();

export type Team = z.output<typeof teamSchema>;
export type TeamDetails = z.output<typeof teamDetailsSchema>;
export type TeamAward = Team["award"];
export type CreateTeamData = z.output<typeof createTeamSchema>;
export type UpdateTeamData = z.output<typeof updateTeamDataSchema>;
export type TeamListPagination = z.output<typeof teamListPaginationSchema>;
export type TeamListResult = z.output<typeof teamListResultSchema>;
