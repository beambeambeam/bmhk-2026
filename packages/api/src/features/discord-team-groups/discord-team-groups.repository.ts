import { db } from "@bmhk-2026/db";
import { discordTeamGroupMembers } from "@bmhk-2026/db/schema/discord-team-group-members";
import { discordTeamGroupOverseers } from "@bmhk-2026/db/schema/discord-team-group-overseers";
import { discordTeamGroups } from "@bmhk-2026/db/schema/discord-team-groups";
import { teams } from "@bmhk-2026/db/schema/teams";
import { asc, eq, sql } from "drizzle-orm";

import { createRepositoryExecutor } from "../../core/repository";
import { discordTeamGroupsRepositoryError } from "./discord-team-groups.errors";

export interface DiscordTeamGroupMemberRecord {
  channelId: string | null;
  id: string;
  team: { id: string; index: number; name: string };
}

export interface DiscordTeamGroupRecord {
  categoryId: string | null;
  hasOverseer: boolean;
  id: string;
  index: number;
  members: DiscordTeamGroupMemberRecord[];
  name: string;
}

export interface DiscordTeamGroupsRepository {
  list: () => Promise<DiscordTeamGroupRecord[]>;
  setCategoryId: (groupId: string, categoryId: string) => Promise<boolean>;
  setMemberChannelId: (memberId: string, channelId: string) => Promise<boolean>;
}

type Database = typeof db;

export function createDiscordTeamGroupsRepository(
  database: Database = db,
): DiscordTeamGroupsRepository {
  const execute = createRepositoryExecutor(discordTeamGroupsRepositoryError);

  return {
    list: async () =>
      await execute(async () => {
        const groups = await database
          .select({
            categoryId: discordTeamGroups.categoryId,
            hasOverseer: sql<boolean>`exists (
              select 1 from ${discordTeamGroupOverseers}
              where ${discordTeamGroupOverseers.groupId} = ${discordTeamGroups.id}
            )`,
            id: discordTeamGroups.id,
            index: discordTeamGroups.index,
            name: discordTeamGroups.name,
          })
          .from(discordTeamGroups)
          .orderBy(asc(discordTeamGroups.index));

        const members = await database
          .select({
            channelId: discordTeamGroupMembers.channelId,
            groupId: discordTeamGroupMembers.groupId,
            id: discordTeamGroupMembers.id,
            teamId: teams.id,
            teamIndex: teams.index,
            teamName: teams.name,
          })
          .from(discordTeamGroupMembers)
          .innerJoin(teams, eq(teams.id, discordTeamGroupMembers.teamId))
          .orderBy(asc(teams.index));

        const membersByGroupId = new Map<string, DiscordTeamGroupMemberRecord[]>();
        for (const member of members) {
          const record: DiscordTeamGroupMemberRecord = {
            channelId: member.channelId,
            id: member.id,
            team: { id: member.teamId, index: member.teamIndex, name: member.teamName },
          };
          const existing = membersByGroupId.get(member.groupId);
          if (existing) {
            existing.push(record);
          } else {
            membersByGroupId.set(member.groupId, [record]);
          }
        }

        return groups.map((group) => ({
          categoryId: group.categoryId,
          hasOverseer: group.hasOverseer,
          id: group.id,
          index: group.index,
          members: membersByGroupId.get(group.id) ?? [],
          name: group.name,
        }));
      }),
    setCategoryId: async (groupId, categoryId) =>
      await execute(async () => {
        const result = await database
          .update(discordTeamGroups)
          .set({ categoryId })
          .where(eq(discordTeamGroups.id, groupId))
          .returning({ id: discordTeamGroups.id });

        return result.length > 0;
      }),
    setMemberChannelId: async (memberId, channelId) =>
      await execute(async () => {
        const result = await database
          .update(discordTeamGroupMembers)
          .set({ channelId })
          .where(eq(discordTeamGroupMembers.id, memberId))
          .returning({ id: discordTeamGroupMembers.id });

        return result.length > 0;
      }),
  };
}
