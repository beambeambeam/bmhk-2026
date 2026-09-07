import { index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { checkInRoundEnum } from "./check-in-round";

export const staffCheckIns = pgTable(
  "staff_check_ins",
  {
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }).defaultNow().notNull(),
    checkedInByUserId: text("checked_in_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    round: checkInRoundEnum("round").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.round] }),
    index("staff_check_ins_checked_in_by_user_id_idx").on(table.checkedInByUserId),
  ],
);
