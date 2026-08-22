import type { AuthReader } from "../../core/auth";
import { createApiKeyNotFoundError } from "./api-keys.errors";
import type { ApiKeyRepository } from "./api-keys.repository";
import type { ApiKey, CreateApiKeyInput, CreateApiKeyResult } from "./api-keys.schema";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ApiKeyService {
  create: (input: CreateApiKeyInput, actorId: string) => Promise<CreateApiKeyResult>;
  list: () => Promise<ApiKey[]>;
  revoke: (id: string) => Promise<ApiKey>;
}

export function createApiKeyService(
  repository: ApiKeyRepository,
  issuer: Pick<AuthReader, "createApiKey">,
): ApiKeyService {
  return {
    create: async (input, actorId) => {
      const expiresIn =
        typeof input.expiresInDays === "number" ? input.expiresInDays * MILLISECONDS_PER_DAY : null;

      return await issuer.createApiKey({ expiresIn, name: input.name, userId: actorId });
    },
    list: async () => await repository.list(),
    revoke: async (id) => {
      const revoked = await repository.revoke(id);
      if (!revoked) {
        throw createApiKeyNotFoundError();
      }

      return revoked;
    },
  };
}
