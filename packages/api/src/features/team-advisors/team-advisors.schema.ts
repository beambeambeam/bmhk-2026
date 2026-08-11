import { teamAdvisors } from "@bmhk-2026/db/schema/team-advisors";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

import { fileWithUrlSchema } from "../files/files.schema";
import {
  optionalRegistrationPersonFields,
  registrationPersonFieldRefinements,
  registrationPersonWritableFields,
} from "../registration-person/registration-person.schema";

const teamAdvisorInsertSchema = createInsertSchema(
  teamAdvisors,
  registrationPersonFieldRefinements,
);
const teamAdvisorUpdateSchema = createUpdateSchema(
  teamAdvisors,
  registrationPersonFieldRefinements,
);

export const teamAdvisorSchema = createSelectSchema(teamAdvisors).strict();
export const teamAdvisorDetailsSchema = teamAdvisorSchema
  .omit({ identityDocumentFileId: true, teacherStatusDocumentFileId: true })
  .extend({
    identityDocument: fileWithUrlSchema.nullable(),
    teacherStatusDocument: fileWithUrlSchema.nullable(),
  })
  .strict();

const teamAdvisorFieldsSchema = teamAdvisorInsertSchema
  .pick(registrationPersonWritableFields)
  .partial(optionalRegistrationPersonFields)
  .strict();

export const createTeamAdvisorSchema = teamAdvisorFieldsSchema
  .extend({ teamId: teamAdvisorInsertSchema.shape.teamId })
  .strict();

export const teamIdInputSchema = teamAdvisorSchema.pick({ teamId: true }).strict();

export const updateTeamAdvisorDataSchema = teamAdvisorUpdateSchema
  .pick(registrationPersonWritableFields)
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
export type TeamAdvisorDocumentType = "identity" | "teacherStatus";
