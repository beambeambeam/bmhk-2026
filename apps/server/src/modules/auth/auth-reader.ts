import type { AuthReader } from "@bmhk-2026/api";
import type { auth } from "@bmhk-2026/auth";

export function createAuthReader(authInstance: typeof auth): AuthReader {
  return {
    async createApiKey({ expiresIn, name, userId }) {
      const result = await authInstance.api.createApiKey({ body: { expiresIn, name, userId } });
      return {
        createdAt: result.createdAt,
        expiresAt: result.expiresAt,
        id: result.id,
        key: result.key,
        name: result.name,
        start: result.start,
      };
    },
    async getSession({ headers }) {
      return await authInstance.api.getSession({ headers });
    },
    async verifyApiKey({ key }) {
      const result = await authInstance.api.verifyApiKey({ body: { key } });
      return {
        key: result.key ? { id: result.key.id, referenceId: result.key.referenceId } : null,
        valid: result.valid,
      };
    },
  };
}

export type AuthInstance = typeof auth;
