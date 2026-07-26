import { index, integer, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const teams = pgTable(
  "teams",
  {
    award: text("award").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    index: serial("index").notNull(),
    memberCount: integer("member_count").default(0).notNull(),
    name: text("team_name").notNull(),
    school: text("school_name").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("teams_user_id_idx").on(table.userId)],
);
