import { teamAdvisors } from "@bmhk-2026/db/schema/team-advisors";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

import { fileWithUrlSchema } from "../files/files.schema";

const advisorFieldRefinements = {
  chronicConditionsAndFirstAidNotes: (schema: z.ZodString) => schema.trim().min(1).max(2000),
  dietaryRequirements: (schema: z.ZodString) => schema.trim().min(1).max(1000),
  drugAllergies: (schema: z.ZodString) => schema.trim().min(1).max(1000),
  email: (schema: z.ZodString) => schema.trim().min(1).max(254).pipe(z.email()),
  firstNameEn: (schema: z.ZodString) => schema.trim().min(1).max(100),
  firstNameTh: (schema: z.ZodString) => schema.trim().min(1).max(100),
  foodAllergies: (schema: z.ZodString) => schema.trim().min(1).max(1000),
  lastNameEn: (schema: z.ZodString) => schema.trim().min(1).max(100),
  lastNameTh: (schema: z.ZodString) => schema.trim().min(1).max(100),
  lineId: (schema: z.ZodString) => schema.trim().min(1).max(100),
  middleNameEn: (schema: z.ZodString) => schema.trim().min(1).max(100),
  middleNameTh: (schema: z.ZodString) => schema.trim().min(1).max(100),
  phone: (schema: z.ZodString) => schema.trim().min(1).max(32),
  titleEn: (schema: z.ZodString) => schema.trim().min(1).max(50),
  titleTh: (schema: z.ZodString) => schema.trim().min(1).max(50),
};

const teamAdvisorInsertSchema = createInsertSchema(teamAdvisors, advisorFieldRefinements);
const teamAdvisorUpdateSchema = createUpdateSchema(teamAdvisors, advisorFieldRefinements);
const advisorWritableFields = {
  chronicConditionsAndFirstAidNotes: true,
  dietaryRequirements: true,
  drugAllergies: true,
  email: true,
  firstNameEn: true,
  firstNameTh: true,
  foodAllergies: true,
  lastNameEn: true,
  lastNameTh: true,
  lineId: true,
  middleNameEn: true,
  middleNameTh: true,
  phone: true,
  titleEn: true,
  titleTh: true,
} as const;
const optionalAdvisorFields = {
  chronicConditionsAndFirstAidNotes: true,
  dietaryRequirements: true,
  drugAllergies: true,
  foodAllergies: true,
  lineId: true,
  middleNameEn: true,
  middleNameTh: true,
} as const;

export const teamAdvisorSchema = createSelectSchema(teamAdvisors).strict();
export const teamAdvisorDetailsSchema = teamAdvisorSchema
  .omit({ identityDocumentFileId: true, teacherStatusDocumentFileId: true })
  .extend({
    identityDocument: fileWithUrlSchema.nullable(),
    teacherStatusDocument: fileWithUrlSchema.nullable(),
  })
  .strict();

const teamAdvisorFieldsSchema = teamAdvisorInsertSchema
  .pick(advisorWritableFields)
  .partial(optionalAdvisorFields)
  .strict();

export const createTeamAdvisorSchema = teamAdvisorFieldsSchema
  .extend({ teamId: teamAdvisorInsertSchema.shape.teamId })
  .strict();

export const teamIdInputSchema = teamAdvisorSchema.pick({ teamId: true }).strict();

export const updateTeamAdvisorDataSchema = teamAdvisorUpdateSchema
  .pick(advisorWritableFields)
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one team advisor field is required",
  });

export const updateTeamAdvisorSchema = teamIdInputSchema
  .extend({ data: updateTeamAdvisorDataSchema })
  .strict();

export const teamAdvisorDocumentUploadSchema = teamIdInputSchema
  .extend({ file: z.file() })
  .strict();

export type TeamAdvisor = z.output<typeof teamAdvisorSchema>;
export type TeamAdvisorDetails = z.output<typeof teamAdvisorDetailsSchema>;
export type CreateTeamAdvisorData = z.output<typeof createTeamAdvisorSchema>;
export type UpdateTeamAdvisorData = z.output<typeof updateTeamAdvisorDataSchema>;
