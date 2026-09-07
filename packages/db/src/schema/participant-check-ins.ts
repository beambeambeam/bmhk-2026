import { index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { checkInRoundEnum } from "./check-in-round";
import { teamParticipants } from "./team-participants";

export const participantCheckInFlagValues = ["feeling_unwell", "bad_behavior"] as const;
export const participantCheckInFlag = pgEnum(
  "participant_check_in_flag",
  participantCheckInFlagValues,
);

export const participantCheckIns = pgTable(
  "participant_check_ins",
  {
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }).defaultNow().notNull(),
    checkedInByUserId: text("checked_in_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    flag: participantCheckInFlag("flag"),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => teamParticipants.id, { onDelete: "cascade" }),
    round: checkInRoundEnum("round").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.participantId, table.round] }),
    index("participant_check_ins_checked_in_by_user_id_idx").on(table.checkedInByUserId),
  ],
);
