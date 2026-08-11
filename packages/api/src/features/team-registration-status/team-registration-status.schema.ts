import { z } from "zod";

export const teamRegistrationItemStatusValues = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "NOT_APPLICABLE",
] as const;

export const teamRegistrationItemStatusSchema = z.enum(teamRegistrationItemStatusValues);

export const teamRegistrationSubmissionStateValues = ["DRAFT", "SUBMITTED"] as const;

export const teamRegistrationSubmissionStateSchema = z.enum(teamRegistrationSubmissionStateValues);

const memberCountSchema = z.number().int().nonnegative();

export const teamRegistrationStatusInputSchema = z.object({ teamId: z.uuid() }).strict();

export const teamRegistrationStatusSchema = z
  .object({
    isComplete: z.boolean(),
    memberCount: memberCountSchema,
    participant1: teamRegistrationItemStatusSchema,
    participant2: teamRegistrationItemStatusSchema,
    participant3: teamRegistrationItemStatusSchema,
    submissionState: teamRegistrationSubmissionStateSchema,
    submittedAt: z.date().nullable(),
    team: teamRegistrationItemStatusSchema,
    teamId: z.uuid(),
    termsAndConditions: teamRegistrationItemStatusSchema,
  })
  .strict();

export type TeamRegistrationItemStatus = z.output<typeof teamRegistrationItemStatusSchema>;
export type TeamRegistrationSubmissionState = z.output<
  typeof teamRegistrationSubmissionStateSchema
>;
export type TeamRegistrationStatus = z.output<typeof teamRegistrationStatusSchema>;
