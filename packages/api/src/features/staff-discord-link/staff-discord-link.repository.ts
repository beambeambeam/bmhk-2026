import { db } from "@bmhk-2026/db";
import { discordTeamGroupOverseers } from "@bmhk-2026/db/schema/discord-team-group-overseers";
import { discordTeamGroups } from "@bmhk-2026/db/schema/discord-team-groups";
import { staffDiscordLinks } from "@bmhk-2026/db/schema/staff-discord-links";
import { staffVerifyTokens } from "@bmhk-2026/db/schema/staff-verify-tokens";
import { and, eq, gt, isNull } from "drizzle-orm";

import { createRepositoryExecutor } from "../../core/repository";
import { staffDiscordLinkRepositoryError } from "./staff-discord-link.errors";

const TOKEN_TTL_MS = 10 * 60 * 1000;

export interface StaffOverseerGroup {
  categoryId: string | null;
  index: number;
}

export interface StaffDiscordLinkRepository {
  consumeToken: (token: string) => Promise<{ discordUserId: string } | null>;
  createToken: (discordUserId: string) => Promise<{ expiresAt: Date; token: string }>;
  findLinkByDiscordUserId: (discordUserId: string) => Promise<{ userId: string } | null>;
  findLinkByUserId: (userId: string) => Promise<{ discordUserId: string } | null>;
  findOverseerGroup: (userId: string) => Promise<StaffOverseerGroup | null>;
  upsertLink: (userId: string, discordUserId: string) => Promise<void>;
}

type Database = typeof db;

export function createStaffDiscordLinkRepository(
  database: Database = db,
): StaffDiscordLinkRepository {
  const execute = createRepositoryExecutor(staffDiscordLinkRepositoryError);

  return {
    consumeToken: async (token) =>
      await execute(async () => {
        const [row] = await database
          .update(staffVerifyTokens)
          .set({ consumedAt: new Date() })
          .where(
            and(
              eq(staffVerifyTokens.token, token),
              isNull(staffVerifyTokens.consumedAt),
              gt(staffVerifyTokens.expiresAt, new Date()),
            ),
          )
          .returning({ discordUserId: staffVerifyTokens.discordUserId });

        return row ?? null;
      }),
    createToken: async (discordUserId) =>
      await execute(async () => {
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
        await database.insert(staffVerifyTokens).values({ discordUserId, expiresAt, token });
        return { expiresAt, token };
      }),
    findLinkByDiscordUserId: async (discordUserId) =>
      await execute(async () => {
        const [row] = await database
          .select({ userId: staffDiscordLinks.userId })
          .from(staffDiscordLinks)
          .where(eq(staffDiscordLinks.discordUserId, discordUserId))
          .limit(1);

        return row ?? null;
      }),
    findLinkByUserId: async (userId) =>
      await execute(async () => {
        const [row] = await database
          .select({ discordUserId: staffDiscordLinks.discordUserId })
          .from(staffDiscordLinks)
          .where(eq(staffDiscordLinks.userId, userId))
          .limit(1);

        return row ?? null;
      }),
    findOverseerGroup: async (userId) =>
      await execute(async () => {
        const [row] = await database
          .select({ categoryId: discordTeamGroups.categoryId, index: discordTeamGroups.index })
          .from(discordTeamGroupOverseers)
          .innerJoin(discordTeamGroups, eq(discordTeamGroups.id, discordTeamGroupOverseers.groupId))
          .where(eq(discordTeamGroupOverseers.userId, userId))
          .limit(1);

        return row ?? null;
      }),
    upsertLink: async (userId, discordUserId) => {
      await execute(async () => {
        await database
          .insert(staffDiscordLinks)
          .values({ discordUserId, userId })
          .onConflictDoUpdate({ set: { discordUserId }, target: staffDiscordLinks.userId });
      });
    },
  };
}
