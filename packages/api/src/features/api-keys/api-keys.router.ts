import type { AdminProcedure } from "../../core/procedure";
import { apiKeyCreatedAudit, apiKeyRevokedAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import {
  createApiKeyResultSchema,
  createApiKeySchema,
  listApiKeysResultSchema,
  revokeApiKeyResultSchema,
  revokeApiKeySchema,
} from "./api-keys.schema";
import type { ApiKeyService } from "./api-keys.service";

export function createApiKeysRouter(adminProcedure: AdminProcedure, service: ApiKeyService) {
  return {
    create: adminProcedure
      .route({ method: "POST", tags: ["Api Key"] })
      .input(createApiKeySchema)
      .output(createApiKeyResultSchema)
      .handler(
        async ({ context, input }) =>
          await executeAudited({
            audit: apiKeyCreatedAudit({
              actor: { id: context.session.user.id, type: "user" },
              target: { id: "new" },
            }),
            execute: async () => await service.create(input, context.session.user.id),
            log: context.log,
            onSuccess: (result) => ({
              changes: { after: { expiresAt: result.expiresAt, name: result.name } },
              target: { id: result.id, type: "api-key" },
            }),
          }),
      ),
    list: adminProcedure
      .route({ method: "GET", tags: ["Api Key"] })
      .output(listApiKeysResultSchema)
      .handler(async () => ({ apiKeys: await service.list() })),
    revoke: adminProcedure
      .route({ method: "PATCH", tags: ["Api Key"] })
      .input(revokeApiKeySchema)
      .output(revokeApiKeyResultSchema)
      .handler(
        async ({ context, input }) =>
          await executeAudited({
            audit: apiKeyRevokedAudit({
              actor: { id: context.session.user.id, type: "user" },
              target: { id: input.id },
            }),
            deniedErrorCodes: ["API_KEY_NOT_FOUND"],
            execute: async () => await service.revoke(input.id),
            log: context.log,
            onSuccess: () => ({
              changes: { after: { enabled: false }, before: { enabled: true } },
            }),
          }),
      ),
  };
}
