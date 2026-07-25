import type { AuthReader } from "@bmhk-2026/api";
import type { auth } from "@bmhk-2026/auth";

export function createAuthReader(authInstance: typeof auth): AuthReader {
  return {
    async getSession({ headers }) {
      return await authInstance.api.getSession({ headers });
    },
  };
}

export type AuthInstance = typeof auth;
