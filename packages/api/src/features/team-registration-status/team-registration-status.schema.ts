import { z } from "zod";

const memberCountSchema = z.union([z.literal(2), z.literal(3)]);

export const teamRegistrationStatusInputSchema = z.object({ teamId: z.uuid() }).strict();

export const teamRegistrationStatusSchema = z
  .object({
    isComplete: z.boolean(),
    memberCount: memberCountSchema,
    participant1: z.boolean(),
    participant2: z.boolean(),
    participant3: z.boolean().nullable(),
    team: z.boolean(),
    teamId: z.uuid(),
    termsAndConditions: z.boolean(),
  })
  .strict();

export type TeamRegistrationStatus = z.output<typeof teamRegistrationStatusSchema>;
