import type { z } from "zod";

import type { fileMetadataSchema } from "./files.schemas";

export const allowedFileContentTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedFileContentType = (typeof allowedFileContentTypes)[number];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export interface StoredFile {
  bucket: string;
  contentType: AllowedFileContentType;
  id: string;
  objectKey: string;
  originalName: string;
  sizeBytes: number;
  uploadedAt: Date;
  uploadedBy: string | null;
}

export interface CreateStoredFileData {
  bucket: string;
  contentType: AllowedFileContentType;
  id: string;
  objectKey: string;
  originalName: string;
  sizeBytes: number;
  uploadedBy: string;
}

export type PublicFile = z.output<typeof fileMetadataSchema>;
