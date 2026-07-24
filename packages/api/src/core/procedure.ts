import { os } from "@orpc/server";
import { createError } from "evlog";
import { evlog } from "evlog/orpc";

import type { ApiSession, AuthReader } from "./auth";
import type { ApiContext } from "./context";

export interface ProcedureDependencies {
  auth: AuthReader;
}

function maskEmail(email: string): string {
  const atIndex = email.indexOf("@");
  return atIndex > 0 ? `${email[0]}***${email.slice(atIndex)}` : "***";
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error("Unknown authentication error", { cause });
}

export function createProcedures(dependencies: ProcedureDependencies) {
  const base = os.$context<ApiContext>();

  const requireAuth = base.middleware(async ({ context, next }) => {
    let session: ApiSession | null;

    try {
      session = await dependencies.auth.getSession({
        headers: context.headers,
      });
    } catch (error) {
      throw createError({
        cause: toError(error),
        code: "AUTH_SESSION_UNAVAILABLE",
        fix: "Try again shortly",
        message: "Authentication temporarily unavailable",
        status: 503,
        why: "The server could not verify the current session",
      });
    }

    if (!session) {
      throw createError({
        code: "UNAUTHORIZED",
        fix: "Sign in and try again",
        message: "Authentication required",
        status: 401,
        why: "No authenticated session is available for this request",
      });
    }

    context.log.set({
      user: {
        email: maskEmail(session.user.email),
        id: session.user.id,
      },
      userId: session.user.id,
    });

    return await next({
      context: {
        session,
      },
    });
  });

  return {
    protectedProcedure: base.use(evlog()).use(requireAuth),
    publicProcedure: base.use(evlog()),
  };
}

export type PublicProcedure = ReturnType<typeof createProcedures>["publicProcedure"];
export type ProtectedProcedure = ReturnType<typeof createProcedures>["protectedProcedure"];
export type AuthenticatedContext = ApiContext & { session: ApiSession };
