import type { AuthReader } from "@bmhk-2026/api";
import type { auth } from "@bmhk-2026/auth";

export function createAuthReader(authInstance: typeof auth): AuthReader {
  return {
    async getSession({ headers }) {
      const session = await authInstance.api.getSession({ headers });

      if (!session) {
        return null;
      }

      return {
        user: {
          displayUsername: session.user.displayUsername ?? null,
          email: session.user.email,
          emailVerified: session.user.emailVerified,
          id: session.user.id,
          image: session.user.image ?? null,
          name: session.user.name,
          username: session.user.username ?? null,
        },
      };
    },
  };
}

export type AuthInstance = typeof auth;
