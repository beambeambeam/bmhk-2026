import { z } from "zod";

export const staffOverseerImportRowSchema = z
  .object({
    email: z.string().trim().min(1),
    teamsGroupIndex: z.number().int().positive(),
  })
  .strict();

export const staffOverseerImportInputSchema = z
  .object({ rows: z.array(staffOverseerImportRowSchema).min(1) })
  .strict();

export const staffOverseerImportRowOutcomeSchema = z
  .object({
    email: z.string(),
    error: z.string().optional(),
    outcome: z.enum(["assigned", "backlogged", "error"]),
    teamsGroupIndex: z.number().int(),
  })
  .strict();

export const staffOverseerImportResultSchema = z.array(staffOverseerImportRowOutcomeSchema);

export const staffOverseerSchema = z
  .object({
    email: z.string(),
    groupIndex: z.number().int(),
    groupName: z.string(),
    userId: z.string(),
    userName: z.string(),
  })
  .strict();

export const staffOverseerListSchema = z.array(staffOverseerSchema);

export const staffOverseerBacklogEntrySchema = z
  .object({
    createdAt: z.date(),
    email: z.string(),
    groupIndex: z.number().int(),
    groupName: z.string(),
    id: z.string(),
  })
  .strict();

export const staffOverseerBacklogListSchema = z.array(staffOverseerBacklogEntrySchema);

export const staffOverseerBacklogRetryInputSchema = z.object({ id: z.string() }).strict();

export const staffOverseerBacklogRetryResultSchema = z
  .object({ outcome: z.enum(["assigned", "still_backlogged"]) })
  .strict();

export const staffOverseerBacklogRetryResultListSchema = z.array(
  staffOverseerBacklogRetryResultSchema,
);

export type StaffOverseerImportRow = z.output<typeof staffOverseerImportRowSchema>;
export type StaffOverseerImportInput = z.output<typeof staffOverseerImportInputSchema>;
export type StaffOverseerImportRowOutcome = z.output<typeof staffOverseerImportRowOutcomeSchema>;
export type StaffOverseerImportResult = z.output<typeof staffOverseerImportResultSchema>;
export type StaffOverseer = z.output<typeof staffOverseerSchema>;
export type StaffOverseerList = z.output<typeof staffOverseerListSchema>;
export type StaffOverseerBacklogEntry = z.output<typeof staffOverseerBacklogEntrySchema>;
export type StaffOverseerBacklogList = z.output<typeof staffOverseerBacklogListSchema>;
export type StaffOverseerBacklogRetryInput = z.output<typeof staffOverseerBacklogRetryInputSchema>;
export type StaffOverseerBacklogRetryResult = z.output<
  typeof staffOverseerBacklogRetryResultSchema
>;
export type StaffOverseerBacklogRetryResultList = z.output<
  typeof staffOverseerBacklogRetryResultListSchema
>;
