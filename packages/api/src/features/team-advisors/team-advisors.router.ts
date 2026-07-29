import { env } from "@bmhk-2026/env/server";
import type { z } from "zod";

import type { ApiSession } from "../../core/auth";
import type { ApiContext } from "../../core/context";
import type { ProtectedProcedure } from "../../core/procedure";
import {
  assertAllowedOrigin,
  createStoredFileData,
  toPublicFileWithUrl,
  uploadValidatedFile,
  validateUploadedPdf,
} from "../files/files.service";
import type { TeamAdvisorRepository } from "./team-advisors.repository";
import {
  createTeamAdvisorNotFoundError,
  getTeamAdvisorDocumentPath,
} from "./team-advisors.service";
import type { TeamAdvisorDocumentType } from "./team-advisors.service";
import {
  createTeamAdvisorSchema,
  teamAdvisorDetailsSchema,
  teamAdvisorDocumentUploadSchema,
  teamAdvisorSchema,
  teamIdInputSchema,
  updateTeamAdvisorSchema,
} from "./team-advisors.schema";
import { createTeamNotFoundError } from "../teams/teams.service";

type DocumentUploadInput = z.output<typeof teamAdvisorDocumentUploadSchema>;
type ProtectedContext = ApiContext & { session: ApiSession };

async function uploadTeamAdvisorDocument({
  context,
  documentType,
  input,
  repository,
}: {
  context: ProtectedContext;
  documentType: TeamAdvisorDocumentType;
  input: DocumentUploadInput;
  repository: TeamAdvisorRepository;
}) {
  assertAllowedOrigin(context.headers);

  const advisor = await repository.findByTeamId(context.session.user.id, input.teamId);
  if (!advisor) {
    throw createTeamAdvisorNotFoundError();
  }

  const validated = await validateUploadedPdf(input.file);
  const id = crypto.randomUUID();
  const bucket = env.AWS_S3_BUCKET;
  const objectKey = `team-advisors/${advisor.id}/documents/${getTeamAdvisorDocumentPath(documentType)}/${id}`;
  await uploadValidatedFile({ bucket, file: validated, objectKey });

  const file = createStoredFileData({
    bucket,
    file: validated,
    id,
    objectKey,
    uploadedBy: context.session.user.id,
  });

  const updatedAdvisor = await repository.replaceDocument(
    context.session.user.id,
    input.teamId,
    documentType,
    file,
  );

  if (!updatedAdvisor) {
    throw createTeamAdvisorNotFoundError();
  }

  context.log.set({
    file: { contentType: file.contentType, id: file.id, sizeBytes: file.sizeBytes },
    teamAdvisor: { id: updatedAdvisor.id, teamId: updatedAdvisor.teamId },
  });
  return updatedAdvisor;
}

export function createTeamAdvisorsRouter(
  protectedProcedure: ProtectedProcedure,
  repository: TeamAdvisorRepository,
) {
  return {
    create: protectedProcedure
      .route({
        method: "POST",
        tags: ["Team Advisor"],
      })
      .input(createTeamAdvisorSchema)
      .output(teamAdvisorSchema)
      .handler(async ({ context, input }) => {
        const advisor = await repository.create(context.session.user.id, input);
        if (!advisor) {
          throw createTeamNotFoundError();
        }

        context.log.set({ teamAdvisor: { id: advisor.id, teamId: advisor.teamId } });
        return advisor;
      }),
    get: protectedProcedure
      .route({
        method: "GET",
        tags: ["Team Advisor"],
      })
      .input(teamIdInputSchema)
      .output(teamAdvisorDetailsSchema)
      .handler(async ({ context, input }) => {
        const advisor = await repository.findByTeamId(context.session.user.id, input.teamId);
        if (!advisor) {
          throw createTeamAdvisorNotFoundError();
        }

        const [identityDocument, teacherStatusDocument] = await Promise.all([
          advisor.identityDocument ? toPublicFileWithUrl(advisor.identityDocument) : null,
          advisor.teacherStatusDocument ? toPublicFileWithUrl(advisor.teacherStatusDocument) : null,
        ]);
        const {
          identityDocument: _identityDocument,
          identityDocumentFileId: _identityDocumentFileId,
          teacherStatusDocument: _teacherStatusDocument,
          teacherStatusDocumentFileId: _teacherStatusDocumentFileId,
          ...advisorFields
        } = advisor;

        context.log.set({ teamAdvisor: { id: advisor.id, teamId: advisor.teamId } });
        return {
          ...advisorFields,
          identityDocument,
          teacherStatusDocument,
        };
      }),
    identityDocument: protectedProcedure
      .route({
        method: "POST",
        tags: ["Team Advisor", "File"],
      })
      .input(teamAdvisorDocumentUploadSchema)
      .output(teamAdvisorSchema)
      .handler(
        async ({ context, input }) =>
          await uploadTeamAdvisorDocument({
            context,
            documentType: "identity",
            input,
            repository,
          }),
      ),
    teacherStatusDocument: protectedProcedure
      .route({
        method: "POST",
        tags: ["Team Advisor", "File"],
      })
      .input(teamAdvisorDocumentUploadSchema)
      .output(teamAdvisorSchema)
      .handler(
        async ({ context, input }) =>
          await uploadTeamAdvisorDocument({
            context,
            documentType: "teacherStatus",
            input,
            repository,
          }),
      ),
    update: protectedProcedure
      .route({
        method: "PATCH",
        tags: ["Team Advisor"],
      })
      .input(updateTeamAdvisorSchema)
      .output(teamAdvisorSchema)
      .handler(async ({ context, input }) => {
        const advisor = await repository.update(context.session.user.id, input.teamId, input.data);
        if (!advisor) {
          throw createTeamAdvisorNotFoundError();
        }

        context.log.set({ teamAdvisor: { id: advisor.id, teamId: advisor.teamId } });
        return advisor;
      }),
  };
}
