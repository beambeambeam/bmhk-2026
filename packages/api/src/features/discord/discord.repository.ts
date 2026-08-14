import { db } from "@bmhk-2026/db";
import { discord } from "@bmhk-2026/db/schema/discord";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teams } from "@bmhk-2026/db/schema/teams";
import { eq } from "drizzle-orm";

import { createRepositoryExecutor } from "../../core/repository";
import { discordRepositoryError } from "./discord.errors";
import type { DiscordCodeLookup } from "./discord.schema";

export type DiscordRedemptionResult =
  | { outcome: "already_redeemed" }
  | { firstNameEn: string; lastNameEn: string; outcome: "redeemed"; wasAlt: boolean }
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
            lastNameEn: teamParticipants.lastNameEn,
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
          id: row.participantId,
          lastNameEn: row.lastNameEn,
          school: row.school,
          teamId: row.teamId,
          teamName: row.teamName,
        };
      }),
    redeem: async (code, discordUserId) =>
      await execute(
        async () =>
          await database.transaction(async (tx) => {
            const [row] = await tx
              .select({
                altRedeemedAt: discord.altRedeemedAt,
                firstNameEn: teamParticipants.firstNameEn,
                id: discord.id,
                lastNameEn: teamParticipants.lastNameEn,
                redeemedAt: discord.redeemedAt,
              })
              .from(discord)
              .innerJoin(teamParticipants, eq(teamParticipants.id, discord.participantId))
              .where(eq(discord.code, code))
              .for("update")
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
              firstNameEn: row.firstNameEn,
              lastNameEn: row.lastNameEn,
              outcome: "redeemed" as const,
              wasAlt,
            };
          }),
      ),
  };
}
