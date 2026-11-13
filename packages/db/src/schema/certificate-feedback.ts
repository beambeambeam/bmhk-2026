import { relations, sql } from "drizzle-orm";
import {
  check,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { SQLWrapper } from "drizzle-orm";

import { user } from "./auth";
import { teams } from "./teams";

// How the team heard about the event. OTHER needs `channel_other`.
export const certificateFeedbackChannelValues = [
  "WEBSITE",
  "FACEBOOK",
  "INSTAGRAM",
  "TIKTOK",
  "LINE",
  "CAMPHUB",
  "CONTESTER_LIFE",
  "TEACHER",
  "SENIOR",
  "FRIEND",
  "FAMILY",
  "OTHER",
] as const;
export const certificateFeedbackChannelEnum = pgEnum(
  "certificate_feedback_channel",
  certificateFeedbackChannelValues,
);

export const CERTIFICATE_FEEDBACK_CHOICE_MAX_LENGTH = 200;
export const CERTIFICATE_FEEDBACK_COMMENT_MAX_LENGTH = 2000;

function ratingCheck(column: SQLWrapper) {
  return sql`${column} BETWEEN 1 AND 5`;
}

function optionalTextCheck(column: SQLWrapper, maxLength: number) {
  return sql`${column} IS NULL OR (btrim(${column}) = ${column} AND length(${column}) BETWEEN 1 AND ${sql.raw(String(maxLength))})`;
}

/**
 * The questionnaire a team answers once before it can download certificates. Ratings are
 * 1 (least) to 5 (most). A null faculty or university means "ยังไม่ตัดสินใจ".
 */
export const certificateFeedback = pgTable(
  "certificate_feedback",
  {
    admissionQuotaRating: smallint("admission_quota_rating").notNull(),
    campRating: smallint("camp_rating").notNull(),
    campusEnvironmentRating: smallint("campus_environment_rating").notNull(),
    channelOther: text("channel_other"),
    channels: certificateFeedbackChannelEnum("channels").array().notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    educationGuidanceRating: smallint("education_guidance_rating").notNull(),
    eventScheduleRating: smallint("event_schedule_rating").notNull(),
    eventUsefulnessRating: smallint("event_usefulness_rating").notNull(),
    familyAdviceRating: smallint("family_advice_rating").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    intendedFaculty: text("intended_faculty"),
    intendedUniversity: text("intended_university"),
    internationalOpportunityRating: smallint("international_opportunity_rating").notNull(),
    jobMarketRating: smallint("job_market_rating").notNull(),
    modernEquipmentRating: smallint("modern_equipment_rating").notNull(),
    openHouseRating: smallint("open_house_rating").notNull(),
    overallSatisfactionRating: smallint("overall_satisfaction_rating").notNull(),
    publicityRating: smallint("publicity_rating").notNull(),
    reputationRating: smallint("reputation_rating").notNull(),
    scholarshipRating: smallint("scholarship_rating").notNull(),
    seniorAdviceRating: smallint("senior_advice_rating").notNull(),
    submittedBy: text("submitted_by").references(() => user.id, { onDelete: "set null" }),
    teacherAdviceRating: smallint("teacher_advice_rating").notNull(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    websiteDesignRating: smallint("website_design_rating").notNull(),
    websiteUsabilityRating: smallint("website_usability_rating").notNull(),
  },
  (table) => [
    unique("certificate_feedback_team_id_unique").on(table.teamId),
    check(
      "certificate_feedback_ratings_valid",
      sql.join(
        [
          table.admissionQuotaRating,
          table.campRating,
          table.campusEnvironmentRating,
          table.educationGuidanceRating,
          table.eventScheduleRating,
          table.eventUsefulnessRating,
          table.familyAdviceRating,
          table.internationalOpportunityRating,
          table.jobMarketRating,
          table.modernEquipmentRating,
          table.openHouseRating,
          table.overallSatisfactionRating,
          table.publicityRating,
          table.reputationRating,
          table.scholarshipRating,
          table.seniorAdviceRating,
          table.teacherAdviceRating,
          table.websiteDesignRating,
          table.websiteUsabilityRating,
        ].map((column) => sql`(${ratingCheck(column)})`),
        sql` AND `,
      ),
    ),
    check("certificate_feedback_channels_nonempty", sql`cardinality(${table.channels}) > 0`),
    check(
      "certificate_feedback_channel_other_when_other",
      sql`('OTHER' = ANY(${table.channels})) = (${table.channelOther} IS NOT NULL)`,
    ),
    check(
      "certificate_feedback_channel_other_valid",
      optionalTextCheck(table.channelOther, CERTIFICATE_FEEDBACK_CHOICE_MAX_LENGTH),
    ),
    check(
      "certificate_feedback_intended_faculty_valid",
      optionalTextCheck(table.intendedFaculty, CERTIFICATE_FEEDBACK_CHOICE_MAX_LENGTH),
    ),
    check(
      "certificate_feedback_intended_university_valid",
      optionalTextCheck(table.intendedUniversity, CERTIFICATE_FEEDBACK_CHOICE_MAX_LENGTH),
    ),
    check(
      "certificate_feedback_comment_valid",
      optionalTextCheck(table.comment, CERTIFICATE_FEEDBACK_COMMENT_MAX_LENGTH),
    ),
  ],
);

export const certificateFeedbackRelations = relations(certificateFeedback, ({ one }) => ({
  submitter: one(user, { fields: [certificateFeedback.submittedBy], references: [user.id] }),
  team: one(teams, { fields: [certificateFeedback.teamId], references: [teams.id] }),
}));

export type CertificateFeedbackRow = typeof certificateFeedback.$inferSelect;
