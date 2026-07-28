import { env } from "@bmhk-2026/env/server";

import type { ProtectedProcedure } from "../../core";
import {
  assertAllowedOrigin,
  createFileNotFoundError,
  fileIdSchema,
  fileMetadataSchema,
  fileWithUrlSchema,
  uploadFileSchema,
} from "./files";
import type { FileRepository } from "./files.repository";
import {
  createStoredFileData,
  saveFileMetadata,
  toPublicFile,
  toPublicFileWithUrl,
  uploadValidatedFile,
  validateUploadedFile,
} from "./files.service";

export function createFilesRouter(
  protectedProcedure: ProtectedProcedure,
  repository: FileRepository,
) {
  return {
    get: protectedProcedure
      .route({
        method: "GET",
        tags: ["File"],
      })
      .input(fileIdSchema)
      .output(fileWithUrlSchema)
      .handler(async ({ context, input }) => {
        const file = await repository.findById(context.session.user.id, input.id);
        if (!file) {
          throw createFileNotFoundError();
        }

        const publicFile = await toPublicFileWithUrl(file);
        context.log.set({ file: { id: file.id } });
        return publicFile;
      }),
    upload: protectedProcedure
      .route({
        method: "POST",
        tags: ["File"],
      })
      .input(uploadFileSchema)
      .output(fileMetadataSchema)
      .handler(async ({ context, input }) => {
        assertAllowedOrigin(context.headers);

        const validated = await validateUploadedFile(input.file);
        const id = crypto.randomUUID();
        const objectKey = `files/${id}`;
        const bucket = env.AWS_S3_BUCKET;

        await uploadValidatedFile({ bucket, file: validated, objectKey });
        const file = await saveFileMetadata({
          context,
          create: repository.create,
          data: createStoredFileData({
            bucket,
            file: validated,
            id,
            objectKey,
            uploadedBy: context.session.user.id,
          }),
        });

        context.log.set({
          file: {
            contentType: file.contentType,
            id: file.id,
            sizeBytes: file.sizeBytes,
          },
        });

        return toPublicFile(file);
      }),
  };
}
