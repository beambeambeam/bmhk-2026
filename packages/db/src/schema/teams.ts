import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { files } from "./files";

export const teamAwardValues = [
  "NO_ACHIEVEMENT",
  "ROUND_1_COMPLETED",
  "ROUND_2_COMPLETED",
  "HONORABLE_MENTION",
  "THIRD_PLACE",
  "SECOND_PLACE",
  "FIRST_PLACE",
] as const;

export const teamAwardEnum = pgEnum("team_award", teamAwardValues);

export const teams = pgTable(
  "teams",
  {
    award: teamAwardEnum("award").default("NO_ACHIEVEMENT").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    image: uuid("image").references(() => files.id, { onDelete: "set null" }),
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
  (table) => [unique("teams_user_id_unique").on(table.userId)],
);
