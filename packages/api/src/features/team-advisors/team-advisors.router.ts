import type { TeamAccessProcedure } from "../../core/procedure";
import {
  registrationDocumentReplacedAudit,
  registrationPersonCreatedAudit,
  registrationPersonUpdatedAudit,
} from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
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
      const auditDocumentType = documentType === "identity" ? "identity" : "teacher-status";
      const { advisor, file } = await executeAudited({
        audit: registrationDocumentReplacedAudit({
          actor: { id: context.teamAccess.actorId, type: "user" },
          target: {
            documentType: auditDocumentType,
            id: input.teamId,
            teamId: input.teamId,
            type: "registration-document",
          },
        }),
        deniedErrorCodes: ["TEAM_ADVISOR_NOT_FOUND"],
        execute: async () => {
          assertAllowedOrigin(context.headers);
          return await service.uploadDocument({
            access: context.teamAccess,
            documentType,
            file: input.file,
            log: context.log,
            teamId: input.teamId,
          });
        },
        log: context.log,
        onSuccess: (result) => ({
          changes: {
            after: { fileId: result.file.id },
            before: { fileId: result.previousFileId },
          },
        }),
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
        const advisor = await executeAudited({
          audit: registrationPersonCreatedAudit({
            actor: { id: context.teamAccess.actorId, type: "user" },
            target: {
              id: input.teamId,
              personType: "advisor",
              teamId: input.teamId,
              type: "registration-person",
            },
          }),
          deniedErrorCodes: ["TEAM_ADVISOR_ALREADY_EXISTS", "TEAM_NOT_FOUND"],
          execute: async () => await service.create(context.teamAccess, input),
          log: context.log,
          onSuccess: (created) => ({
            target: {
              id: created.id,
              personType: "advisor",
              teamId: created.teamId,
              type: "registration-person",
            },
          }),
        });

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
        const advisor = await executeAudited({
          audit: registrationPersonUpdatedAudit({
            actor: { id: context.teamAccess.actorId, type: "user" },
            changes: { after: { changedFields: Object.keys(input.data) } },
            target: {
              id: input.teamId,
              personType: "advisor",
              teamId: input.teamId,
              type: "registration-person",
            },
          }),
          deniedErrorCodes: ["TEAM_ADVISOR_NOT_FOUND"],
          execute: async () => await service.update(context.teamAccess, input.teamId, input.data),
          log: context.log,
          onSuccess: (updated) => ({
            target: {
              id: updated.id,
              personType: "advisor",
              teamId: updated.teamId,
              type: "registration-person",
            },
          }),
        });

        context.log.set({ teamAdvisor: { id: advisor.id, teamId: advisor.teamId } });
        return advisor;
      }),
  };
}
