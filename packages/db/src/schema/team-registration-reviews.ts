import { relations, sql } from "drizzle-orm";
import { check, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { teams } from "./teams";

const MAX_INTERNAL_NOTES_LENGTH = 4000;
const MAX_ISSUE_CODES_PER_SUBJECT = 50;

export const teamRegistrationReviewStatusValues = [
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
] as const;

export const teamRegistrationReviewStatusEnum = pgEnum(
  "team_registration_review_status",
  teamRegistrationReviewStatusValues,
);

export const teamRegistrationReviews = pgTable(
  "team_registration_reviews",
  {
    advisorIssueCodes: text("advisor_issue_codes").array().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    internalNotes: text("internal_notes"),
    participant1IssueCodes: text("participant1_issue_codes").array().default([]).notNull(),
    participant2IssueCodes: text("participant2_issue_codes").array().default([]).notNull(),
    participant3IssueCodes: text("participant3_issue_codes").array().default([]).notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
    reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    status: teamRegistrationReviewStatusEnum("status").default("PENDING_REVIEW").notNull(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("team_registration_reviews_team_id_unique").on(table.teamId),
    check(
      "team_registration_reviews_issue_counts_valid",
      sql`
        cardinality(${table.advisorIssueCodes}) <= ${sql.raw(String(MAX_ISSUE_CODES_PER_SUBJECT))} AND
        cardinality(${table.participant1IssueCodes}) <= ${sql.raw(String(MAX_ISSUE_CODES_PER_SUBJECT))} AND
        cardinality(${table.participant2IssueCodes}) <= ${sql.raw(String(MAX_ISSUE_CODES_PER_SUBJECT))} AND
        cardinality(${table.participant3IssueCodes}) <= ${sql.raw(String(MAX_ISSUE_CODES_PER_SUBJECT))}
      `,
    ),
    check(
      "team_registration_reviews_internal_notes_valid",
      sql`
        ${table.internalNotes} IS NULL OR
        (btrim(${table.internalNotes}) = ${table.internalNotes} AND
          length(${table.internalNotes}) BETWEEN 1 AND ${sql.raw(String(MAX_INTERNAL_NOTES_LENGTH))})
      `,
    ),
    check(
      "team_registration_reviews_status_issues_consistent",
      sql`
        ${table.status} = 'PENDING_REVIEW' OR
        (${table.status} = 'APPROVED' AND
          cardinality(${table.advisorIssueCodes}) = 0 AND
          cardinality(${table.participant1IssueCodes}) = 0 AND
          cardinality(${table.participant2IssueCodes}) = 0 AND
          cardinality(${table.participant3IssueCodes}) = 0) OR
        (${table.status} = 'CHANGES_REQUESTED' AND
          cardinality(${table.advisorIssueCodes}) +
          cardinality(${table.participant1IssueCodes}) +
          cardinality(${table.participant2IssueCodes}) +
          cardinality(${table.participant3IssueCodes}) > 0)
      `,
    ),
  ],
);

export const teamRegistrationReviewRelations = relations(teamRegistrationReviews, ({ one }) => ({
  reviewedBy: one(user, {
    fields: [teamRegistrationReviews.reviewedByUserId],
    references: [user.id],
  }),
  team: one(teams, {
    fields: [teamRegistrationReviews.teamId],
    references: [teams.id],
  }),
}));

export type TeamRegistrationReview = typeof teamRegistrationReviews.$inferSelect;
export type NewTeamRegistrationReview = typeof teamRegistrationReviews.$inferInsert;
