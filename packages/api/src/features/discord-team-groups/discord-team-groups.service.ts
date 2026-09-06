import type {
  DiscordTeamGroupMemberRecord,
  DiscordTeamGroupRecord,
  DiscordTeamGroupsRepository,
} from "./discord-team-groups.repository";
import type {
  DiscordTeamGroupMemberResponse,
  DiscordTeamGroupResponse,
  DiscordTeamGroupsListResponse,
} from "./discord-team-groups.schema";

export interface DiscordTeamGroupsService {
  list: () => Promise<DiscordTeamGroupsListResponse>;
  recordCategoryId: (groupId: string, categoryId: string) => Promise<boolean>;
  recordChannelId: (memberId: string, channelId: string) => Promise<boolean>;
}

function toMemberResponse(member: DiscordTeamGroupMemberRecord): DiscordTeamGroupMemberResponse {
  return {
    channel_id: member.channelId,
    id: member.id,
    team: member.team,
  };
}

function toGroupResponse(group: DiscordTeamGroupRecord): DiscordTeamGroupResponse {
  return {
    category_id: group.categoryId,
    has_overseer: group.hasOverseer,
    id: group.id,
    index: group.index,
    members: group.members.map(toMemberResponse),
    name: group.name,
  };
}

export function createDiscordTeamGroupsService(
  repository: DiscordTeamGroupsRepository,
): DiscordTeamGroupsService {
  return {
    list: async () => {
      const groups = await repository.list();
      return groups.map(toGroupResponse);
    },
    recordCategoryId: async (groupId, categoryId) =>
      await repository.setCategoryId(groupId, categoryId),
    recordChannelId: async (memberId, channelId) =>
      await repository.setMemberChannelId(memberId, channelId),
  };
}
