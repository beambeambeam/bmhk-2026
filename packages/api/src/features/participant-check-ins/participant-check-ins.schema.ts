import { checkInRoundValues } from "@bmhk-2026/db/schema/check-in-round";
import { participantCheckInFlagValues } from "@bmhk-2026/db/schema/participant-check-ins";
import { teamAwardValues } from "@bmhk-2026/db/schema/teams";
import { z } from "zod";

import { createTableListResultSchema, createTableQuerySchema } from "../../core/table-query";

export { participantCheckInFlagValues } from "@bmhk-2026/db/schema/participant-check-ins";

export const checkInRoundSchema = z.enum(checkInRoundValues);
export const participantCheckInFlagSchema = z.enum(participantCheckInFlagValues);
export const participantCheckInTeamAwardSchema = z.enum(teamAwardValues);
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
  })
  .strict();
export const participantCheckInTeamSchema = z
  .object({
    award: participantCheckInTeamAwardSchema,
    id: z.uuid(),
    index: z.int().positive(),
    members: z.array(participantCheckInParticipantSchema),
    name: z.string(),
    teamCheckIn: z
      .object({ checkedInAt: z.date(), checkedInByName: z.string() })
      .strict()
      .nullable(),
  })
  .strict();
export const teamCheckInInputSchema = z
  .object({ round: checkInRoundSchema, teamId: z.uuid() })
  .strict();
export const participantCheckInColumnFilterSchema = z
  .object({ id: z.literal("team"), value: z.string().trim().max(255) })
  .strict();
export const listParticipantCheckInsSchema = createTableQuerySchema({
  columnFilterSchema: participantCheckInColumnFilterSchema,
  defaultPageSize: 10,
  defaultSorting: [{ desc: false, id: "name" }],
  maxColumnFilters: 1,
  sortableColumnIds: ["teamCode", "teamName", "email", "name", "checkedInAt", "flag"],
}).extend({ round: checkInRoundSchema });
export const participantCheckInListResultSchema = createTableListResultSchema(
  participantCheckInTeamSchema,
);
export const createParticipantCheckInSchema = z
  .object({ participantId: z.uuid(), round: checkInRoundSchema })
  .strict();
export const updateParticipantCheckInFlagSchema = z
  .object({
    flag: participantCheckInFlagSchema.nullable(),
    participantId: z.uuid(),
    round: checkInRoundSchema,
  })
  .strict();

export type CheckInRound = z.infer<typeof checkInRoundSchema>;
export type ParticipantCheckInColumnFilter = z.infer<typeof participantCheckInColumnFilterSchema>;
export type ParticipantCheckInFlag = z.infer<typeof participantCheckInFlagSchema>;
export type ParticipantCheckInListQuery = z.output<typeof listParticipantCheckInsSchema>;
export type ParticipantCheckInListResult = z.output<typeof participantCheckInListResultSchema>;
export type ParticipantCheckInSort = ParticipantCheckInListQuery["sorting"][number];
export type ParticipantCheckInTeam = z.infer<typeof participantCheckInTeamSchema>;

export const teamCheckInAwards = {
  ROUND_1: { eligible: "REGISTRATION_COMPLETE", participated: "ROUND_1_PARTICIPATED" },
  ROUND_2: { eligible: "ADVANCED_TO_ROUND_2", participated: "ROUND_2_PARTICIPATED" },
} as const;
