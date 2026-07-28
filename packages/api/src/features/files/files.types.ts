import type { z } from "zod";

import type {
  createStoredFileDataSchema,
  fileContentTypeSchema,
  fileMetadataSchema,
  fileWithUrlSchema,
  fileSchema,
} from "./files.schemas";

export const allowedFileContentTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedFileContentType = z.output<typeof fileContentTypeSchema>;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export type StoredFile = z.output<typeof fileSchema>;
export type CreateStoredFileData = z.output<typeof createStoredFileDataSchema>;
export type PublicFile = z.output<typeof fileMetadataSchema>;
export type PublicFileWithUrl = z.output<typeof fileWithUrlSchema>;
