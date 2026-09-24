import { index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { checkInRoundEnum } from "./check-in-round";
import { teams } from "./teams";

export const teamCheckIns = pgTable(
  "team_check_ins",
  {
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }).defaultNow().notNull(),
    checkedInByUserId: text("checked_in_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    round: checkInRoundEnum("round").notNull(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.round] }),
    index("team_check_ins_checked_in_by_user_id_idx").on(table.checkedInByUserId),
  ],
);
