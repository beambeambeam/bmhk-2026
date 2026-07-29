import { relations } from "drizzle-orm";
import { boolean, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { teams } from "./teams";

export const teamConsents = pgTable(
  "team_consents",
  {
    codernTermsAccepted: boolean("codern_terms_accepted").default(false).notNull(),
    competitionRulesAccepted: boolean("competition_rules_accepted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    guardianConsentObtained: boolean("guardian_consent_obtained").default(false).notNull(),
    healthDataConsent: boolean("health_data_consent").default(false).notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    privacyPolicyAccepted: boolean("privacy_policy_accepted").default(false).notNull(),
    publicityMediaConsent: boolean("publicity_media_consent").default(false).notNull(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [unique("team_consents_team_id_unique").on(table.teamId)],
);

export const teamConsentRelations = relations(teamConsents, ({ one }) => ({
  team: one(teams, {
    fields: [teamConsents.teamId],
    references: [teams.id],
  }),
}));

export type TeamConsent = typeof teamConsents.$inferSelect;
export type NewTeamConsent = typeof teamConsents.$inferInsert;
