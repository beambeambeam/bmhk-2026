import { env } from "@bmhk-2026/env/server";
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
    throw new Error(`Unsupported stored file content type: ${file.contentType}`);
  }
  return { ...file, contentType };
}

export function createFileEmptyError() {
  return createError({
    code: "FILE_EMPTY",
    fix: "Choose a non-empty file and try again",
    message: "File is empty",
    status: 400,
    why: "Uploaded files must contain at least one byte",
  });
}

export function createFileNameInvalidError() {
  return createError({
    code: "FILE_NAME_INVALID",
    fix: "Use a filename between 1 and 255 characters",
    message: "File name is invalid",
    status: 400,
    why: "The normalized filename is empty or exceeds the allowed length",
  });
}

export function createFileTooLargeError() {
  return createError({
    code: "FILE_TOO_LARGE",
    fix: "Upload a file no larger than 10 MiB",
    message: "File is too large",
    status: 413,
    why: "The uploaded file exceeds the maximum size",
  });
}

export function createFileTypeNotAllowedError() {
  return createError({
    code: "FILE_TYPE_NOT_ALLOWED",
    fix: "Upload a PDF, PNG, JPEG, or WebP file",
    message: "File type is not allowed",
    status: 415,
    why: "The file signature does not match a supported file type",
  });
}

export function createFileOriginNotAllowedError() {
  return createError({
    code: "ORIGIN_NOT_ALLOWED",
    fix: "Use a configured application origin",
    message: "Request origin is not allowed",
    status: 403,
    why: "The upload request originated from an untrusted browser origin",
  });
}

export function createFileNotFoundError() {
  return createError({
    code: "FILE_NOT_FOUND",
    fix: "Check the file ID and try again",
    message: "File not found",
    status: 404,
    why: "No file owned by the current user matches this ID",
  });
}

export function createFileStorageUnavailableError(cause: unknown) {
  return createError({
    cause: cause instanceof Error ? cause : new Error("Unknown file storage error"),
    code: "FILE_STORAGE_UNAVAILABLE",
    fix: "Try again shortly",
    message: "File storage is temporarily unavailable",
    status: 503,
    why: "The file storage service could not complete the requested operation",
  });
}

export function createFileMetadataSaveError(cause: unknown) {
  return createError({
    cause: cause instanceof Error ? cause : new Error("Unknown file metadata error"),
    code: "FILE_METADATA_SAVE_FAILED",
    fix: "Try the upload again",
    message: "File metadata could not be saved",
    status: 500,
    why: "The file was stored but its database metadata could not be persisted",
  });
}

export function assertAllowedOrigin(headers: Headers): void {
  const origin = headers.get("origin");
  if (origin !== null && origin.length > 0 && !env.CORS_ORIGIN.includes(origin)) {
    throw createFileOriginNotAllowedError();
  }
}
