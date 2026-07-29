import { relations, sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import type { SQLWrapper } from "drizzle-orm";

import { files } from "./files";
import { teams } from "./teams";

function requiredTextCheck(column: SQLWrapper, maxLength: number) {
  return sql`btrim(${column}) = ${column} AND length(${column}) BETWEEN 1 AND ${maxLength}`;
}

function optionalTextCheck(column: SQLWrapper, maxLength: number) {
  return sql`${column} IS NULL OR (btrim(${column}) = ${column} AND length(${column}) BETWEEN 1 AND ${maxLength})`;
}

export const teamAdvisors = pgTable(
  "team_advisors",
  {
    chronicConditionsAndFirstAidNotes: text("chronic_conditions_and_first_aid_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    dietaryRequirements: text("dietary_requirements"),
    drugAllergies: text("drug_allergies"),
    email: text("email").notNull(),
    firstNameEn: text("first_name_en").notNull(),
    firstNameTh: text("first_name_th").notNull(),
    foodAllergies: text("food_allergies"),
    id: uuid("id").defaultRandom().primaryKey(),
    identityDocumentFileId: uuid("identity_document_file_id")
      .notNull()
      .references(() => files.id, { onDelete: "restrict" }),
    lastNameEn: text("last_name_en").notNull(),
    lastNameTh: text("last_name_th").notNull(),
    lineId: text("line_id"),
    middleNameEn: text("middle_name_en"),
    middleNameTh: text("middle_name_th"),
    phone: text("phone").notNull(),
    teacherStatusDocumentFileId: uuid("teacher_status_document_file_id")
      .notNull()
      .references(() => files.id, { onDelete: "restrict" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    titleEn: text("title_en").notNull(),
    titleTh: text("title_th").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("team_advisors_team_id_unique").on(table.teamId),
    index("team_advisors_identity_document_file_id_idx").on(table.identityDocumentFileId),
    index("team_advisors_teacher_status_document_file_id_idx").on(
      table.teacherStatusDocumentFileId,
    ),
    check(
      "team_advisors_document_files_distinct",
      sql`${table.identityDocumentFileId} <> ${table.teacherStatusDocumentFileId}`,
    ),
    check("team_advisors_title_th_valid", requiredTextCheck(table.titleTh, 50)),
    check("team_advisors_first_name_th_valid", requiredTextCheck(table.firstNameTh, 100)),
    check("team_advisors_middle_name_th_valid", optionalTextCheck(table.middleNameTh, 100)),
    check("team_advisors_last_name_th_valid", requiredTextCheck(table.lastNameTh, 100)),
    check("team_advisors_title_en_valid", requiredTextCheck(table.titleEn, 50)),
    check("team_advisors_first_name_en_valid", requiredTextCheck(table.firstNameEn, 100)),
    check("team_advisors_middle_name_en_valid", optionalTextCheck(table.middleNameEn, 100)),
    check("team_advisors_last_name_en_valid", requiredTextCheck(table.lastNameEn, 100)),
    check("team_advisors_food_allergies_valid", optionalTextCheck(table.foodAllergies, 1000)),
    check(
      "team_advisors_dietary_requirements_valid",
      optionalTextCheck(table.dietaryRequirements, 1000),
    ),
    check("team_advisors_drug_allergies_valid", optionalTextCheck(table.drugAllergies, 1000)),
    check(
      "team_advisors_chronic_conditions_and_first_aid_notes_valid",
      optionalTextCheck(table.chronicConditionsAndFirstAidNotes, 2000),
    ),
    check("team_advisors_email_valid", requiredTextCheck(table.email, 254)),
    check("team_advisors_phone_valid", requiredTextCheck(table.phone, 32)),
    check("team_advisors_line_id_valid", optionalTextCheck(table.lineId, 100)),
  ],
);

export const teamAdvisorRelations = relations(teamAdvisors, ({ one }) => ({
  identityDocument: one(files, {
    fields: [teamAdvisors.identityDocumentFileId],
    references: [files.id],
    relationName: "teamAdvisorIdentityDocument",
  }),
  teacherStatusDocument: one(files, {
    fields: [teamAdvisors.teacherStatusDocumentFileId],
    references: [files.id],
    relationName: "teamAdvisorTeacherStatusDocument",
  }),
  team: one(teams, {
    fields: [teamAdvisors.teamId],
    references: [teams.id],
  }),
}));

export type TeamAdvisor = typeof teamAdvisors.$inferSelect;
export type NewTeamAdvisor = typeof teamAdvisors.$inferInsert;
