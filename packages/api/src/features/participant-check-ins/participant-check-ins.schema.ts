import { participantCheckInFlagValues } from "@bmhk-2026/db/schema/participant-check-ins";
import { z } from "zod";

import { createTableListResultSchema, createTableQuerySchema } from "../../core/table-query";

export { participantCheckInFlagValues } from "@bmhk-2026/db/schema/participant-check-ins";

export const participantCheckInFlagSchema = z.enum(participantCheckInFlagValues);
export const participantCheckInSchema = z
  .object({
    checkedInAt: z.date(),
    checkedInByName: z.string(),
    flag: participantCheckInFlagSchema.nullable(),
  })
  .strict();
export const participantCheckInParticipantSchema = z
  .object({
    checkIn: participantCheckInSchema.nullable(),
    email: z.email(),
    id: z.uuid(),
    name: z.string(),
    teamName: z.string(),
  })
  .strict();
export const participantCheckInColumnFilterSchema = z.discriminatedUnion("id", [
  z.object({ id: z.literal("email"), value: z.string().trim().max(254) }).strict(),
  z.object({ id: z.literal("name"), value: z.string().trim().max(255) }).strict(),
  z.object({ id: z.literal("teamName"), value: z.string().trim().max(255) }).strict(),
]);
export const listParticipantCheckInsSchema = createTableQuerySchema({
  columnFilterSchema: participantCheckInColumnFilterSchema,
  defaultPageSize: 10,
  defaultSorting: [{ desc: false, id: "name" }],
  maxColumnFilters: 3,
  sortableColumnIds: ["email", "name", "teamName", "checkedInAt", "flag"],
});
export const participantCheckInListResultSchema = createTableListResultSchema(
  participantCheckInParticipantSchema,
);
export const createParticipantCheckInSchema = z.object({ participantId: z.uuid() }).strict();
export const updateParticipantCheckInFlagSchema = z
  .object({ flag: participantCheckInFlagSchema.nullable(), participantId: z.uuid() })
  .strict();

export type ParticipantCheckInColumnFilter = z.infer<typeof participantCheckInColumnFilterSchema>;
export type ParticipantCheckInFlag = z.infer<typeof participantCheckInFlagSchema>;
export type ParticipantCheckInListQuery = z.output<typeof listParticipantCheckInsSchema>;
export type ParticipantCheckInListResult = z.output<typeof participantCheckInListResultSchema>;
export type ParticipantCheckInSort = ParticipantCheckInListQuery["sorting"][number];
