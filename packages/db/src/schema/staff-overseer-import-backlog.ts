import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { discordTeamGroups } from "./discord-team-groups";

export const staffOverseerImportBacklog = pgTable("staff_overseer_import_backlog", {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  email: text("email").notNull(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => discordTeamGroups.id, { onDelete: "cascade" }),
  id: uuid("id").defaultRandom().primaryKey(),
});

export const staffOverseerImportBacklogRelations = relations(
  staffOverseerImportBacklog,
  ({ one }) => ({
    group: one(discordTeamGroups, {
      fields: [staffOverseerImportBacklog.groupId],
      references: [discordTeamGroups.id],
    }),
  }),
);

export type StaffOverseerImportBacklogEntry = typeof staffOverseerImportBacklog.$inferSelect;
export type NewStaffOverseerImportBacklogEntry = typeof staffOverseerImportBacklog.$inferInsert;
