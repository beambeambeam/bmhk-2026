import { discord } from "@bmhk-2026/db/schema/discord";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const discordSchema = createSelectSchema(discord).strict();

const discordParticipantFields = {
  firstNameEn: true,
  id: true,
  lastNameEn: true,
  teamId: true,
} as const;

export const discordParticipantSchema = createSelectSchema(teamParticipants)
  .pick(discordParticipantFields)
  .strict();

export const discordParticipantWithDiscordSchema = discordParticipantSchema
  .extend({
    discord: discordSchema.omit({ participantId: true }),
  })
  .strict();

export const discordCodeLookupSchema = discordParticipantWithDiscordSchema
  .extend({
    school: z.string(),
    teamName: z.string(),
  })
  .strict();

export const discordStatus = {
  ALREADY_REDEEMED: 2,
  NOT_FOUND: 1,
  SUCCESS: 0,
} as const;

export const discordCodeSchema = z.string().trim().min(1);
export const discordUserIdSchema = z.string().trim().min(1);

export const discordQueryInputSchema = z.object({ code: discordCodeSchema }).strict();
export const discordVerifyInputSchema = z
  .object({ code: discordCodeSchema, id: discordUserIdSchema })
  .strict();

export const discordQueryDataSchema = z
  .object({
    // wire keys mirror the discord bot's expected JSON payload, not repo camelCase convention
    main_acc_id: z.string().nullable(),
    name: z.string(),
    school: z.string(),
    team: z.string(),
  })
  .strict();

export const discordQueryResponseSchema = z
  .object({
    data: discordQueryDataSchema.nullable(),
    status: z.number().int(),
  })
  .strict();

export const discordVerifyResponseSchema = z
  .object({
    nickname: z.string().nullable(),
    status: z.number().int(),
  })
  .strict();

export type Discord = z.output<typeof discordSchema>;
export type DiscordParticipant = z.output<typeof discordParticipantSchema>;
export type DiscordParticipantWithDiscord = z.output<typeof discordParticipantWithDiscordSchema>;
export type DiscordCodeLookup = z.output<typeof discordCodeLookupSchema>;
export type DiscordStatus = (typeof discordStatus)[keyof typeof discordStatus];
export type DiscordQueryInput = z.output<typeof discordQueryInputSchema>;
export type DiscordVerifyInput = z.output<typeof discordVerifyInputSchema>;
export type DiscordQueryResponse = z.output<typeof discordQueryResponseSchema>;
export type DiscordVerifyResponse = z.output<typeof discordVerifyResponseSchema>;
