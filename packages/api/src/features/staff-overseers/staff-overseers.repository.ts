import { db } from "@bmhk-2026/db";
import { discordTeamGroupOverseers } from "@bmhk-2026/db/schema/discord-team-group-overseers";
import { discordTeamGroups } from "@bmhk-2026/db/schema/discord-team-groups";
import { staffOverseerImportBacklog } from "@bmhk-2026/db/schema/staff-overseer-import-backlog";
import { user } from "@bmhk-2026/db/schema/auth";
import { and, eq, or } from "drizzle-orm";

import { createRepositoryExecutor } from "../../core/repository";
import { staffOverseersRepositoryError } from "./staff-overseers.errors";

export interface StaffOverseerGroupLookup {
  id: string;
  index: number;
  name: string;
}

export interface StaffOverseerRecord {
  email: string;
  groupIndex: number;
  groupName: string;
  userId: string;
  userName: string;
}

export interface StaffOverseerBacklogRecord {
  createdAt: Date;
  email: string;
  groupId: string;
  groupIndex: number;
  groupName: string;
  id: string;
}

export interface StaffOverseersRepository {
  addBacklogEntry: (email: string, groupId: string) => Promise<void>;
  assignOverseer: (groupId: string, userId: string) => Promise<void>;
  findBacklogEntry: (id: string) => Promise<StaffOverseerBacklogRecord | null>;
  findGroupByIndex: (index: number) => Promise<StaffOverseerGroupLookup | null>;
  findUserByEmail: (email: string) => Promise<{ id: string; name: string } | null>;
  listBacklog: () => Promise<StaffOverseerBacklogRecord[]>;
  listOverseers: () => Promise<StaffOverseerRecord[]>;
  removeBacklogEntry: (id: string) => Promise<void>;
}

type Database = typeof db;

export function createStaffOverseersRepository(database: Database = db): StaffOverseersRepository {
  const execute = createRepositoryExecutor(staffOverseersRepositoryError);

  return {
    addBacklogEntry: async (email, groupId) => {
      await execute(async () => {
        const [existing] = await database
          .select({ id: staffOverseerImportBacklog.id })
          .from(staffOverseerImportBacklog)
          .where(
            and(
              eq(staffOverseerImportBacklog.email, email),
              eq(staffOverseerImportBacklog.groupId, groupId),
            ),
          )
          .limit(1);

        if (existing) {
          return;
        }

        await database.insert(staffOverseerImportBacklog).values({ email, groupId });
      });
    },
    assignOverseer: async (groupId, userId) => {
      await execute(async () => {
        await database.transaction(async (tx) => {
          await tx
            .delete(discordTeamGroupOverseers)
            .where(
              or(
                eq(discordTeamGroupOverseers.groupId, groupId),
                eq(discordTeamGroupOverseers.userId, userId),
              ),
            );
          await tx.insert(discordTeamGroupOverseers).values({ groupId, userId });
        });
      });
    },
    findBacklogEntry: async (id) =>
      await execute(async () => {
        const [row] = await database
          .select({
            createdAt: staffOverseerImportBacklog.createdAt,
            email: staffOverseerImportBacklog.email,
            groupId: staffOverseerImportBacklog.groupId,
            groupIndex: discordTeamGroups.index,
            groupName: discordTeamGroups.name,
            id: staffOverseerImportBacklog.id,
          })
          .from(staffOverseerImportBacklog)
          .innerJoin(
            discordTeamGroups,
            eq(discordTeamGroups.id, staffOverseerImportBacklog.groupId),
          )
          .where(eq(staffOverseerImportBacklog.id, id))
          .limit(1);

        return row ?? null;
      }),
    findGroupByIndex: async (index) =>
      await execute(async () => {
        const [row] = await database
          .select({
            id: discordTeamGroups.id,
            index: discordTeamGroups.index,
            name: discordTeamGroups.name,
          })
          .from(discordTeamGroups)
          .where(eq(discordTeamGroups.index, index))
          .limit(1);

        return row ?? null;
      }),
    findUserByEmail: async (email) =>
      await execute(async () => {
        const [row] = await database
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(eq(user.email, email))
          .limit(1);

        return row ?? null;
      }),
    listBacklog: async () =>
      await execute(
        async () =>
          await database
            .select({
              createdAt: staffOverseerImportBacklog.createdAt,
              email: staffOverseerImportBacklog.email,
              groupId: staffOverseerImportBacklog.groupId,
              groupIndex: discordTeamGroups.index,
              groupName: discordTeamGroups.name,
              id: staffOverseerImportBacklog.id,
            })
            .from(staffOverseerImportBacklog)
            .innerJoin(
              discordTeamGroups,
              eq(discordTeamGroups.id, staffOverseerImportBacklog.groupId),
            ),
      ),
    listOverseers: async () =>
      await execute(
        async () =>
          await database
            .select({
              email: user.email,
              groupIndex: discordTeamGroups.index,
              groupName: discordTeamGroups.name,
              userId: user.id,
              userName: user.name,
            })
            .from(discordTeamGroupOverseers)
            .innerJoin(
              discordTeamGroups,
              eq(discordTeamGroups.id, discordTeamGroupOverseers.groupId),
            )
            .innerJoin(user, eq(user.id, discordTeamGroupOverseers.userId)),
      ),
    removeBacklogEntry: async (id) => {
      await execute(async () => {
        await database
          .delete(staffOverseerImportBacklog)
          .where(eq(staffOverseerImportBacklog.id, id));
      });
    },
  };
}
