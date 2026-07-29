import { files } from "@bmhk-2026/db/schema/files";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { createError } from "evlog";
import { z } from "zod";

export const allowedFileContentTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const fileContentTypeSchema = z.enum(allowedFileContentTypes);

const fileFieldRefinements = {
  contentType: () => fileContentTypeSchema,
  sizeBytes: (schema: z.ZodNumber) => schema.int().nonnegative(),
};

export const fileSchema = createSelectSchema(files, fileFieldRefinements).strict();
const fileInsertSchema = createInsertSchema(files, fileFieldRefinements);

export const createStoredFileDataSchema = fileInsertSchema
  .pick({
    bucket: true,
    contentType: true,
    id: true,
    objectKey: true,
    originalName: true,
    sizeBytes: true,
    uploadedBy: true,
  })
  .extend({ id: z.uuid(), uploadedBy: z.string() })
  .strict();

export const uploadFileSchema = z.object({ file: z.file() }).strict();
export const fileIdSchema = fileSchema.pick({ id: true }).strict();
export const fileMetadataSchema = fileSchema
  .pick({ contentType: true, id: true, originalName: true, sizeBytes: true, uploadedAt: true })
  .strict();
export const fileWithUrlSchema = fileMetadataSchema.extend({ url: z.url() }).strict();

export type AllowedFileContentType = z.output<typeof fileContentTypeSchema>;
export type StoredFile = z.output<typeof fileSchema>;
export type CreateStoredFileData = z.output<typeof createStoredFileDataSchema>;
export type PublicFile = z.output<typeof fileMetadataSchema>;
export type PublicFileWithUrl = z.output<typeof fileWithUrlSchema>;

export function toStoredFile(file: typeof files.$inferSelect): StoredFile {
  const contentType = allowedFileContentTypes.find((value) => value === file.contentType);
  if (!contentType) {
    throw createError({
      code: "FILE_SCHEMA_INVALID",
      fix: "Contact support",
      message: `Unsupported stored file content type: ${file.contentType}`,
      status: 500,
      why: "Stored file content type is not supported by the API",
    });
  }
  return { ...file, contentType };
}
