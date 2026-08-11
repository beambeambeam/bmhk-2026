import {
  teamRegistrationReviews,
  teamRegistrationReviewStatusValues,
} from "@bmhk-2026/db/schema/team-registration-reviews";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

const MAX_INTERNAL_NOTES_LENGTH = 4000;
const MAX_ISSUE_CODE_LENGTH = 100;
const MAX_ISSUE_CODES_PER_SUBJECT = 50;

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

export type TeamRegistrationReview = z.output<typeof teamRegistrationReviewSchema>;
export type TeamRegistrationReviewFeedback = z.output<typeof teamRegistrationReviewFeedbackSchema>;
export type TeamRegistrationReviewStatus = TeamRegistrationReview["status"];
export type SaveTeamRegistrationReviewData = z.output<typeof saveTeamRegistrationReviewDataSchema>;
export { teamRegistrationReviewStatusValues } from "@bmhk-2026/db/schema/team-registration-reviews";
