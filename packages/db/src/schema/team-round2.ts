import { relations, sql } from "drizzle-orm";
import { check, index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { files } from "./files";
import { teams } from "./teams";

export const teamRound2 = pgTable(
  "team_round2",
  {
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    participant1IdentityDocumentFileId: uuid("participant1_identity_document_file_id").references(
      () => files.id,
      { onDelete: "restrict" },
    ),
    participant1StudentIdDocumentFileId: uuid(
      "participant1_student_id_document_file_id",
    ).references(() => files.id, { onDelete: "restrict" }),
    participant2IdentityDocumentFileId: uuid("participant2_identity_document_file_id").references(
      () => files.id,
      { onDelete: "restrict" },
    ),
    participant2StudentIdDocumentFileId: uuid(
      "participant2_student_id_document_file_id",
    ).references(() => files.id, { onDelete: "restrict" }),
    participant3IdentityDocumentFileId: uuid("participant3_identity_document_file_id").references(
      () => files.id,
      { onDelete: "restrict" },
    ),
    participant3StudentIdDocumentFileId: uuid(
      "participant3_student_id_document_file_id",
    ).references(() => files.id, { onDelete: "restrict" }),
    teamId: uuid("team_id")
      .primaryKey()
      .references(() => teams.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("team_round2_participant1_identity_document_file_id_idx").on(
      table.participant1IdentityDocumentFileId,
    ),
    index("team_round2_participant1_student_id_document_file_id_idx").on(
      table.participant1StudentIdDocumentFileId,
    ),
    index("team_round2_participant2_identity_document_file_id_idx").on(
      table.participant2IdentityDocumentFileId,
    ),
    index("team_round2_participant2_student_id_document_file_id_idx").on(
      table.participant2StudentIdDocumentFileId,
    ),
    index("team_round2_participant3_identity_document_file_id_idx").on(
      table.participant3IdentityDocumentFileId,
    ),
    index("team_round2_participant3_student_id_document_file_id_idx").on(
      table.participant3StudentIdDocumentFileId,
    ),
    check(
      "team_round2_participant1_files_distinct",
      sql`
        ${table.participant1IdentityDocumentFileId} IS NULL OR
        ${table.participant1StudentIdDocumentFileId} IS NULL OR
        ${table.participant1IdentityDocumentFileId} <> ${table.participant1StudentIdDocumentFileId}
      `,
    ),
    check(
      "team_round2_participant2_files_distinct",
      sql`
        ${table.participant2IdentityDocumentFileId} IS NULL OR
        ${table.participant2StudentIdDocumentFileId} IS NULL OR
        ${table.participant2IdentityDocumentFileId} <> ${table.participant2StudentIdDocumentFileId}
      `,
    ),
    check(
      "team_round2_participant3_files_distinct",
      sql`
        ${table.participant3IdentityDocumentFileId} IS NULL OR
        ${table.participant3StudentIdDocumentFileId} IS NULL OR
        ${table.participant3IdentityDocumentFileId} <> ${table.participant3StudentIdDocumentFileId}
      `,
    ),
  ],
);

export const teamRound2Relations = relations(teamRound2, ({ one }) => ({
  participant1IdentityDocument: one(files, {
    fields: [teamRound2.participant1IdentityDocumentFileId],
    references: [files.id],
    relationName: "teamRound2Participant1IdentityDocument",
  }),
  participant1StudentIdDocument: one(files, {
    fields: [teamRound2.participant1StudentIdDocumentFileId],
    references: [files.id],
    relationName: "teamRound2Participant1StudentIdDocument",
  }),
  participant2IdentityDocument: one(files, {
    fields: [teamRound2.participant2IdentityDocumentFileId],
    references: [files.id],
    relationName: "teamRound2Participant2IdentityDocument",
  }),
  participant2StudentIdDocument: one(files, {
    fields: [teamRound2.participant2StudentIdDocumentFileId],
    references: [files.id],
    relationName: "teamRound2Participant2StudentIdDocument",
  }),
  participant3IdentityDocument: one(files, {
    fields: [teamRound2.participant3IdentityDocumentFileId],
    references: [files.id],
    relationName: "teamRound2Participant3IdentityDocument",
  }),
  participant3StudentIdDocument: one(files, {
    fields: [teamRound2.participant3StudentIdDocumentFileId],
    references: [files.id],
    relationName: "teamRound2Participant3StudentIdDocument",
  }),
  team: one(teams, {
    fields: [teamRound2.teamId],
    references: [teams.id],
  }),
}));

export type TeamRound2 = typeof teamRound2.$inferSelect;
export type NewTeamRound2 = typeof teamRound2.$inferInsert;
