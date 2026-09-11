import { relations } from "drizzle-orm";
import { pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { discordTeamGroups } from "./discord-team-groups";

export const discordTeamGroupOverseers = pgTable(
  "discord_team_group_overseers",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => discordTeamGroups.id, { onDelete: "cascade" }),
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [unique("discord_team_group_overseers_group_id_unique").on(table.groupId)],
);

export const discordTeamGroupOverseerRelations = relations(
  discordTeamGroupOverseers,
  ({ one }) => ({
    group: one(discordTeamGroups, {
      fields: [discordTeamGroupOverseers.groupId],
      references: [discordTeamGroups.id],
    }),
    user: one(user, {
      fields: [discordTeamGroupOverseers.userId],
      references: [user.id],
    }),
  }),
);

export type DiscordTeamGroupOverseer = typeof discordTeamGroupOverseers.$inferSelect;
export type NewDiscordTeamGroupOverseer = typeof discordTeamGroupOverseers.$inferInsert;
