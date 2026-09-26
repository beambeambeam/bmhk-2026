import { checkInRoundValues } from "@bmhk-2026/db/schema/check-in-round";
import { teamAwardValues } from "@bmhk-2026/db/schema/teams";
import { z } from "zod";

import { createTableListResultSchema, createTableQuerySchema } from "../../core/table-query";
import { finalTeamRoundAwardValues } from "./team-round-results.rules";

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
export const teamRoundResultAwardSchema = z.enum(teamAwardValues);
export const finalTeamRoundAwardSchema = z.enum(finalTeamRoundAwardValues);
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
  z.object({ id: z.literal("teamCode"), value: z.string().trim().max(255) }).strict(),
  z.object({ id: z.literal("teamName"), value: z.string().trim().max(255) }).strict(),
  z.object({ id: z.literal("teamCheckIn"), value: z.literal("registered") }).strict(),
]);
export const listTeamRoundResultsSchema = createTableQuerySchema({
  columnFilterSchema: teamRoundResultColumnFilterSchema,
  defaultPageSize: 10,
  defaultSorting: [{ desc: false, id: "teamCode" }],
  maxColumnFilters: 3,
  sortableColumnIds: [
    "teamCode",
    "teamName",
    "score",
    "totalSubmission",
    "completedAssignment",
    "lastSubmittedAt",
    "createdAt",
    "updatedAt",
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
export const getTeamRoundResultOutcomeSchema = z
  .object({ round: teamRoundResultRoundSchema, teamId: z.uuid() })
  .strict();
const teamRoundResultOutcomeActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ADVANCE") }).strict(),
  z.object({ type: z.literal("REVERT") }).strict(),
  z.object({ award: finalTeamRoundAwardSchema, type: z.literal("SET_FINAL_AWARD") }).strict(),
  z.object({ type: z.literal("REMOVE_FINAL_AWARD") }).strict(),
]);
export const setTeamRoundResultOutcomeSchema = z
  .object({
    action: teamRoundResultOutcomeActionSchema,
    expectedAward: teamRoundResultAwardSchema,
    round: teamRoundResultRoundSchema,
    teamId: z.uuid(),
  })
  .strict()
  .superRefine(({ action, round }, context) => {
    const isFinalAwardAction =
      action.type === "SET_FINAL_AWARD" || action.type === "REMOVE_FINAL_AWARD";
    if (isFinalAwardAction && round !== "ROUND_3") {
      context.addIssue({ code: "custom", message: "Final awards can only be set in round 3" });
      return;
    }
    if (!isFinalAwardAction && round === "ROUND_3") {
      context.addIssue({ code: "custom", message: "Round 3 has no next-round eligibility" });
    }
  });
export const teamRoundResultOutcomeSchema = z
  .object({
    actions: z
      .object({
        canAdvance: z.boolean(),
        canRemoveFinalAward: z.boolean(),
        canRevert: z.boolean(),
        canSetFinalAward: z.boolean(),
        hasLaterRoundCheckIns: z.boolean(),
      })
      .strict(),
    award: teamRoundResultAwardSchema,
    round: teamRoundResultRoundSchema,
    team: teamRoundResultTeamSchema,
  })
  .strict();

export type TeamRoundResult = z.infer<typeof teamRoundResultSchema>;
export type TeamRoundResultRound = z.infer<typeof teamRoundResultRoundSchema>;
export type TeamRoundResultAward = z.infer<typeof teamRoundResultAwardSchema>;
export type FinalTeamRoundAward = z.infer<typeof finalTeamRoundAwardSchema>;
export type TeamRoundResultOutcome = z.infer<typeof teamRoundResultOutcomeSchema>;
export type SetTeamRoundResultOutcomeInput = z.infer<typeof setTeamRoundResultOutcomeSchema>;
export type TeamRoundResultOutcomeAction = z.infer<typeof teamRoundResultOutcomeActionSchema>;
export type TeamRoundResultTeam = z.infer<typeof teamRoundResultTeamSchema>;
export type TeamRoundResultsDetail = z.infer<typeof teamRoundResultsDetailSchema>;
export type SaveTeamRoundResultInput = z.infer<typeof saveTeamRoundResultSchema>;
export type TeamRoundResultColumnFilter = z.infer<typeof teamRoundResultColumnFilterSchema>;
export type TeamRoundResultListInput = z.input<typeof listTeamRoundResultsSchema>;
export type TeamRoundResultListQuery = z.output<typeof listTeamRoundResultsSchema>;
export type TeamRoundResultList = z.infer<typeof teamRoundResultListSchema>;
