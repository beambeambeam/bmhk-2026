import { z } from "zod";

export const discordCodeStatusValues = [
  "NOT_GENERATED",
  "NOT_REDEEMED",
  "REDEEMED_ONCE",
  "REDEEMED_TWICE",
] as const;

export const discordCodeTeamInputSchema = z.object({ teamId: z.uuid() }).strict();

export const discordCodeEntrySchema = z
  .object({
    code: z.string().nullable(),
    name: z.string(),
    participantIndex: z.number().int(),
    status: z.enum(discordCodeStatusValues),
  })
  .strict();

export const discordCodeListSchema = z.array(discordCodeEntrySchema);

export type DiscordCodeStatus = (typeof discordCodeStatusValues)[number];
export type DiscordCodeEntry = z.output<typeof discordCodeEntrySchema>;
