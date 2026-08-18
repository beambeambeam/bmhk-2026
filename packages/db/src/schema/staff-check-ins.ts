import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const staffCheckIns = pgTable(
  "staff_check_ins",
  {
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }).defaultNow().notNull(),
    checkedInByUserId: text("checked_in_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("staff_check_ins_checked_in_by_user_id_idx").on(table.checkedInByUserId)],
);
