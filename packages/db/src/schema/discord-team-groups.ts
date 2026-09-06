import { pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const discordTeamGroups = pgTable("discord_team_groups", {
  categoryId: text("category_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  index: serial("index").notNull(),
  name: text("name").notNull(),
});

export type DiscordTeamGroup = typeof discordTeamGroups.$inferSelect;
export type NewDiscordTeamGroup = typeof discordTeamGroups.$inferInsert;
