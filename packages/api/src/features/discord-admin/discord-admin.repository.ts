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

export interface StaffNicknameFactsRow {
  discordUserId: string;
  overseerGroup: { categoryId: string | null; index: number } | null;
  role: string | null;
  userName: string;
}

export interface ParticipantNicknameFactsRow {
  discordUserId: string;
  firstNameTh: string;
  teamIndex: number;
  teamName: string;
  wasAlt: boolean;
}

export interface ParticipantLookupFacts {
  altAccUserId: string | null;
  code: string;
  email: string;
  firstNameTh: string;
  lastNameTh: string;
  lineId: string | null;
  mainAccUserId: string | null;
  middleNameTh: string | null;
  phone: string;
  school: string;
  teamName: string;
  titleTh: string;
}

export interface DiscordAdminRepository {
  /** A verified participant by either their main or alt Discord account; null when neither matches. */
  findParticipantByDiscordUserId: (discordUserId: string) => Promise<ParticipantLookupFacts | null>;
  /** Every linked participant account (main and alt), with what their nickname should be computed from. */
  listParticipantNicknameFacts: () => Promise<ParticipantNicknameFactsRow[]>;
  /** Every linked staff member, with what their nickname should be computed from. */
  listStaffNicknameFacts: () => Promise<StaffNicknameFactsRow[]>;
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
    findParticipantByDiscordUserId: async (discordUserId) =>
      await execute(async () => {
        const [row] = await database
          .select({
            altAccUserId: discord.altAccUserId,
            code: discord.code,
            email: teamParticipants.email,
            firstNameTh: teamParticipants.firstNameTh,
            lastNameTh: teamParticipants.lastNameTh,
            lineId: teamParticipants.lineId,
            mainAccUserId: discord.mainAccUserId,
            middleNameTh: teamParticipants.middleNameTh,
            phone: teamParticipants.phone,
            school: teams.school,
            teamName: teams.name,
            titleTh: teamParticipants.titleTh,
          })
          .from(discord)
          .innerJoin(teamParticipants, eq(teamParticipants.id, discord.participantId))
          .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
          .where(
            or(eq(discord.mainAccUserId, discordUserId), eq(discord.altAccUserId, discordUserId)),
          )
          .limit(1);

        return row ?? null;
      }),
    listParticipantNicknameFacts: async () =>
      await execute(async () => {
        const rows = await database
          .select({
            altAccUserId: discord.altAccUserId,
            firstNameTh: teamParticipants.firstNameTh,
            mainAccUserId: discord.mainAccUserId,
            teamIndex: teams.index,
            teamName: teams.name,
          })
          .from(discord)
          .innerJoin(teamParticipants, eq(teamParticipants.id, discord.participantId))
          .innerJoin(teams, eq(teams.id, teamParticipants.teamId));

        return rows.flatMap(({ altAccUserId, firstNameTh, mainAccUserId, teamIndex, teamName }) =>
          [
            mainAccUserId === null ? null : { discordUserId: mainAccUserId, wasAlt: false },
            altAccUserId === null ? null : { discordUserId: altAccUserId, wasAlt: true },
          ]
            .filter(
              (account): account is { discordUserId: string; wasAlt: boolean } => account !== null,
            )
            .map((account) => ({ ...account, firstNameTh, teamIndex, teamName })),
        );
      }),
    listStaffNicknameFacts: async () =>
      await execute(async () => {
        const rows = await database
          .select({
            categoryId: discordTeamGroups.categoryId,
            discordUserId: staffDiscordLinks.discordUserId,
            groupIndex: discordTeamGroups.index,
            overseerGroupId: discordTeamGroupOverseers.groupId,
            role: user.role,
            userName: user.name,
          })
          .from(staffDiscordLinks)
          .innerJoin(user, eq(user.id, staffDiscordLinks.userId))
          .leftJoin(
            discordTeamGroupOverseers,
            eq(discordTeamGroupOverseers.userId, staffDiscordLinks.userId),
          )
          .leftJoin(discordTeamGroups, eq(discordTeamGroups.id, discordTeamGroupOverseers.groupId));

        return rows.map(
          ({ categoryId, discordUserId, groupIndex, overseerGroupId, role, userName }) => ({
            discordUserId,
            overseerGroup:
              overseerGroupId === null || groupIndex === null
                ? null
                : { categoryId, index: groupIndex },
            role,
            userName,
          }),
        );
      }),
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

        // ponytail: O(teams x participants) filter, fine for a few hundred teams; group into a Map if it grows.
        return teamRows.map((team) => ({
          ...team,
          participants: participantRows
            .filter((row) => row.teamId === team.id)
            .map(({ teamId: _teamId, ...rest }) => rest),
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
