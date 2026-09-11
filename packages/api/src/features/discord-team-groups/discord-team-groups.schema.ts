import { z } from "zod";

const discordSnowflakeSchema = z.string().trim().min(1);

export const discordTeamGroupCategoryInputSchema = z
  .object({ category_id: discordSnowflakeSchema })
  .strict();

export const discordTeamGroupMemberChannelInputSchema = z
  .object({ channel_id: discordSnowflakeSchema })
  .strict();

export const discordTeamGroupMemberResponseSchema = z
  .object({
    channel_id: z.string().nullable(),
    id: z.string(),
    team: z
      .object({
        id: z.string(),
        index: z.number().int(),
        name: z.string(),
      })
      .strict(),
  })
  .strict();

export const discordTeamGroupResponseSchema = z
  .object({
    category_id: z.string().nullable(),
    has_overseer: z.boolean(),
    id: z.string(),
    index: z.number().int(),
    members: z.array(discordTeamGroupMemberResponseSchema),
    name: z.string(),
  })
  .strict();

export const discordTeamGroupsListResponseSchema = z.array(discordTeamGroupResponseSchema);

export type DiscordTeamGroupCategoryInput = z.output<typeof discordTeamGroupCategoryInputSchema>;
export type DiscordTeamGroupMemberChannelInput = z.output<
  typeof discordTeamGroupMemberChannelInputSchema
>;
export type DiscordTeamGroupMemberResponse = z.output<typeof discordTeamGroupMemberResponseSchema>;
export type DiscordTeamGroupResponse = z.output<typeof discordTeamGroupResponseSchema>;
export type DiscordTeamGroupsListResponse = z.output<typeof discordTeamGroupsListResponseSchema>;
