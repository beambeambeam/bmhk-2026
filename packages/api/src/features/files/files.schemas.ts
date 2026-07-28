import { files } from "@bmhk-2026/db/schema/files";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { allowedFileContentTypes } from "./files.types";

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
  .extend({
    id: z.uuid(),
    uploadedBy: z.string(),
  })
  .strict();

export const uploadFileSchema = z.object({ file: z.file() }).strict();

export const fileIdSchema = fileSchema.pick({ id: true }).strict();

export const fileMetadataSchema = fileSchema
  .pick({
    contentType: true,
    id: true,
    originalName: true,
    sizeBytes: true,
    uploadedAt: true,
  })
  .strict();

export const fileReadUrlSchema = z.object({ url: z.url() }).strict();
