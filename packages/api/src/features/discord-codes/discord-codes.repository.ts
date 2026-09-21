import { db } from "@bmhk-2026/db";
import { discord } from "@bmhk-2026/db/schema/discord";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teamRegistrationReviews } from "@bmhk-2026/db/schema/team-registration-reviews";
import { teams } from "@bmhk-2026/db/schema/teams";
import type { SQL } from "drizzle-orm";
import { asc, eq } from "drizzle-orm";

import { createRepositoryExecutor } from "../../core/repository";
import { discordCodesRepositoryError } from "./discord-codes.errors";

export interface DiscordCodeTeamFacts {
  award: string;
  participants: {
    altRedeemedAt: Date | null;
    code: string | null;
    firstNameTh: string;
    id: string;
    index: number;
    lastNameTh: string;
    middleNameTh: string | null;
    redeemedAt: Date | null;
    titleTh: string;
  }[];
  reviewStatus: string | null;
  teamId: string;
}

export interface DiscordCodeRepository {
  findByOwnerId: (ownerId: string) => Promise<DiscordCodeTeamFacts | null>;
  findByTeamId: (teamId: string) => Promise<DiscordCodeTeamFacts | null>;
  /** Skips rows that collide on participant or code; callers re-read to see what landed. */
  insertMissing: (rows: { code: string; participantId: string }[]) => Promise<void>;
}

type Database = typeof db;

export function createDiscordCodeRepository(database: Database = db): DiscordCodeRepository {
  const execute = createRepositoryExecutor(discordCodesRepositoryError);

  async function find(condition: SQL): Promise<DiscordCodeTeamFacts | null> {
    return await execute(async () => {
      const [team] = await database
        .select({
          award: teams.award,
          reviewStatus: teamRegistrationReviews.status,
          teamId: teams.id,
        })
        .from(teams)
        .leftJoin(teamRegistrationReviews, eq(teamRegistrationReviews.teamId, teams.id))
        .where(condition)
        .limit(1);
      if (!team) {
        return null;
      }

      const participants = await database
        .select({
          altRedeemedAt: discord.altRedeemedAt,
          code: discord.code,
          firstNameTh: teamParticipants.firstNameTh,
          id: teamParticipants.id,
          index: teamParticipants.index,
          lastNameTh: teamParticipants.lastNameTh,
          middleNameTh: teamParticipants.middleNameTh,
          redeemedAt: discord.redeemedAt,
          titleTh: teamParticipants.titleTh,
        })
        .from(teamParticipants)
        .leftJoin(discord, eq(discord.participantId, teamParticipants.id))
        .where(eq(teamParticipants.teamId, team.teamId))
        .orderBy(asc(teamParticipants.index));

      return { ...team, participants };
    });
  }

  return {
    findByOwnerId: async (ownerId) => await find(eq(teams.userId, ownerId)),
    findByTeamId: async (teamId) => await find(eq(teams.id, teamId)),
    insertMissing: async (rows) => {
      if (rows.length === 0) {
        return;
      }
      await execute(async () => {
        await database.insert(discord).values(rows).onConflictDoNothing();
      });
    },
  };
}
