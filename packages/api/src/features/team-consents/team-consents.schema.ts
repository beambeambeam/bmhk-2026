import { teamConsents } from "@bmhk-2026/db/schema/team-consents";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

const teamConsentInsertSchema = createInsertSchema(teamConsents);
const teamConsentUpdateSchema = createUpdateSchema(teamConsents);

const writableFields = {
  codernTermsAccepted: true,
  competitionRulesAccepted: true,
  guardianConsentObtained: true,
  healthDataConsent: true,
  privacyPolicyAccepted: true,
  publicityMediaConsent: true,
} as const;

export const teamConsentSchema = createSelectSchema(teamConsents).strict();

export const teamConsentTeamInputSchema = teamConsentSchema.pick({ teamId: true }).strict();

export const createTeamConsentSchema = teamConsentInsertSchema
  .pick(writableFields)
  .extend({
    codernTermsAccepted: z.boolean().default(false),
    competitionRulesAccepted: z.boolean().default(false),
    guardianConsentObtained: z.boolean().default(false),
    healthDataConsent: z.boolean().default(false),
    privacyPolicyAccepted: z.boolean().default(false),
    publicityMediaConsent: z.boolean().default(false),
    teamId: teamConsentInsertSchema.shape.teamId,
  })
  .strict();

export const updateTeamConsentDataSchema = teamConsentUpdateSchema
  .pick(writableFields)
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one team consent field is required",
  });

export const updateTeamConsentSchema = teamConsentTeamInputSchema
  .extend({ data: updateTeamConsentDataSchema })
  .strict();

export type TeamConsent = z.output<typeof teamConsentSchema>;
export type CreateTeamConsentData = z.output<typeof createTeamConsentSchema>;
export type UpdateTeamConsentData = z.output<typeof updateTeamConsentDataSchema>;
