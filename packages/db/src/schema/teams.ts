import {
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const teamAwardValues = [
  "NONE",
  "REGISTERED",
  "ROUND_1_PARTICIPANT",
  "ROUND_2_PARTICIPANT",
  "HONORABLE_MENTION",
  "3RD_PLACE",
  "2ND_PLACE",
  "1ST_PLACE",
] as const;

export const teamAwardEnum = pgEnum("team_award", teamAwardValues);

export const teams = pgTable(
  "teams",
  {
    award: teamAwardEnum("award").default("NONE").notNull(),
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
