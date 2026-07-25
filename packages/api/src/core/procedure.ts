import { os } from "@orpc/server";
import { createError } from "evlog";
import { evlog } from "evlog/orpc";

import type { ApiRole, ApiSession, AuthReader, PermissionRequirement } from "./auth";
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

    const authContext: { impersonatedBy?: string; role: ApiRole } = {
      role: session.user.role,
    };
    if (session.impersonatedBy !== null) {
      authContext.impersonatedBy = session.impersonatedBy;
    }

    context.log.set({
      auth: authContext,
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

  const authenticatedProcedure = base.use(evlog()).use(requireAuth);

  function permissionProcedure(requirement: PermissionRequirement) {
    const requirePermission = os
      .$context<AuthenticatedContext>()
      .middleware(async ({ context, next }) => {
        let allowed: boolean;

        try {
          allowed = await dependencies.auth.hasPermission({
            permissions: requirement,
            role: context.session.user.role,
            userId: context.session.user.id,
          });
        } catch (error) {
          throw createError({
            cause: toError(error),
            code: "AUTHORIZATION_UNAVAILABLE",
            fix: "Try again shortly",
            message: "Authorization temporarily unavailable",
            status: 503,
            why: "Permission could not be verified",
          });
        }

        if (!allowed) {
          context.log.set({
            authorization: {
              decision: "deny",
              permissions: requirement,
            },
          });
          throw createError({
            code: "FORBIDDEN",
            fix: "Request access from an administrator",
            message: "Permission required",
            status: 403,
            why: "Authenticated user lacks required permission",
          });
        }

        return await next();
      });

    return authenticatedProcedure.use(requirePermission);
  }

  return {
    permissionProcedure,
    protectedProcedure: authenticatedProcedure,
    publicProcedure: base.use(evlog()),
  };
}

export type PublicProcedure = ReturnType<typeof createProcedures>["publicProcedure"];
export type ProtectedProcedure = ReturnType<typeof createProcedures>["protectedProcedure"];
export type PermissionProcedure = ReturnType<
  ReturnType<typeof createProcedures>["permissionProcedure"]
>;
export type AuthenticatedContext = ApiContext & { session: ApiSession };
