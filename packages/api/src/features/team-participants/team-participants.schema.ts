import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";
import { fileWithUrlSchema } from "../files/files.schema";

const refinements = {
  chronicConditionsAndFirstAidNotes: (s: z.ZodString) => s.trim().min(1).max(2000),
  dateOfBirth: (s: z.ZodString) => s.trim().regex(/^\d{4}-\d{2}-\d{2}$/u),
  dietaryRequirements: (s: z.ZodString) => s.trim().min(1).max(1000),
  drugAllergies: (s: z.ZodString) => s.trim().min(1).max(1000),
  email: (s: z.ZodString) => s.trim().min(1).max(254).pipe(z.email()),
  firstNameEn: (s: z.ZodString) => s.trim().min(1).max(100),
  firstNameTh: (s: z.ZodString) => s.trim().min(1).max(100),
  foodAllergies: (s: z.ZodString) => s.trim().min(1).max(1000),
  lastNameEn: (s: z.ZodString) => s.trim().min(1).max(100),
  lastNameTh: (s: z.ZodString) => s.trim().min(1).max(100),
  lineId: (s: z.ZodString) => s.trim().min(1).max(100),
  middleNameEn: (s: z.ZodString) => s.trim().min(1).max(100),
  middleNameTh: (s: z.ZodString) => s.trim().min(1).max(100),
  phone: (s: z.ZodString) => s.trim().min(1).max(32),
  titleEn: (s: z.ZodString) => s.trim().min(1).max(50),
  titleTh: (s: z.ZodString) => s.trim().min(1).max(50),
};

const insert = createInsertSchema(teamParticipants, refinements);
const update = createUpdateSchema(teamParticipants, refinements);

const writable = {
  chronicConditionsAndFirstAidNotes: true,
  dateOfBirth: true,
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

const optional = {
  chronicConditionsAndFirstAidNotes: true,
  dietaryRequirements: true,
  drugAllergies: true,
  foodAllergies: true,
  lineId: true,
  middleNameEn: true,
  middleNameTh: true,
} as const;

export const teamParticipantSchema = createSelectSchema(teamParticipants).strict();

export const teamParticipantDetailsSchema = teamParticipantSchema
  .omit({
    academicRecordDocumentFileId: true,
    identityDocumentFileId: true,
    portraitPhotoFileId: true,
  })
  .extend({
    academicRecordDocument: fileWithUrlSchema.nullable(),
    identityDocument: fileWithUrlSchema.nullable(),
    portraitPhoto: fileWithUrlSchema.nullable(),
  })
  .strict();

const slot = z
  .object({ index: z.number().int().min(1).max(3), teamId: teamParticipantSchema.shape.teamId })
  .strict();

const fields = insert.pick(writable).partial(optional).strict();

export const createTeamParticipantSchema = fields
  .extend({ index: insert.shape.index, teamId: insert.shape.teamId })
  .strict();

export const teamParticipantSlotSchema = slot;
export const updateTeamParticipantSchema = slot
  .extend({
    data: update
      .pick(writable)
      .strict()
      .refine((d) => Object.keys(d).length > 0, {
        message: "At least one team participant field is required",
      }),
  })
  .strict();

export const teamParticipantDocumentUploadSchema = slot.extend({ file: z.file() }).strict();

export type TeamParticipant = z.output<typeof teamParticipantSchema>;
export type TeamParticipantDetails = z.output<typeof teamParticipantDetailsSchema>;
export type CreateTeamParticipantData = z.output<typeof createTeamParticipantSchema>;
export type UpdateTeamParticipantData = z.output<typeof updateTeamParticipantSchema>["data"];
