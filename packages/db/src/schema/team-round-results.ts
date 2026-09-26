import { sql } from "drizzle-orm";
import { check, integer, numeric, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";

import { checkInRoundEnum } from "./check-in-round";
import { teams } from "./teams";

export const teamRoundResults = pgTable(
  "team_round_results",
  {
    completedAssignment: integer("completed_assignment").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastSubmittedAt: timestamp("last_submitted_at", { withTimezone: true }),
    round: checkInRoundEnum("round").notNull(),
    score: numeric("score", { mode: "number" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    totalSubmission: integer("total_submission").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.round] }),
    check(
      "team_round_results_completed_assignment_nonnegative",
      sql`${table.completedAssignment} >= 0`,
    ),
    check("team_round_results_total_submission_nonnegative", sql`${table.totalSubmission} >= 0`),
    check(
      "team_round_results_score_valid",
      sql`
        ${table.score} IS NULL OR (
          ${table.score} > '-Infinity'::numeric AND
          ${table.score} < 'Infinity'::numeric AND
          scale(${table.score}) <= 2
        )
      `,
    ),
  ],
);
