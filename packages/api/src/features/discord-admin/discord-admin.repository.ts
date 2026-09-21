import { db } from "@bmhk-2026/db";
import { user } from "@bmhk-2026/db/schema/auth";
import { discord } from "@bmhk-2026/db/schema/discord";
import { discordTeamGroupMembers } from "@bmhk-2026/db/schema/discord-team-group-members";
import { discordTeamGroupOverseers } from "@bmhk-2026/db/schema/discord-team-group-overseers";
import { discordTeamGroups } from "@bmhk-2026/db/schema/discord-team-groups";
import { staffDiscordLinks } from "@bmhk-2026/db/schema/staff-discord-links";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teamRegistrationReviews } from "@bmhk-2026/db/schema/team-registration-reviews";
import { teams } from "@bmhk-2026/db/schema/teams";
import { asc, eq, or } from "drizzle-orm";

import { createRepositoryExecutor } from "../../core/repository";
import { discordAdminRepositoryError } from "./discord-admin.errors";

const ADMIN_ROLES = new Set(["admin", "superAdmin"]);

export interface AdminParticipantFacts {
  altAccUserId: string | null;
  altRedeemedAt: Date | null;
  code: string | null;
  firstNameTh: string;
  index: number;
  lastNameTh: string;
  mainAccUserId: string | null;
  middleNameTh: string | null;
  redeemedAt: Date | null;
  titleTh: string;
}

export interface AdminTeamFacts {
  award: string;
  id: string;
  index: number;
  name: string;
  participants: AdminParticipantFacts[];
  reviewStatus: string | null;
  school: string;
}

export interface RepairFacts {
  participants: { channelId: string | null; discordUserId: string }[];
  staff: { categoryId: string | null; discordUserId: string; isAdmin: boolean }[];
}

export interface DiscordAdminRepository {
  /** Every team, eligible or not; the service filters. Small table, admin-only callers. */
  listTeams: () => Promise<AdminTeamFacts[]>;
  repairFacts: () => Promise<RepairFacts>;
  /** Frees the slot the user holds; null when they hold none. */
  unlinkParticipant: (discordUserId: string) => Promise<{ channelId: string | null } | null>;
  /** Deletes the staff link; null when there is none. */
  unlinkStaff: (discordUserId: string) => Promise<{ categoryId: string | null } | null>;
}

type Database = typeof db;

export function createDiscordAdminRepository(database: Database = db): DiscordAdminRepository {
  const execute = createRepositoryExecutor(discordAdminRepositoryError);

  return {
    listTeams: async () =>
      await execute(async () => {
        const teamRows = await database
          .select({
            award: teams.award,
            id: teams.id,
            index: teams.index,
            name: teams.name,
            reviewStatus: teamRegistrationReviews.status,
            school: teams.school,
          })
          .from(teams)
          .leftJoin(teamRegistrationReviews, eq(teamRegistrationReviews.teamId, teams.id))
          .orderBy(asc(teams.index));

        const participantRows = await database
          .select({
            altAccUserId: discord.altAccUserId,
            altRedeemedAt: discord.altRedeemedAt,
            code: discord.code,
            firstNameTh: teamParticipants.firstNameTh,
            index: teamParticipants.index,
            lastNameTh: teamParticipants.lastNameTh,
            mainAccUserId: discord.mainAccUserId,
            middleNameTh: teamParticipants.middleNameTh,
            redeemedAt: discord.redeemedAt,
            teamId: teamParticipants.teamId,
            titleTh: teamParticipants.titleTh,
          })
          .from(teamParticipants)
          .leftJoin(discord, eq(discord.participantId, teamParticipants.id))
          .orderBy(asc(teamParticipants.index));

        const byTeam = Map.groupBy(participantRows, (row) => row.teamId);
        return teamRows.map((team) => ({
          ...team,
          participants: (byTeam.get(team.id) ?? []).map(({ teamId: _teamId, ...rest }) => rest),
        }));
      }),
    repairFacts: async () =>
      await execute(async () => {
        const participantRows = await database
          .select({
            altAccUserId: discord.altAccUserId,
            channelId: discordTeamGroupMembers.channelId,
            mainAccUserId: discord.mainAccUserId,
          })
          .from(discord)
          .innerJoin(teamParticipants, eq(teamParticipants.id, discord.participantId))
          .leftJoin(
            discordTeamGroupMembers,
            eq(discordTeamGroupMembers.teamId, teamParticipants.teamId),
          );

        const participants = participantRows.flatMap(({ altAccUserId, channelId, mainAccUserId }) =>
          [mainAccUserId, altAccUserId]
            .filter((discordUserId): discordUserId is string => discordUserId !== null)
            .map((discordUserId) => ({ channelId, discordUserId })),
        );

        const staffRows = await database
          .select({
            categoryId: discordTeamGroups.categoryId,
            discordUserId: staffDiscordLinks.discordUserId,
            role: user.role,
          })
          .from(staffDiscordLinks)
          .innerJoin(user, eq(user.id, staffDiscordLinks.userId))
          .leftJoin(
            discordTeamGroupOverseers,
            eq(discordTeamGroupOverseers.userId, staffDiscordLinks.userId),
          )
          .leftJoin(discordTeamGroups, eq(discordTeamGroups.id, discordTeamGroupOverseers.groupId));

        return {
          participants,
          staff: staffRows.map(({ categoryId, discordUserId, role }) => ({
            categoryId,
            discordUserId,
            isAdmin: role !== null && ADMIN_ROLES.has(role),
          })),
        };
      }),
    unlinkParticipant: async (discordUserId) =>
      await execute(
        async () =>
          await database.transaction(async (tx) => {
            const [row] = await tx
              .select({
                channelId: discordTeamGroupMembers.channelId,
                id: discord.id,
                mainAccUserId: discord.mainAccUserId,
              })
              .from(discord)
              .innerJoin(teamParticipants, eq(teamParticipants.id, discord.participantId))
              .leftJoin(
                discordTeamGroupMembers,
                eq(discordTeamGroupMembers.teamId, teamParticipants.teamId),
              )
              .where(
                or(
                  eq(discord.mainAccUserId, discordUserId),
                  eq(discord.altAccUserId, discordUserId),
                ),
              )
              .for("update", { of: discord })
              .limit(1);
            if (!row) {
              return null;
            }

            await tx
              .update(discord)
              .set(
                row.mainAccUserId === discordUserId
                  ? { mainAccUserId: null, redeemedAt: null }
                  : { altAccUserId: null, altRedeemedAt: null },
              )
              .where(eq(discord.id, row.id));
            return { channelId: row.channelId };
          }),
      ),
    unlinkStaff: async (discordUserId) =>
      await execute(
        async () =>
          await database.transaction(async (tx) => {
            const [link] = await tx
              .delete(staffDiscordLinks)
              .where(eq(staffDiscordLinks.discordUserId, discordUserId))
              .returning({ userId: staffDiscordLinks.userId });
            if (!link) {
              return null;
            }

            const [group] = await tx
              .select({ categoryId: discordTeamGroups.categoryId })
              .from(discordTeamGroupOverseers)
              .innerJoin(
                discordTeamGroups,
                eq(discordTeamGroups.id, discordTeamGroupOverseers.groupId),
              )
              .where(eq(discordTeamGroupOverseers.userId, link.userId))
              .limit(1);
            return { categoryId: group?.categoryId ?? null };
          }),
      ),
  };
}
