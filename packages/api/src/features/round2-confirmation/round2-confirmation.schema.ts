import { z } from "zod";

export const round2DocumentTypeSchema = z.enum(["identityDocument", "studentIdDocument"]);
export const round2TeamInputSchema = z.object({ teamId: z.uuid() }).strict();
export const round2DocumentInputSchema = round2TeamInputSchema
  .extend({
    documentType: round2DocumentTypeSchema,
    participantId: z.uuid(),
  })
  .strict();
export const round2UploadInputSchema = round2DocumentInputSchema
  .extend({ file: z.file() })
  .strict();
export const round2ConfirmationStatusSchema = z
  .object({
    confirmedAt: z.date().nullable(),
    isComplete: z.boolean(),
    isEligible: z.boolean(),
    isOpen: z.boolean(),
    memberCount: z.int().nonnegative(),
    participants: z.array(
      z
        .object({
          id: z.uuid(),
          identityDocumentFileId: z.uuid().nullable(),
          index: z.int().min(1).max(3),
          studentIdDocumentFileId: z.uuid().nullable(),
        })
        .strict(),
    ),
    state: z.enum(["DRAFT", "CONFIRMED"]),
    teamId: z.uuid(),
  })
  .strict();
export type Round2DocumentType = z.infer<typeof round2DocumentTypeSchema>;
export type Round2ConfirmationStatus = z.infer<typeof round2ConfirmationStatusSchema>;
export type Round2DocumentInput = z.infer<typeof round2DocumentInputSchema>;
