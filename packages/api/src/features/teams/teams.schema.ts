import { teamRegistrationReviewStatusValues } from "@bmhk-2026/db/schema/team-registration-reviews";
import { teamAwardValues, teams } from "@bmhk-2026/db/schema/teams";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

import { fileWithUrlSchema } from "../files/files.schema";
import { teamNameSchema } from "./teams.rules";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 120;

const teamFieldRefinements = {
  memberCount: (schema: z.ZodNumber) => schema.nonnegative(),
  name: () => teamNameSchema,
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
export const teamListSortValues = [
  "name",
  "school",
  "memberCount",
  "registrationStatus",
  "award",
] as const;
export const teamListSortSchema = z.enum(teamListSortValues);
// "ALL" disables the filter; the remaining values mirror the team_award enum.
export const teamAwardFilterValues = ["ALL", ...teamAwardValues] as const;
export const teamAwardFilterSchema = z.enum(teamAwardFilterValues);

export const listTeamsSchema = z
  .object({
    award: teamAwardFilterSchema.default("ALL"),
    limit: z.int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
    offset: z.int().nonnegative().default(0),
    search: z.string().trim().max(MAX_SEARCH_LENGTH).default(""),
    sortBy: teamListSortSchema.default("name"),
    sortDesc: z.boolean().default(false),
  })
  .strict()
  .default({
    award: "ALL",
    limit: DEFAULT_LIMIT,
    offset: 0,
    search: "",
    sortBy: "name",
    sortDesc: false,
  });
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
// Registration status is read live from the team's review record rather than stored on
// the team, so approving on the review flow is reflected here with nothing to keep in sync.
export const teamListRegistrationStatusSchema = z.enum(teamRegistrationReviewStatusValues);
export const teamListRowSchema = teamSchema
  .extend({ registrationStatus: teamListRegistrationStatusSchema })
  .strict();
export const teamListResultSchema = z
  .object({ data: z.array(teamListRowSchema), pagination: teamListPaginationSchema })
  .strict();

export type Team = z.output<typeof teamSchema>;
export type TeamListRow = z.output<typeof teamListRowSchema>;
export type TeamListRegistrationStatus = z.output<typeof teamListRegistrationStatusSchema>;
export type TeamListInput = z.output<typeof listTeamsSchema>;
export type TeamListSort = z.output<typeof teamListSortSchema>;
export type TeamAwardFilter = z.output<typeof teamAwardFilterSchema>;
export type TeamDetails = z.output<typeof teamDetailsSchema>;
export type TeamAward = Team["award"];
export type CreateTeamData = z.output<typeof createTeamSchema>;
export type UpdateTeamData = z.output<typeof updateTeamDataSchema>;
export type TeamListPagination = z.output<typeof teamListPaginationSchema>;
export type TeamListResult = z.output<typeof teamListResultSchema>;
