import { env } from "@bmhk-2026/env/server";
import { putObject } from "@bmhk-2026/s3";
import { z } from "zod";
import type { ProtectedProcedure } from "../../core/procedure";
import {
  createFileOriginNotAllowedError,
  createFileStorageUnavailableError,
} from "../files/files.errors";
import { toPublicFileWithUrl } from "../files/files.read";
import { validateUploadedImage } from "../files/files.validation";
import type { CreateStoredFileData } from "../files/files.types";
import { createTeamAlreadyExistsError, createTeamNotFoundError } from "./teams.errors";
import { createTeamListPagination } from "./teams.pagination";
import type { TeamRepository } from "./teams.repository";
import {
  createTeamSchema,
  deleteTeamResultSchema,
  listTeamsSchema,
  teamDetailsSchema,
  teamIdInputSchema,
  teamListResultSchema,
  teamSchema,
  updateTeamSchema,
} from "./teams.schemas";

const imageSchema = teamIdInputSchema.extend({ file: z.file() }).strict();

function assertAllowedOrigin(headers: Headers): void {
  const origin = headers.get("origin");
  if (origin !== null && origin.length > 0 && !env.CORS_ORIGIN.includes(origin)) {
    throw createFileOriginNotAllowedError();
  }
}

export function createTeamsRouter(
  protectedProcedure: ProtectedProcedure,
  repository: TeamRepository,
) {
  return {
    create: protectedProcedure
      .route({
        method: "POST",
        tags: ["Team"],
      })
      .input(createTeamSchema)
      .output(teamSchema)
      .handler(async ({ context, input }) => {
        const existingTeam = await repository.findByUserId(context.session.user.id);
        if (existingTeam) {
          throw createTeamAlreadyExistsError();
        }

        const team = await repository.create(context.session.user.id, input);
        context.log.set({ team: { id: team.id } });
        return team;
      }),
    delete: protectedProcedure
      .route({
        method: "DELETE",
        tags: ["Team"],
      })
      .input(teamIdInputSchema)
      .output(deleteTeamResultSchema)
      .handler(async ({ context, input }) => {
        const deleted = await repository.delete(context.session.user.id, input.id);
        if (!deleted) {
          throw createTeamNotFoundError();
        }

        context.log.set({ team: { id: input.id } });
        return { id: input.id };
      }),
    get: protectedProcedure
      .route({
        method: "GET",
        tags: ["Team"],
      })
      .input(teamIdInputSchema)
      .output(teamDetailsSchema)
      .handler(async ({ context, input }) => {
        const team = await repository.findById(context.session.user.id, input.id);
        if (!team) {
          throw createTeamNotFoundError();
        }

        const publicImage = team.image === null ? null : await toPublicFileWithUrl(team.image);
        context.log.set({ team: { id: team.id } });
        return {
          ...team,
          image: publicImage,
        };
      }),
    image: protectedProcedure
      .route({ method: "POST", tags: ["Team", "File"] })
      .input(imageSchema)
      .output(teamSchema)
      .handler(async ({ context, input }) => {
        assertAllowedOrigin(context.headers);
        const existing = await repository.findById(context.session.user.id, input.id);

        if (!existing) {
          throw createTeamNotFoundError();
        }

        const validated = await validateUploadedImage(input.file);
        const id = crypto.randomUUID();
        const bucket = env.AWS_S3_BUCKET;
        const objectKey = `teams/${input.id}/images/${id}`;

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

        const file: CreateStoredFileData = {
          bucket,
          contentType: validated.contentType,
          id,
          objectKey,
          originalName: validated.originalName,
          sizeBytes: validated.body.byteLength,
          uploadedBy: context.session.user.id,
        };

        const result = await repository.replaceImage(context.session.user.id, input.id, file);

        if (result === null) {
          throw createTeamNotFoundError();
        }

        context.log.set({
          file: { contentType: file.contentType, id, sizeBytes: file.sizeBytes },
          team: { id: input.id },
        });

        return result.team;
      }),
    list: protectedProcedure
      .route({
        method: "GET",
        tags: ["Team"],
      })
      .input(listTeamsSchema)
      .output(teamListResultSchema)
      .handler(async ({ context, input }) => {
        const result = await repository.list(context.session.user.id, input);
        return {
          data: result.data,
          pagination: createTeamListPagination({
            limit: input.limit,
            offset: input.offset,
            total: result.total,
          }),
        };
      }),
    update: protectedProcedure
      .route({
        method: "PATCH",
        tags: ["Team"],
      })
      .input(updateTeamSchema)
      .output(teamSchema)
      .handler(async ({ context, input }) => {
        const team = await repository.update(context.session.user.id, input.id, input.data);
        if (!team) {
          throw createTeamNotFoundError();
        }

        context.log.set({ team: { id: team.id } });
        return team;
      }),
  };
}
