import { ORPCError, os } from "@orpc/server";

import type { ApiSession, AuthReader } from "./auth";
import type { ApiContext } from "./context";

export interface ProcedureDependencies {
  auth: AuthReader;
}

export function createProcedures(dependencies: ProcedureDependencies) {
  const base = os.$context<ApiContext>();

  const requireAuth = base.middleware(async ({ context, next }) => {
    const session = await dependencies.auth.getSession({
      headers: context.headers,
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED");
    }

    return next({
      context: {
        session,
      },
    });
  });

  return {
    protectedProcedure: base.use(requireAuth),
    publicProcedure: base,
  };
}

export type PublicProcedure = ReturnType<typeof createProcedures>["publicProcedure"];
export type ProtectedProcedure = ReturnType<typeof createProcedures>["protectedProcedure"];
export type AuthenticatedContext = ApiContext & { session: ApiSession };
