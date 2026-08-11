import type { TeamAccessProcedure } from "../../core/procedure";
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
  teamAccessProcedure: TeamAccessProcedure,
  service: TeamAdvisorService,
  documentType: TeamAdvisorDocumentType,
) {
  return teamAccessProcedure
    .route({ method: "POST", tags: ["Team Advisor", "File"] })
    .input(teamAdvisorDocumentUploadSchema)
    .output(teamAdvisorSchema)
    .handler(async ({ context, input }) => {
      assertAllowedOrigin(context.headers);
      const { advisor, file } = await service.uploadDocument({
        access: context.teamAccess,
        documentType,
        file: input.file,
        log: context.log,
        teamId: input.teamId,
      });

      context.log.set({
        file: { contentType: file.contentType, id: file.id, sizeBytes: file.sizeBytes },
        teamAdvisor: { id: advisor.id, teamId: advisor.teamId },
      });
      return advisor;
    });
}

export function createTeamAdvisorsRouter(
  teamAccessProcedure: TeamAccessProcedure,
  service: TeamAdvisorService,
) {
  return {
    create: teamAccessProcedure
      .route({
        method: "POST",
        tags: ["Team Advisor"],
      })
      .input(createTeamAdvisorSchema)
      .output(teamAdvisorSchema)
      .handler(async ({ context, input }) => {
        const advisor = await service.create(context.teamAccess, input);

        context.log.set({ teamAdvisor: { id: advisor.id, teamId: advisor.teamId } });
        return advisor;
      }),
    get: teamAccessProcedure
      .route({
        method: "GET",
        tags: ["Team Advisor"],
      })
      .input(teamIdInputSchema)
      .output(teamAdvisorDetailsSchema)
      .handler(async ({ context, input }) => {
        const advisor = await service.get(context.teamAccess, input.teamId);

        context.log.set({ teamAdvisor: { id: advisor.id, teamId: advisor.teamId } });
        return advisor;
      }),
    identityDocument: createTeamAdvisorDocumentUploadProcedure(
      teamAccessProcedure,
      service,
      "identity",
    ),
    teacherStatusDocument: createTeamAdvisorDocumentUploadProcedure(
      teamAccessProcedure,
      service,
      "teacherStatus",
    ),
    update: teamAccessProcedure
      .route({
        method: "PATCH",
        tags: ["Team Advisor"],
      })
      .input(updateTeamAdvisorSchema)
      .output(teamAdvisorSchema)
      .handler(async ({ context, input }) => {
        const advisor = await service.update(context.teamAccess, input.teamId, input.data);

        context.log.set({ teamAdvisor: { id: advisor.id, teamId: advisor.teamId } });
        return advisor;
      }),
  };
}
