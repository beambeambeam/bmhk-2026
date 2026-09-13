import { z } from "zod";

export const staffVerifyTokenCreateInputSchema = z
  .object({ discord_user_id: z.string().trim().min(1) })
  .strict();

export const staffVerifyTokenCreateResponseSchema = z
  .object({ expires_at: z.string(), token: z.string() })
  .strict();

export const staffDiscordLinkInputSchema = z.object({ token: z.string().trim().min(1) }).strict();

export const staffDiscordLinkStatusValues = [
  "SUCCESS",
  "INVALID_TOKEN",
  "INELIGIBLE_ROLE",
  "ALREADY_LINKED_TO_ANOTHER_ACCOUNT",
  "GROUP_NOT_SET_UP",
  "BOT_APPLY_FAILED",
] as const;

export const staffDiscordLinkResultSchema = z
  .object({ status: z.enum(staffDiscordLinkStatusValues) })
  .strict();

export type StaffVerifyTokenCreateInput = z.output<typeof staffVerifyTokenCreateInputSchema>;
export type StaffVerifyTokenCreateResponse = z.output<typeof staffVerifyTokenCreateResponseSchema>;
export type StaffDiscordLinkInput = z.output<typeof staffDiscordLinkInputSchema>;
export type StaffDiscordLinkStatus = (typeof staffDiscordLinkStatusValues)[number];
export type StaffDiscordLinkResult = z.output<typeof staffDiscordLinkResultSchema>;
