import { checkInRoundValues } from "@bmhk-2026/db/schema/check-in-round";
import { z } from "zod";

import { createTableListResultSchema, createTableQuerySchema } from "../../core/table-query";

const MAX_SUBMISSION_COUNT = 2_147_483_647;
function hasScorePrecision(score: number): boolean {
  // Match the decimal representation sent to PostgreSQL without epsilon tolerance
  // or multiplying large finite scores into Infinity.
  const [coefficient = "", exponent = "0"] = score.toString().split("e");
  const [, fraction = ""] = coefficient.split(".");
  return fraction.length - Number(exponent) <= 2;
}

const scoreSchema = z
  .number()
  .refine(hasScorePrecision, { message: "Score must have at most two decimal places" })
  .nullable();
const countSchema = z.int().nonnegative().max(MAX_SUBMISSION_COUNT);
export const teamRoundResultRoundSchema = z.enum(checkInRoundValues);
export const teamRoundResultTeamSchema = z
  .object({ id: z.uuid(), index: z.int().positive(), name: z.string() })
  .strict();
export const teamRoundResultSchema = z
  .object({
    completedAssignment: countSchema,
    createdAt: z.date(),
    lastSubmittedAt: z.date().nullable(),
    round: teamRoundResultRoundSchema,
    score: scoreSchema,
    teamId: z.uuid(),
    totalSubmission: countSchema,
    updatedAt: z.date(),
  })
  .strict();
export const getTeamRoundResultsSchema = z.object({ teamId: z.uuid() }).strict();
export const saveTeamRoundResultSchema = teamRoundResultSchema.omit({
  createdAt: true,
  updatedAt: true,
});
const teamRoundResultColumnFilterSchema = z.discriminatedUnion("id", [
  z.object({ id: z.literal("team"), value: z.string().trim().max(255) }).strict(),
  z.object({ id: z.literal("teamCheckIn"), value: z.literal("registered") }).strict(),
]);
export const listTeamRoundResultsSchema = createTableQuerySchema({
  columnFilterSchema: teamRoundResultColumnFilterSchema,
  defaultPageSize: 10,
  defaultSorting: [{ desc: false, id: "teamCode" }],
  maxColumnFilters: 2,
  sortableColumnIds: [
    "teamCode",
    "teamName",
    "score",
    "totalSubmission",
    "completedAssignment",
    "lastSubmittedAt",
  ],
}).extend({ round: teamRoundResultRoundSchema });
export const teamRoundResultListSchema = createTableListResultSchema(
  z
    .object({
      result: teamRoundResultSchema.nullable(),
      round: teamRoundResultRoundSchema,
      team: teamRoundResultTeamSchema,
    })
    .strict(),
);
export const teamRoundResultsDetailSchema = z
  .object({
    rounds: z.array(
      z
        .object({ result: teamRoundResultSchema.nullable(), round: teamRoundResultRoundSchema })
        .strict(),
    ),
    team: teamRoundResultTeamSchema,
  })
  .strict();

export type TeamRoundResult = z.infer<typeof teamRoundResultSchema>;
export type TeamRoundResultTeam = z.infer<typeof teamRoundResultTeamSchema>;
export type TeamRoundResultsDetail = z.infer<typeof teamRoundResultsDetailSchema>;
export type SaveTeamRoundResultInput = z.infer<typeof saveTeamRoundResultSchema>;
export type TeamRoundResultColumnFilter = z.infer<typeof teamRoundResultColumnFilterSchema>;
export type TeamRoundResultListInput = z.input<typeof listTeamRoundResultsSchema>;
export type TeamRoundResultListQuery = z.output<typeof listTeamRoundResultsSchema>;
export type TeamRoundResultList = z.infer<typeof teamRoundResultListSchema>;
