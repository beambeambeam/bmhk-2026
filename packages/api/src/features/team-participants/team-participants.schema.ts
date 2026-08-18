import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

import { fileWithUrlSchema } from "../files/files.schema";
import {
  optionalRegistrationPersonFields,
  registrationPersonFieldRefinements,
  registrationPersonWritableFields,
} from "../registration-person/registration-person.schema";

const refinements = {
  ...registrationPersonFieldRefinements,
  dateOfBirth: (schema: z.ZodString) => schema.trim().regex(/^\d{4}-\d{2}-\d{2}$/u),
  nicknameEn: (schema: z.ZodString) => schema.trim().min(1).max(100),
  nicknameTh: (schema: z.ZodString) => schema.trim().min(1).max(100),
};

const insert = createInsertSchema(teamParticipants, refinements);
const update = createUpdateSchema(teamParticipants, refinements);

const writable = {
  ...registrationPersonWritableFields,
  dateOfBirth: true,
  nicknameEn: true,
  nicknameTh: true,
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

const fields = insert.pick(writable).partial(optionalRegistrationPersonFields).strict();

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
export type TeamParticipantDocumentType =
  | "portraitPhoto"
  | "identityDocument"
  | "academicRecordDocument";
