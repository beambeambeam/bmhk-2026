import { z } from "zod";

export const teamRegistrationItemStatusValues = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "NOT_APPLICABLE",
] as const;

export const teamRegistrationItemStatusSchema = z.enum(teamRegistrationItemStatusValues);

const memberCountSchema = z.number().int().nonnegative();

export const teamRegistrationStatusInputSchema = z.object({}).strict();

export const teamRegistrationStatusSchema = z
  .object({
    isComplete: z.boolean(),
    memberCount: memberCountSchema,
    participant1: teamRegistrationItemStatusSchema,
    participant2: teamRegistrationItemStatusSchema,
    participant3: teamRegistrationItemStatusSchema,
    team: teamRegistrationItemStatusSchema,
    teamId: z.uuid(),
    termsAndConditions: teamRegistrationItemStatusSchema,
  })
  .strict();

export type TeamRegistrationItemStatus = z.output<typeof teamRegistrationItemStatusSchema>;
export type TeamRegistrationStatus = z.output<typeof teamRegistrationStatusSchema>;
