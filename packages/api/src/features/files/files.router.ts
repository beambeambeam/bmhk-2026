import type { ProtectedProcedure } from "../../core/procedure";
import {
  fileIdSchema,
  fileMetadataSchema,
  fileWithUrlSchema,
  uploadFileSchema,
} from "./files.schema";
import { assertAllowedOrigin } from "./files.service";
import type { FileService } from "./files.service";

export function createFilesRouter(protectedProcedure: ProtectedProcedure, service: FileService) {
  return {
    get: protectedProcedure
      .route({
        method: "GET",
        tags: ["File"],
      })
      .input(fileIdSchema)
      .output(fileWithUrlSchema)
      .handler(async ({ context, input }) => {
        const file = await service.get(context.session.user.id, input.id);

        context.log.set({ file: { id: file.id } });
        return file;
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
        const file = await service.upload({
          file: input.file,
          log: context.log,
          userId: context.session.user.id,
        });

        context.log.set({
          file: {
            contentType: file.contentType,
            id: file.id,
            sizeBytes: file.sizeBytes,
          },
        });

        return file;
      }),
  };
}
