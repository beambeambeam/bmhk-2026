import { z } from "zod";
import type {
  RegistrationProcedure,
  TeamAccessProcedure,
  TeamOwnerProcedure,
} from "../../core/procedure";
import {
  round2ConfirmationSubmittedAudit,
  round2DocumentAccessedAudit,
  round2DocumentReplacedAudit,
} from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import { fileWithUrlSchema } from "../files/files.schema";
import { assertAllowedOrigin } from "../files/files.service";
import { round2DeniedCodes } from "./round2-confirmation.errors";
import {
  round2ConfirmationStatusSchema,
  round2DocumentInputSchema,
  round2TeamInputSchema,
  round2UploadInputSchema,
} from "./round2-confirmation.schema";
import type { Round2ConfirmationService } from "./round2-confirmation.service";

export function createRound2ConfirmationRouter(
  owner: TeamOwnerProcedure,
  registration: RegistrationProcedure,
  access: TeamAccessProcedure,
  service: Round2ConfirmationService,
) {
  return {
    document: access
      .route({ method: "GET", tags: ["Round 2 Confirmation", "File"] })
      .input(round2DocumentInputSchema)
      .output(fileWithUrlSchema)
      .handler(
        async ({ context, input }) =>
          await executeAudited({
            audit: round2DocumentAccessedAudit({
              actor: { id: context.teamAccess.actorId, type: "user" },
              target: { id: input.teamId, ...input, type: "round2-document" },
            }),
            deniedErrorCodes: round2DeniedCodes,
            execute: async () => await service.document(context.teamAccess, input),
            log: context.log,
          }),
      ),
    get: owner
      .route({ method: "GET", tags: ["Round 2 Confirmation"] })
      .input(z.object({}).strict())
      .output(round2ConfirmationStatusSchema)
      .handler(async ({ context }) => await service.get(context.teamAccess)),
    getByTeamId: registration
      .route({ method: "GET", tags: ["Round 2 Confirmation"] })
      .input(round2TeamInputSchema)
      .output(round2ConfirmationStatusSchema)
      .handler(async ({ context, input }) => await service.get(context.teamAccess, input.teamId)),
    submit: owner
      .route({ method: "POST", tags: ["Round 2 Confirmation"] })
      .input(round2TeamInputSchema)
      .output(round2ConfirmationStatusSchema)
      .handler(
        async ({ context, input }) =>
          await executeAudited({
            audit: round2ConfirmationSubmittedAudit({
              actor: { id: context.teamAccess.actorId, type: "user" },
              target: { id: input.teamId, teamId: input.teamId, type: "round2-confirmation" },
            }),
            deniedErrorCodes: round2DeniedCodes,
            execute: async () => await service.submit(context.teamAccess, input.teamId),
            log: context.log,
            onSuccess: (result) => ({
              changes: {
                after: { confirmedAt: result.confirmedAt },
                before: { confirmedAt: null },
              },
            }),
          }),
      ),
    uploadDocument: owner
      .route({ method: "POST", tags: ["Round 2 Confirmation", "File"] })
      .input(round2UploadInputSchema)
      .output(round2ConfirmationStatusSchema)
      .handler(async ({ context, input }) => {
        const target = {
          documentType: input.documentType,
          id: input.teamId,
          participantId: input.participantId,
          teamId: input.teamId,
          type: "round2-document",
        } as const;
        const result = await executeAudited({
          audit: round2DocumentReplacedAudit({
            actor: { id: context.teamAccess.actorId, type: "user" },
            target,
          }),
          deniedErrorCodes: round2DeniedCodes,
          execute: async () => {
            assertAllowedOrigin(context.headers);
            return await service.uploadDocument(context.teamAccess, input, context.log);
          },
          log: context.log,
          onSuccess: (uploaded) => ({
            changes: {
              after: { fileId: uploaded.fileId },
              before: { fileId: uploaded.previousFileId },
            },
          }),
        });
        return result.status;
      }),
  };
}
