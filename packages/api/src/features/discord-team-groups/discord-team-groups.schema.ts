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

// Admin-facing (oRPC, camelCase) contracts — distinct from the snake_case
// bot-wire contracts above, which mirror apps/server's Elysia REST routes.
export const teamGroupAssignmentInputSchema = z
  .object({ staffAmount: z.number().int().positive() })
  .strict();

export const teamGroupSummarySchema = z
  .object({
    id: z.string(),
    index: z.number().int(),
    name: z.string(),
  })
  .strict();

export const teamWithGroupSchema = z
  .object({
    group: teamGroupSummarySchema.nullable(),
    id: z.string(),
    index: z.number().int(),
    name: z.string(),
    school: z.string(),
  })
  .strict();

export const teamWithGroupListSchema = z.array(teamWithGroupSchema);

export const teamGroupAssignmentResultSchema = z.object({ groupCount: z.number().int() }).strict();

export type DiscordTeamGroupCategoryInput = z.output<typeof discordTeamGroupCategoryInputSchema>;
export type DiscordTeamGroupMemberChannelInput = z.output<
  typeof discordTeamGroupMemberChannelInputSchema
>;
export type DiscordTeamGroupMemberResponse = z.output<typeof discordTeamGroupMemberResponseSchema>;
export type DiscordTeamGroupResponse = z.output<typeof discordTeamGroupResponseSchema>;
export type DiscordTeamGroupsListResponse = z.output<typeof discordTeamGroupsListResponseSchema>;
export type TeamGroupAssignmentInput = z.output<typeof teamGroupAssignmentInputSchema>;
export type TeamGroupSummary = z.output<typeof teamGroupSummarySchema>;
export type TeamWithGroup = z.output<typeof teamWithGroupSchema>;
export type TeamWithGroupList = z.output<typeof teamWithGroupListSchema>;
export type TeamGroupAssignmentResult = z.output<typeof teamGroupAssignmentResultSchema>;
