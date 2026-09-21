import { db } from "@bmhk-2026/db";
import { discord } from "@bmhk-2026/db/schema/discord";
import { discordTeamGroupMembers } from "@bmhk-2026/db/schema/discord-team-group-members";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teams } from "@bmhk-2026/db/schema/teams";
import { eq, or, sql } from "drizzle-orm";

import { createRepositoryExecutor } from "../../core/repository";
import { discordRepositoryError } from "./discord.errors";
import type { DiscordCodeLookup } from "./discord.schema";

export type DiscordRedemptionResult =
  | { outcome: "already_linked" }
  | { outcome: "already_redeemed" }
  | {
      channelId: string | null;
      firstNameTh: string;
      outcome: "redeemed";
      teamIndex: number;
      teamName: string;
      wasAlt: boolean;
    }
  | { outcome: "not_found" };

export interface DiscordRepository {
  findByCode: (code: string) => Promise<DiscordCodeLookup | null>;
  redeem: (code: string, discordUserId: string) => Promise<DiscordRedemptionResult>;
}

type Database = typeof db;

export function createDiscordRepository(database: Database = db): DiscordRepository {
  const execute = createRepositoryExecutor(discordRepositoryError);

  return {
    findByCode: async (code) =>
      await execute(async () => {
        const [row] = await database
          .select({
            altAccUserId: discord.altAccUserId,
            altRedeemedAt: discord.altRedeemedAt,
            code: discord.code,
            discordId: discord.id,
            firstNameEn: teamParticipants.firstNameEn,
            firstNameTh: teamParticipants.firstNameTh,
            lastNameEn: teamParticipants.lastNameEn,
            lastNameTh: teamParticipants.lastNameTh,
            mainAccUserId: discord.mainAccUserId,
            participantId: teamParticipants.id,
            redeemedAt: discord.redeemedAt,
            school: teams.school,
            teamId: teamParticipants.teamId,
            teamName: teams.name,
          })
          .from(discord)
          .innerJoin(teamParticipants, eq(teamParticipants.id, discord.participantId))
          .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
          .where(eq(discord.code, code))
          .limit(1);

        if (!row) {
          return null;
        }

        return {
          discord: {
            altAccUserId: row.altAccUserId,
            altRedeemedAt: row.altRedeemedAt,
            code: row.code,
            id: row.discordId,
            mainAccUserId: row.mainAccUserId,
            redeemedAt: row.redeemedAt,
          },
          firstNameEn: row.firstNameEn,
          firstNameTh: row.firstNameTh,
          id: row.participantId,
          lastNameEn: row.lastNameEn,
          lastNameTh: row.lastNameTh,
          school: row.school,
          teamId: row.teamId,
          teamName: row.teamName,
        };
      }),
    redeem: async (code, discordUserId) =>
      await execute(
        async () =>
          await database.transaction(async (tx) => {
            // Row locks are per-row, so two codes redeemed by the same user at once
            // would both pass the check below; serialize per Discord user instead.
            await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${discordUserId}))`);

            const [existingLink] = await tx
              .select({ id: discord.id })
              .from(discord)
              .where(
                or(
                  eq(discord.mainAccUserId, discordUserId),
                  eq(discord.altAccUserId, discordUserId),
                ),
              )
              .limit(1);
            if (existingLink) {
              return { outcome: "already_linked" as const };
            }

            const [row] = await tx
              .select({
                altRedeemedAt: discord.altRedeemedAt,
                channelId: discordTeamGroupMembers.channelId,
                firstNameTh: teamParticipants.firstNameTh,
                id: discord.id,
                redeemedAt: discord.redeemedAt,
                teamIndex: teams.index,
                teamName: teams.name,
              })
              .from(discord)
              .innerJoin(teamParticipants, eq(teamParticipants.id, discord.participantId))
              .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
              .leftJoin(
                discordTeamGroupMembers,
                eq(discordTeamGroupMembers.teamId, teamParticipants.teamId),
              )
              .where(eq(discord.code, code))
              // Scoped to `discord` only: Postgres refuses a bare FOR UPDATE
              // when a LEFT JOIN is present, since it can't lock a row that
              // might not exist on the nullable side.
              .for("update", { of: discord })
              .limit(1);

            if (!row) {
              return { outcome: "not_found" as const };
            }

            if (row.redeemedAt && row.altRedeemedAt) {
              return { outcome: "already_redeemed" as const };
            }

            const wasAlt = row.redeemedAt !== null;
            await tx
              .update(discord)
              .set(
                wasAlt
                  ? { altAccUserId: discordUserId, altRedeemedAt: new Date() }
                  : { mainAccUserId: discordUserId, redeemedAt: new Date() },
              )
              .where(eq(discord.id, row.id));

            return {
              channelId: row.channelId,
              firstNameTh: row.firstNameTh,
              outcome: "redeemed" as const,
              teamIndex: row.teamIndex,
              teamName: row.teamName,
              wasAlt,
            };
          }),
      ),
  };
}
