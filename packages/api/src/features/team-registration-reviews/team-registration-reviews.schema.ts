import {
  teamRegistrationReviews,
  teamRegistrationReviewStatusValues,
} from "@bmhk-2026/db/schema/team-registration-reviews";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

const MAX_INTERNAL_NOTES_LENGTH = 4000;
const MAX_ISSUE_CODE_LENGTH = 100;
const MAX_ISSUE_CODES_PER_SUBJECT = 50;
const MAX_SEARCH_LENGTH = 120;
const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

const issueCodesSchema = z
  .array(z.string().trim().min(1).max(MAX_ISSUE_CODE_LENGTH))
  .max(MAX_ISSUE_CODES_PER_SUBJECT);

export const teamRegistrationReviewSchema = createSelectSchema(teamRegistrationReviews).strict();

export const teamRegistrationReviewTeamInputSchema = z.object({ teamId: z.uuid() }).strict();

const teamRegistrationReviewFeedbackStatusSchema = z.enum(teamRegistrationReviewStatusValues);

export const teamRegistrationReviewFeedbackSchema = z
  .object({
    advisor: teamRegistrationReviewFeedbackStatusSchema,
    participant1: teamRegistrationReviewFeedbackStatusSchema,
    participant2: teamRegistrationReviewFeedbackStatusSchema,
    participant3: teamRegistrationReviewFeedbackStatusSchema,
    status: teamRegistrationReviewFeedbackStatusSchema,
    statusUpdatedAt: z.date().nullable(),
  })
  .strict();

export const teamRegistrationReviewListSubjectStatusValues = [
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "NOT_APPLICABLE",
] as const;
export const teamRegistrationReviewListSubjectStatusSchema = z.enum(
  teamRegistrationReviewListSubjectStatusValues,
);
export const teamRegistrationReviewListFilterValues = [
  "ALL",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
] as const;
export const teamRegistrationReviewListFilterSchema = z.enum(
  teamRegistrationReviewListFilterValues,
);
export const teamRegistrationReviewListInputSchema = z
  .object({
    limit: z.int().min(1).max(MAX_LIST_LIMIT).default(DEFAULT_LIST_LIMIT),
    offset: z.int().nonnegative().default(0),
    reviewStatus: teamRegistrationReviewListFilterSchema.default("ALL"),
    search: z.string().trim().max(MAX_SEARCH_LENGTH).default(""),
  })
  .strict()
  .default({ limit: DEFAULT_LIST_LIMIT, offset: 0, reviewStatus: "ALL", search: "" });
export const teamRegistrationReviewListRowSchema = z
  .object({
    advisor: teamRegistrationReviewListSubjectStatusSchema,
    id: z.uuid(),
    memberCount: z.int().nonnegative(),
    name: z.string(),
    participant1: teamRegistrationReviewListSubjectStatusSchema,
    participant2: teamRegistrationReviewListSubjectStatusSchema,
    participant3: teamRegistrationReviewListSubjectStatusSchema,
    registrationSubmittedAt: z.date().nullable(),
    reviewStatus: teamRegistrationReviewListSubjectStatusSchema,
    school: z.string(),
  })
  .strict();
export const teamRegistrationReviewListResultSchema = z
  .object({
    pagination: z
      .object({
        nextOffset: z.int().nonnegative().nullable(),
        offset: z.int().nonnegative(),
        total: z.int().nonnegative(),
      })
      .strict(),
    rows: z.array(teamRegistrationReviewListRowSchema),
  })
  .strict();

export const saveTeamRegistrationReviewDataSchema = z
  .object({
    advisorIssueCodes: issueCodesSchema,
    internalNotes: z.string().trim().min(1).max(MAX_INTERNAL_NOTES_LENGTH).nullable(),
    participant1IssueCodes: issueCodesSchema,
    participant2IssueCodes: issueCodesSchema,
    participant3IssueCodes: issueCodesSchema,
    status: teamRegistrationReviewSchema.shape.status,
  })
  .strict()
  .superRefine((data, context) => {
    const hasIssues =
      data.advisorIssueCodes.length > 0 ||
      data.participant1IssueCodes.length > 0 ||
      data.participant2IssueCodes.length > 0 ||
      data.participant3IssueCodes.length > 0;
    if (data.status === "APPROVED" && hasIssues) {
      context.addIssue({
        code: "custom",
        message: "Approved reviews cannot contain unresolved issue codes",
        path: ["status"],
      });
    }
    if (data.status === "CHANGES_REQUESTED" && !hasIssues) {
      context.addIssue({
        code: "custom",
        message: "Change requests require at least one issue code",
        path: ["status"],
      });
    }
  });

export const saveTeamRegistrationReviewSchema = teamRegistrationReviewTeamInputSchema
  .extend({ data: saveTeamRegistrationReviewDataSchema })
  .strict();

export const teamRegistrationReviewSubjectValues = [
  "advisor",
  "participant1",
  "participant2",
  "participant3",
] as const;
export const teamRegistrationReviewSubjectSchema = z.enum(teamRegistrationReviewSubjectValues);
export const saveTeamRegistrationReviewSubjectSchema = teamRegistrationReviewTeamInputSchema
  .extend({
    data: z
      .object({
        note: z.string().trim().min(1).max(MAX_INTERNAL_NOTES_LENGTH).nullable(),
        status: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
        subject: teamRegistrationReviewSubjectSchema,
      })
      .strict()
      .superRefine((data, context) => {
        if (data.status === "CHANGES_REQUESTED" && data.note === null) {
          context.addIssue({
            code: "custom",
            message: "Change requests require review notes",
            path: ["note"],
          });
        }
      }),
  })
  .strict();

export type TeamRegistrationReview = z.output<typeof teamRegistrationReviewSchema>;
export type TeamRegistrationReviewFeedback = z.output<typeof teamRegistrationReviewFeedbackSchema>;
export type TeamRegistrationReviewStatus = TeamRegistrationReview["status"];
export type SaveTeamRegistrationReviewData = z.output<typeof saveTeamRegistrationReviewDataSchema>;
export type SaveTeamRegistrationReviewSubjectData = z.output<
  typeof saveTeamRegistrationReviewSubjectSchema
>["data"];
export type TeamRegistrationReviewSubject = z.output<typeof teamRegistrationReviewSubjectSchema>;
export type TeamRegistrationReviewListFilter = z.output<
  typeof teamRegistrationReviewListFilterSchema
>;
export type TeamRegistrationReviewListInput = z.output<
  typeof teamRegistrationReviewListInputSchema
>;
export type TeamRegistrationReviewListResult = z.output<
  typeof teamRegistrationReviewListResultSchema
>;
export type TeamRegistrationReviewListSubjectStatus = z.output<
  typeof teamRegistrationReviewListSubjectStatusSchema
>;
export { teamRegistrationReviewStatusValues } from "@bmhk-2026/db/schema/team-registration-reviews";
