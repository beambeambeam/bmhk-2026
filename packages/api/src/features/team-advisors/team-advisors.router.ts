import type { ProtectedProcedure } from "../../core/procedure";
import { assertAllowedOrigin } from "../files/files.service";
import type { TeamAdvisorService } from "./team-advisors.service";
import {
  createTeamAdvisorSchema,
  teamAdvisorDetailsSchema,
  teamAdvisorDocumentUploadSchema,
  teamAdvisorSchema,
  teamIdInputSchema,
  updateTeamAdvisorSchema,
} from "./team-advisors.schema";
import type { TeamAdvisorDocumentType } from "./team-advisors.schema";

function createTeamAdvisorDocumentUploadProcedure(
  protectedProcedure: ProtectedProcedure,
  service: TeamAdvisorService,
  documentType: TeamAdvisorDocumentType,
) {
  return protectedProcedure
    .route({ method: "POST", tags: ["Team Advisor", "File"] })
    .input(teamAdvisorDocumentUploadSchema)
    .output(teamAdvisorSchema)
    .handler(async ({ context, input }) => {
      assertAllowedOrigin(context.headers);
      const { advisor, file } = await service.uploadDocument({
        documentType,
        file: input.file,
        log: context.log,
        teamId: input.teamId,
        userId: context.session.user.id,
      });

      context.log.set({
        file: { contentType: file.contentType, id: file.id, sizeBytes: file.sizeBytes },
        teamAdvisor: { id: advisor.id, teamId: advisor.teamId },
      });
      return advisor;
    });
}

export function createTeamAdvisorsRouter(
  protectedProcedure: ProtectedProcedure,
  service: TeamAdvisorService,
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
        const advisor = await service.create(context.session.user.id, input);

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
        const advisor = await service.get(context.session.user.id, input.teamId);

        context.log.set({ teamAdvisor: { id: advisor.id, teamId: advisor.teamId } });
        return advisor;
      }),
    identityDocument: createTeamAdvisorDocumentUploadProcedure(
      protectedProcedure,
      service,
      "identity",
    ),
    teacherStatusDocument: createTeamAdvisorDocumentUploadProcedure(
      protectedProcedure,
      service,
      "teacherStatus",
    ),
    update: protectedProcedure
      .route({
        method: "PATCH",
        tags: ["Team Advisor"],
      })
      .input(updateTeamAdvisorSchema)
      .output(teamAdvisorSchema)
      .handler(async ({ context, input }) => {
        const advisor = await service.update(context.session.user.id, input.teamId, input.data);

        context.log.set({ teamAdvisor: { id: advisor.id, teamId: advisor.teamId } });
        return advisor;
      }),
  };
}
