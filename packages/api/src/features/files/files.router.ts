import { env } from "@bmhk-2026/env/server";
import { deleteObject, putObject } from "@bmhk-2026/s3";

import type { ProtectedProcedure } from "../../core/procedure";
import {
  createFileMetadataSaveError,
  createFileNotFoundError,
  createFileOriginNotAllowedError,
  createFileStorageUnavailableError,
} from "./files.errors";
import type { FileRepository } from "./files.repository";
import { toPublicFileWithUrl } from "./files.read";
import {
  fileIdSchema,
  fileMetadataSchema,
  fileWithUrlSchema,
  uploadFileSchema,
} from "./files.schemas";
import { validateUploadedFile } from "./files.validation";

function toPublicFile(file: Awaited<ReturnType<FileRepository["create"]>>) {
  return {
    contentType: file.contentType,
    id: file.id,
    originalName: file.originalName,
    sizeBytes: file.sizeBytes,
    uploadedAt: file.uploadedAt,
  };
}

function assertAllowedOrigin(headers: Headers): void {
  const origin = headers.get("origin");
  if (origin !== null && origin.length > 0 && !env.CORS_ORIGIN.includes(origin)) {
    throw createFileOriginNotAllowedError();
  }
}

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

        try {
          await putObject({
            body: validated.body,
            bucket,
            contentType: validated.contentType,
            key: objectKey,
            originalName: validated.originalName,
          });
        } catch (error) {
          throw createFileStorageUnavailableError(error);
        }

        let file: Awaited<ReturnType<FileRepository["create"]>>;
        try {
          file = await repository.create({
            bucket,
            contentType: validated.contentType,
            id,
            objectKey,
            originalName: validated.originalName,
            sizeBytes: validated.body.byteLength,
            uploadedBy: context.session.user.id,
          });
        } catch (error) {
          try {
            await deleteObject({ bucket, key: objectKey });
          } catch (cleanupError) {
            context.log.set({
              event: "file.upload.rollback_failed",
              file: { bucket, id, objectKey },
            });
            context.log.error(
              cleanupError instanceof Error ? cleanupError : new Error("Unknown cleanup error"),
            );
          }

          throw createFileMetadataSaveError(error);
        }

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
