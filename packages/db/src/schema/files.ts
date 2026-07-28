import { sql } from "drizzle-orm";
import { bigint, check, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const files = pgTable(
  "files",
  {
    bucket: text("bucket").notNull(),
    contentType: text("content_type").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    objectKey: text("object_key").notNull(),
    originalName: text("original_name").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
    uploadedBy: text("uploaded_by").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    unique("files_bucket_object_key_unique").on(table.bucket, table.objectKey),
    index("files_uploaded_by_uploaded_at_idx").on(table.uploadedBy, table.uploadedAt),
    check("files_bucket_nonempty", sql`length(trim(${table.bucket})) > 0`),
    check("files_object_key_nonempty", sql`length(trim(${table.objectKey})) > 0`),
    check("files_original_name_nonempty", sql`length(trim(${table.originalName})) > 0`),
    check("files_content_type_nonempty", sql`length(trim(${table.contentType})) > 0`),
    check("files_size_bytes_nonnegative", sql`${table.sizeBytes} >= 0`),
  ],
);
