import { relations } from "drizzle-orm";
import { pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { discordTeamGroups } from "./discord-team-groups";
import { teams } from "./teams";

export const discordTeamGroupMembers = pgTable(
  "discord_team_group_members",
  {
    channelId: text("channel_id"),
    groupId: uuid("group_id")
      .notNull()
      .references(() => discordTeamGroups.id, { onDelete: "cascade" }),
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
  },
  (table) => [unique("discord_team_group_members_team_id_unique").on(table.teamId)],
);

export const discordTeamGroupMemberRelations = relations(discordTeamGroupMembers, ({ one }) => ({
  group: one(discordTeamGroups, {
    fields: [discordTeamGroupMembers.groupId],
    references: [discordTeamGroups.id],
  }),
  team: one(teams, {
    fields: [discordTeamGroupMembers.teamId],
    references: [teams.id],
  }),
}));

export type DiscordTeamGroupMember = typeof discordTeamGroupMembers.$inferSelect;
export type NewDiscordTeamGroupMember = typeof discordTeamGroupMembers.$inferInsert;
