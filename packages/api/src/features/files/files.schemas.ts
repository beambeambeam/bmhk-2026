import { z } from "zod";

import { allowedFileContentTypes } from "./files.types";

export const uploadFileSchema = z.object({ file: z.file() }).strict();

export const fileIdSchema = z.object({ id: z.uuid() }).strict();

export const fileMetadataSchema = z
  .object({
    contentType: z.enum(allowedFileContentTypes),
    id: z.uuid(),
    originalName: z.string(),
    sizeBytes: z.number().int().nonnegative(),
    uploadedAt: z.date(),
  })
  .strict();

export const fileReadUrlSchema = z.object({ url: z.url() }).strict();
