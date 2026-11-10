import { relations, sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { certificateEligibleAwardValues, teamAwardEnum } from "./teams";

// Template folders inside the certificate zip, as written by packages/certificate.
export const certificateTemplateValues = [
  "first",
  "second",
  "third",
  "honorable-mention",
  "semi-final",
  "final",
  "participate",
  "appreciation",
] as const;
export const certificateTemplateEnum = pgEnum("certificate_template", certificateTemplateValues);

export const certificateRecipientRoleValues = ["PARTICIPANT", "ADVISOR"] as const;
export const certificateRecipientRoleEnum = pgEnum(
  "certificate_recipient_role",
  certificateRecipientRoleValues,
);

// UPLOADING sets are invisible to readers. Completing an upload makes it the only
// ACTIVE set in one transaction, so a failed upload never changes what readers see.
export const certificateSetStatusValues = ["UPLOADING", "ACTIVE"] as const;
export const certificateSetStatusEnum = pgEnum(
  "certificate_set_status",
  certificateSetStatusValues,
);

export const certificateSets = pgTable(
  "certificate_sets",
  {
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    certificateCount: integer("certificate_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    id: uuid("id").primaryKey(),
    sourceName: text("source_name").notNull(),
    sourceSizeBytes: bigint("source_size_bytes", { mode: "number" }).notNull(),
    status: certificateSetStatusEnum("status").notNull(),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [
    uniqueIndex("certificate_sets_single_active_idx")
      .on(table.status)
      .where(sql`${table.status} = 'ACTIVE'`),
    check("certificate_sets_source_name_nonempty", sql`length(trim(${table.sourceName})) > 0`),
    check("certificate_sets_certificate_count_positive", sql`${table.certificateCount} > 0`),
    check(
      "certificate_sets_activated_when_active",
      sql`(${table.status} = 'ACTIVE') = (${table.activatedAt} IS NOT NULL)`,
    ),
  ],
);

// One row per info.csv row. personId and teamId are snapshots without foreign keys:
// a certificate stays listed as extra after its person or team is removed.
export const certificates = pgTable(
  "certificates",
  {
    award: teamAwardEnum("award")
      .$type<(typeof certificateEligibleAwardValues)[number]>()
      .notNull(),
    bucket: text("bucket").notNull(),
    fullName: text("full_name").notNull(),
    fullNameEn: text("full_name_en").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    memberIndex: integer("member_index"),
    objectKey: text("object_key").notNull(),
    personId: uuid("person_id").notNull(),
    role: certificateRecipientRoleEnum("role").notNull(),
    setId: uuid("set_id")
      .notNull()
      .references(() => certificateSets.id, { onDelete: "cascade" }),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    storedAt: timestamp("stored_at", { withTimezone: true }),
    teamCode: text("team_code").notNull(),
    teamId: uuid("team_id").notNull(),
    teamName: text("team_name").notNull(),
    template: certificateTemplateEnum("template").notNull(),
    zipPath: text("zip_path").notNull(),
  },
  (table) => [
    unique("certificates_set_recipient_unique").on(
      table.setId,
      table.role,
      table.personId,
      table.teamId,
    ),
    unique("certificates_set_zip_path_unique").on(table.setId, table.zipPath),
    unique("certificates_bucket_object_key_unique").on(table.bucket, table.objectKey),
    index("certificates_person_team_role_idx").on(table.personId, table.teamId, table.role),
    check(
      "certificates_award_eligible",
      sql`${table.award} IN (${sql.join(
        certificateEligibleAwardValues.map((award) => sql.raw(`'${award}'`)),
        sql`, `,
      )})`,
    ),
    check(
      "certificates_stored_together",
      sql`(${table.storedAt} IS NULL) = (${table.sizeBytes} IS NULL)`,
    ),
    check(
      "certificates_size_bytes_positive",
      sql`${table.sizeBytes} IS NULL OR ${table.sizeBytes} > 0`,
    ),
  ],
);

export const certificateSetsRelations = relations(certificateSets, ({ many, one }) => ({
  certificates: many(certificates),
  uploader: one(user, { fields: [certificateSets.uploadedBy], references: [user.id] }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  set: one(certificateSets, { fields: [certificates.setId], references: [certificateSets.id] }),
}));

export type CertificateSetRow = typeof certificateSets.$inferSelect;
export type CertificateRow = typeof certificates.$inferSelect;
