import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const staffDiscordLinks = pgTable(
  "staff_discord_links",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    discordUserId: text("discord_user_id").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("staff_discord_links_user_id_unique").on(table.userId),
    unique("staff_discord_links_discord_user_id_unique").on(table.discordUserId),
  ],
);

export const staffDiscordLinkRelations = relations(staffDiscordLinks, ({ one }) => ({
  user: one(user, { fields: [staffDiscordLinks.userId], references: [user.id] }),
}));

export type StaffDiscordLink = typeof staffDiscordLinks.$inferSelect;
export type NewStaffDiscordLink = typeof staffDiscordLinks.$inferInsert;
