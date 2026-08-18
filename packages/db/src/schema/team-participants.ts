import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { SQLWrapper } from "drizzle-orm";

import { files } from "./files";
import { teams } from "./teams";

function requiredTextCheck(column: SQLWrapper, maxLength: number) {
  return sql`btrim(${column}) = ${column} AND length(${column}) BETWEEN 1 AND ${sql.raw(String(maxLength))}`;
}

function optionalTextCheck(column: SQLWrapper, maxLength: number) {
  return sql`${column} IS NULL OR (btrim(${column}) = ${column} AND length(${column}) BETWEEN 1 AND ${sql.raw(String(maxLength))})`;
}

export const teamParticipants = pgTable(
  "team_participants",
  {
    academicRecordDocumentFileId: uuid("academic_record_document_file_id").references(
      () => files.id,
      { onDelete: "restrict" },
    ),
    chronicConditionsAndFirstAidNotes: text("chronic_conditions_and_first_aid_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
    dietaryRequirements: text("dietary_requirements"),
    drugAllergies: text("drug_allergies"),
    email: text("email").notNull(),
    firstNameEn: text("first_name_en").notNull(),
    firstNameTh: text("first_name_th").notNull(),
    foodAllergies: text("food_allergies"),
    id: uuid("id").defaultRandom().primaryKey(),
    identityDocumentFileId: uuid("identity_document_file_id").references(() => files.id, {
      onDelete: "restrict",
    }),
    index: integer("index").notNull(),
    lastNameEn: text("last_name_en").notNull(),
    lastNameTh: text("last_name_th").notNull(),
    lineId: text("line_id"),
    middleNameEn: text("middle_name_en"),
    middleNameTh: text("middle_name_th"),
    nicknameEn: text("nickname_en").notNull(),
    nicknameTh: text("nickname_th").notNull(),
    phone: text("phone").notNull(),
    portraitPhotoFileId: uuid("portrait_photo_file_id").references(() => files.id, {
      onDelete: "restrict",
    }),
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
    unique("team_participants_team_id_index_unique").on(table.teamId, table.index),
    index("team_participants_academic_record_document_file_id_idx").on(
      table.academicRecordDocumentFileId,
    ),
    index("team_participants_identity_document_file_id_idx").on(table.identityDocumentFileId),
    index("team_participants_portrait_photo_file_id_idx").on(table.portraitPhotoFileId),
    check(
      "team_participants_document_files_distinct",
      sql`
        ${table.portraitPhotoFileId} IS NULL OR ${table.identityDocumentFileId} IS NULL OR
        ${table.portraitPhotoFileId} <> ${table.identityDocumentFileId}
      `,
    ),
    check(
      "team_participants_identity_academic_files_distinct",
      sql`
        ${table.identityDocumentFileId} IS NULL OR ${table.academicRecordDocumentFileId} IS NULL OR
        ${table.identityDocumentFileId} <> ${table.academicRecordDocumentFileId}
      `,
    ),
    check(
      "team_participants_portrait_academic_files_distinct",
      sql`
        ${table.portraitPhotoFileId} IS NULL OR ${table.academicRecordDocumentFileId} IS NULL OR
        ${table.portraitPhotoFileId} <> ${table.academicRecordDocumentFileId}
      `,
    ),
    check("team_participants_index_valid", sql`${table.index} BETWEEN 1 AND 3`),
    check("team_participants_date_of_birth_valid", sql`${table.dateOfBirth} <= CURRENT_DATE`),
    check("team_participants_title_th_valid", requiredTextCheck(table.titleTh, 50)),
    check("team_participants_first_name_th_valid", requiredTextCheck(table.firstNameTh, 100)),
    check("team_participants_middle_name_th_valid", optionalTextCheck(table.middleNameTh, 100)),
    check("team_participants_last_name_th_valid", requiredTextCheck(table.lastNameTh, 100)),
    check("team_participants_title_en_valid", requiredTextCheck(table.titleEn, 50)),
    check("team_participants_first_name_en_valid", requiredTextCheck(table.firstNameEn, 100)),
    check("team_participants_middle_name_en_valid", optionalTextCheck(table.middleNameEn, 100)),
    check("team_participants_last_name_en_valid", requiredTextCheck(table.lastNameEn, 100)),
    check("team_participants_nickname_en_valid", requiredTextCheck(table.nicknameEn, 100)),
    check("team_participants_nickname_th_valid", requiredTextCheck(table.nicknameTh, 100)),
    check("team_participants_food_allergies_valid", optionalTextCheck(table.foodAllergies, 1000)),
    check(
      "team_participants_dietary_requirements_valid",
      optionalTextCheck(table.dietaryRequirements, 1000),
    ),
    check("team_participants_drug_allergies_valid", optionalTextCheck(table.drugAllergies, 1000)),
    check(
      "team_participants_chronic_conditions_and_first_aid_notes_valid",
      optionalTextCheck(table.chronicConditionsAndFirstAidNotes, 2000),
    ),
    check("team_participants_email_valid", requiredTextCheck(table.email, 254)),
    check("team_participants_phone_valid", requiredTextCheck(table.phone, 32)),
    check("team_participants_line_id_valid", optionalTextCheck(table.lineId, 100)),
  ],
);

export const teamParticipantRelations = relations(teamParticipants, ({ one }) => ({
  academicRecordDocument: one(files, {
    fields: [teamParticipants.academicRecordDocumentFileId],
    references: [files.id],
    relationName: "teamParticipantAcademicRecordDocument",
  }),
  identityDocument: one(files, {
    fields: [teamParticipants.identityDocumentFileId],
    references: [files.id],
    relationName: "teamParticipantIdentityDocument",
  }),
  portraitPhoto: one(files, {
    fields: [teamParticipants.portraitPhotoFileId],
    references: [files.id],
    relationName: "teamParticipantPortraitPhoto",
  }),
  team: one(teams, {
    fields: [teamParticipants.teamId],
    references: [teams.id],
  }),
}));

export type TeamParticipant = typeof teamParticipants.$inferSelect;
export type NewTeamParticipant = typeof teamParticipants.$inferInsert;
