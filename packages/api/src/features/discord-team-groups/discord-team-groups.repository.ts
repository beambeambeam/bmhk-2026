import { db } from "@bmhk-2026/db";
import { discordTeamGroupMembers } from "@bmhk-2026/db/schema/discord-team-group-members";
import { discordTeamGroupOverseers } from "@bmhk-2026/db/schema/discord-team-group-overseers";
import { discordTeamGroups } from "@bmhk-2026/db/schema/discord-team-groups";
import { teamRegistrationReviews } from "@bmhk-2026/db/schema/team-registration-reviews";
import { teams } from "@bmhk-2026/db/schema/teams";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";

import { createRepositoryExecutor, rethrowRepositoryError } from "../../core/repository";
import {
  createTeamGroupsProvisionedError,
  discordTeamGroupsRepositoryError,
} from "./discord-team-groups.errors";

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

export interface TeamWithGroupRecord {
  group: { id: string; index: number; name: string } | null;
  id: string;
  index: number;
  name: string;
  school: string;
}

export interface TeamGroupAssignmentPlanGroup {
  name: string;
  teamIds: string[];
}

export interface DiscordTeamGroupsRepository {
  clearCategoryId: (groupId: string) => Promise<boolean>;
  clearMemberChannelId: (memberId: string) => Promise<boolean>;
  list: () => Promise<DiscordTeamGroupRecord[]>;
  listTeamsWithGroup: () => Promise<TeamWithGroupRecord[]>;
  replaceAssignment: (groups: TeamGroupAssignmentPlanGroup[]) => Promise<void>;
  setCategoryId: (groupId: string, categoryId: string) => Promise<boolean>;
  setMemberChannelId: (memberId: string, channelId: string) => Promise<boolean>;
}

type Database = typeof db;

export function createDiscordTeamGroupsRepository(
  database: Database = db,
): DiscordTeamGroupsRepository {
  const execute = createRepositoryExecutor(discordTeamGroupsRepositoryError);

  return {
    clearCategoryId: async (groupId) =>
      await execute(async () => {
        const result = await database
          .update(discordTeamGroups)
          .set({ categoryId: null })
          .where(eq(discordTeamGroups.id, groupId))
          .returning({ id: discordTeamGroups.id });

        return result.length > 0;
      }),
    clearMemberChannelId: async (memberId) =>
      await execute(async () => {
        const result = await database
          .update(discordTeamGroupMembers)
          .set({ channelId: null })
          .where(eq(discordTeamGroupMembers.id, memberId))
          .returning({ id: discordTeamGroupMembers.id });

        return result.length > 0;
      }),
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
    listTeamsWithGroup: async () =>
      await execute(async () => {
        const rows = await database
          .select({
            groupId: discordTeamGroups.id,
            groupIndex: discordTeamGroups.index,
            groupName: discordTeamGroups.name,
            teamId: teams.id,
            teamIndex: teams.index,
            teamName: teams.name,
            teamSchool: teams.school,
          })
          .from(teams)
          // Only teams whose registration documents passed staff review are eligible for a team
          // group — an inner join excludes teams with no review yet or a non-approved one.
          .innerJoin(
            teamRegistrationReviews,
            and(
              eq(teamRegistrationReviews.teamId, teams.id),
              eq(teamRegistrationReviews.status, "APPROVED"),
            ),
          )
          .leftJoin(discordTeamGroupMembers, eq(discordTeamGroupMembers.teamId, teams.id))
          .leftJoin(discordTeamGroups, eq(discordTeamGroups.id, discordTeamGroupMembers.groupId))
          .orderBy(asc(teams.index));

        return rows.map((row) => ({
          group:
            row.groupId === null || row.groupIndex === null || row.groupName === null
              ? null
              : { id: row.groupId, index: row.groupIndex, name: row.groupName },
          id: row.teamId,
          index: row.teamIndex,
          name: row.teamName,
          school: row.teamSchool,
        }));
      }),
    replaceAssignment: async (groups) => {
      const provisioned = await database
        .select({ id: discordTeamGroups.id })
        .from(discordTeamGroups)
        .where(isNotNull(discordTeamGroups.categoryId))
        .limit(1);

      if (provisioned.length > 0) {
        throw createTeamGroupsProvisionedError();
      }

      try {
        await database.transaction(async (tx) => {
          await tx.delete(discordTeamGroups);

          for (const [groupOffset, group] of groups.entries()) {
            // eslint-disable-next-line no-await-in-loop -- groups are inserted one at a time so each gets an explicit, sequential index
            const [inserted] = await tx
              .insert(discordTeamGroups)
              .values({ index: groupOffset + 1, name: group.name })
              .returning({ id: discordTeamGroups.id });

            if (inserted && group.teamIds.length > 0) {
              // eslint-disable-next-line no-await-in-loop -- see above
              await tx
                .insert(discordTeamGroupMembers)
                .values(group.teamIds.map((teamId) => ({ groupId: inserted.id, teamId })));
            }
          }
        });
      } catch (error) {
        rethrowRepositoryError(error, discordTeamGroupsRepositoryError);
      }
    },
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
