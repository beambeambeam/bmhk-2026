import { os } from "@orpc/server";
import { createError } from "evlog";
import { evlog } from "evlog/orpc";
import type { auth } from "@bmhk-2026/auth";
import type { AuthRole } from "@bmhk-2026/auth/permission";
import type { EvlogOrpcContext } from "evlog/orpc";

export type ApiSession = typeof auth.$Infer.Session;
export type ApiUser = ApiSession["user"];
export type ApiRole = AuthRole;

export interface AuthReader {
  getSession: (options: { headers: Headers }) => Promise<ApiSession | null>;
}

export interface ApiContext extends EvlogOrpcContext {
  headers: Headers;
}

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
      session = await dependencies.auth.getSession({ headers: context.headers });
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

    const authContext: { impersonatedBy?: string; role: string } = {
      role: session.user.role ?? "user",
    };
    if (typeof session.session.impersonatedBy === "string") {
      authContext.impersonatedBy = session.session.impersonatedBy;
    }

    context.log.set({
      auth: authContext,
      user: { email: maskEmail(session.user.email), id: session.user.id },
      userId: session.user.id,
    });

    return await next({ context: { session } });
  });

  return {
    protectedProcedure: base.use(evlog()).use(requireAuth),
    publicProcedure: base.use(evlog()),
  };
}

export type PublicProcedure = ReturnType<typeof createProcedures>["publicProcedure"];
export type ProtectedProcedure = ReturnType<typeof createProcedures>["protectedProcedure"];
