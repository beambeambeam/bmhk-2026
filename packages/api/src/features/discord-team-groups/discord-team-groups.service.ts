import type {
  DiscordTeamGroupMemberRecord,
  DiscordTeamGroupRecord,
  DiscordTeamGroupsRepository,
  TeamGroupAssignmentPlanGroup,
  TeamWithGroupRecord,
} from "./discord-team-groups.repository";
import type {
  DiscordTeamGroupMemberResponse,
  DiscordTeamGroupResponse,
  DiscordTeamGroupsListResponse,
  TeamGroupAssignmentResult,
  TeamWithGroup,
  TeamWithGroupList,
} from "./discord-team-groups.schema";

export interface DiscordTeamGroupsService {
  assignGroups: (staffAmount: number) => Promise<TeamGroupAssignmentResult>;
  clearCategoryId: (groupId: string) => Promise<boolean>;
  clearChannelId: (memberId: string) => Promise<boolean>;
  list: () => Promise<DiscordTeamGroupsListResponse>;
  listTeamsWithGroup: () => Promise<TeamWithGroupList>;
  recordCategoryId: (groupId: string, categoryId: string) => Promise<boolean>;
  recordChannelId: (memberId: string, channelId: string) => Promise<boolean>;
}

const DEFAULT_GROUP_NAME_PREFIX = "หมวดที่ ";

export function defaultGroupName(index: number): string {
  return `${DEFAULT_GROUP_NAME_PREFIX}${index}`;
}

/**
 * Splits team ids into `min(staffAmount, teamIds.length)` groups (one group per
 * staff member, capped at the team count so no group is empty), sized as evenly
 * as possible. Any remainder team goes to the earliest groups, in index order.
 */
export function distributeTeamIds(teamIds: readonly string[], staffAmount: number): string[][] {
  const groupCount = Math.min(staffAmount, teamIds.length);
  if (groupCount === 0) {
    return [];
  }

  const baseGroupSize = Math.floor(teamIds.length / groupCount);
  const groupsWithExtraTeam = teamIds.length % groupCount;

  const chunks: string[][] = [];
  let start = 0;
  for (const groupIndex of Array.from({ length: groupCount }, (_, i) => i)) {
    const size = baseGroupSize + (groupIndex < groupsWithExtraTeam ? 1 : 0);
    chunks.push(teamIds.slice(start, start + size));
    start += size;
  }
  return chunks;
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

function toTeamWithGroupResponse(team: TeamWithGroupRecord): TeamWithGroup {
  return {
    group: team.group,
    id: team.id,
    index: team.index,
    name: team.name,
    school: team.school,
  };
}

export function createDiscordTeamGroupsService(
  repository: DiscordTeamGroupsRepository,
): DiscordTeamGroupsService {
  return {
    assignGroups: async (staffAmount) => {
      const teamsWithGroup = await repository.listTeamsWithGroup();
      const teamIds = teamsWithGroup.map((team) => team.id);
      const groups: TeamGroupAssignmentPlanGroup[] = distributeTeamIds(teamIds, staffAmount).map(
        (chunk, chunkIndex) => ({
          name: defaultGroupName(chunkIndex + 1),
          teamIds: chunk,
        }),
      );

      await repository.replaceAssignment(groups);

      return { groupCount: groups.length };
    },
    clearCategoryId: async (groupId) => await repository.clearCategoryId(groupId),
    clearChannelId: async (memberId) => await repository.clearMemberChannelId(memberId),
    list: async () => {
      const groups = await repository.list();
      return groups.map(toGroupResponse);
    },
    listTeamsWithGroup: async () => {
      const teamsWithGroup = await repository.listTeamsWithGroup();
      return teamsWithGroup.map(toTeamWithGroupResponse);
    },
    recordCategoryId: async (groupId, categoryId) =>
      await repository.setCategoryId(groupId, categoryId),
    recordChannelId: async (memberId, channelId) =>
      await repository.setMemberChannelId(memberId, channelId),
  };
}
