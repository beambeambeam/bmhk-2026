import { teamAwardValues } from "@bmhk-2026/db/schema/teams";
import { z } from "zod";

import { createTableListResultSchema, createTableQuerySchema } from "../../core/table-query";

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
export const round2ConfirmationStateSchema = z.enum(["DRAFT", "CONFIRMED"]);
const round2ConfirmationColumnFilterSchema = z.discriminatedUnion("id", [
  z.object({ id: z.literal("teamCode"), value: z.string().trim().max(255) }).strict(),
  z.object({ id: z.literal("teamName"), value: z.string().trim().max(255) }).strict(),
  z.object({ id: z.literal("state"), value: round2ConfirmationStateSchema }).strict(),
]);
export const listRound2ConfirmationsSchema = createTableQuerySchema({
  columnFilterSchema: round2ConfirmationColumnFilterSchema,
  defaultPageSize: 10,
  defaultSorting: [{ desc: false, id: "teamCode" }],
  maxColumnFilters: 3,
  sortableColumnIds: ["teamCode", "teamName", "confirmedAt"],
});
export const round2ConfirmationListSchema = createTableListResultSchema(
  z
    .object({
      confirmedAt: z.date().nullable(),
      participants: z.array(
        z
          .object({
            hasIdentityDocument: z.boolean(),
            hasStudentIdDocument: z.boolean(),
            id: z.uuid(),
            index: z.int().min(1).max(3),
            name: z.string(),
          })
          .strict(),
      ),
      state: round2ConfirmationStateSchema,
      team: z
        .object({
          award: z.enum(teamAwardValues),
          id: z.uuid(),
          index: z.int().positive(),
          memberCount: z.int().nonnegative(),
          name: z.string(),
        })
        .strict(),
    })
    .strict(),
);
export type Round2DocumentType = z.infer<typeof round2DocumentTypeSchema>;
export type Round2ConfirmationStatus = z.infer<typeof round2ConfirmationStatusSchema>;
export type Round2DocumentInput = z.infer<typeof round2DocumentInputSchema>;
export type Round2ConfirmationState = z.infer<typeof round2ConfirmationStateSchema>;
export type Round2ConfirmationColumnFilter = z.infer<typeof round2ConfirmationColumnFilterSchema>;
export type Round2ConfirmationListInput = z.input<typeof listRound2ConfirmationsSchema>;
export type Round2ConfirmationListQuery = z.output<typeof listRound2ConfirmationsSchema>;
export type Round2ConfirmationList = z.infer<typeof round2ConfirmationListSchema>;
