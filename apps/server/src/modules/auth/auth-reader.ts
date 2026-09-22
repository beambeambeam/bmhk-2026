import type { AuthReader } from "@bmhk-2026/api";
import type { auth } from "@bmhk-2026/auth";
import { hasAdminAccess } from "@bmhk-2026/auth/permission";
import { createError } from "evlog";

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
      try {
        const result = await authInstance.api.verifyApiKey({ body: { key } });
        if (!result.valid || !result.key) {
          return { key: null, valid: false };
        }

        const context = await authInstance.$context;
        const owner = await context.internalAdapter.findUserById(result.key.referenceId);
        if (
          !owner ||
          !("role" in owner) ||
          typeof owner.role !== "string" ||
          !hasAdminAccess(owner.role) ||
          ("banned" in owner && owner.banned === true)
        ) {
          return { key: null, valid: false };
        }

        return {
          key: { id: result.key.id, referenceId: result.key.referenceId },
          valid: true,
        };
      } catch (error) {
        throw createError({
          cause: error instanceof Error ? error : undefined,
          code: "AUTH_API_KEY_UNAVAILABLE",
          fix: "Try again shortly",
          message: "Bot authentication temporarily unavailable",
          status: 503,
          why: "The server could not validate the API key and its administrator account",
        });
      }
    },
  };
}

export type AuthInstance = typeof auth;
