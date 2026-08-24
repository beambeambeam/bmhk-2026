import { os } from "@orpc/server";
import { hasRegistrationAccess, hasStaffAccess } from "@bmhk-2026/auth/permission";
import { createError } from "evlog";
import { evlog } from "evlog/orpc";

import type { ApiKeyVerification, ApiSession, AuthReader, TeamAccessContext } from "./auth";
import type { ApiContext } from "./context";
import { adminAccessDeniedAudit } from "../features/audit/audit.actions";

export interface ProcedureDependencies {
  auth: AuthReader;
}

function maskEmail(email: string): string {
  const atIndex = email.indexOf("@");
  return atIndex > 0 ? `${email[0]}***${email.slice(atIndex)}` : "***";
}

function toError(cause: unknown): Error {
  return cause instanceof Error
    ? cause
    : createError({
        code: "AUTH_UNKNOWN_ERROR",
        fix: "Contact support",
        message: "Unknown authentication error",
        status: 500,
        why: "Authentication returned a non-Error failure",
      });
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

  const protectedProcedure = base.use(evlog()).use(requireAuth);
  const adminProcedure = protectedProcedure.use(async ({ context, next, path }) => {
    if (context.session.user.role !== "admin") {
      context.log.audit(
        adminAccessDeniedAudit({
          actor: { id: context.session.user.id, type: "user" },
          outcome: "denied",
          reason: "ADMIN_ACCESS_REQUIRED",
          target: { id: path.join(".") },
        }),
      );
      throw createError({
        code: "FORBIDDEN",
        fix: "Ask an administrator for access",
        message: "Administrator access required",
        status: 403,
        why: "The authenticated user is not an administrator",
      });
    }

    return await next();
  });
  const teamOwnerProcedure = protectedProcedure.use(async ({ context, next }) => {
    const teamAccess: TeamAccessContext = {
      actorId: context.session.user.id,
      scope: "OWN_TEAM",
    };
    return await next({ context: { teamAccess } });
  });
  const teamAccessProcedure = protectedProcedure.use(async ({ context, next }) => {
    const scope: TeamAccessContext["scope"] = hasRegistrationAccess(context.session.user.role)
      ? "ALL_TEAMS"
      : "OWN_TEAM";

    return await next({
      context: {
        teamAccess: {
          actorId: context.session.user.id,
          scope,
        },
      },
    });
  });
  const registrationProcedure = protectedProcedure.use(async ({ context, next }) => {
    if (!hasRegistrationAccess(context.session.user.role)) {
      throw createError({
        code: "FORBIDDEN",
        fix: "Ask an administrator for registration access",
        message: "Registration access required",
        status: 403,
        why: "The authenticated user lacks registration access permission",
      });
    }

    const teamAccess: TeamAccessContext = {
      actorId: context.session.user.id,
      scope: "ALL_TEAMS",
    };
    return await next({ context: { teamAccess } });
  });
  const staffProcedure = protectedProcedure.use(async ({ context, next }) => {
    if (!hasStaffAccess(context.session.user.role)) {
      throw createError({
        code: "FORBIDDEN",
        fix: "Ask an administrator for staff access",
        message: "Staff access required",
        status: 403,
        why: "The authenticated user lacks staff access permission",
      });
    }

    return await next();
  });

  const requireApiKeyAuth = base.middleware(async ({ context, next }) => {
    const key = context.headers.get("x-api-key");

    if (key === null || key.length === 0) {
      throw createError({
        code: "API_KEY_MISSING",
        fix: "Provide an API key in the x-api-key header",
        message: "API key required",
        status: 401,
        why: "No API key was present on this request",
      });
    }

    let verification: ApiKeyVerification;
    try {
      verification = await dependencies.auth.verifyApiKey({ key });
    } catch (error) {
      throw createError({
        cause: toError(error),
        code: "API_KEY_VERIFICATION_UNAVAILABLE",
        fix: "Try again shortly",
        message: "API key verification temporarily unavailable",
        status: 503,
        why: "The server could not verify the provided API key",
      });
    }

    if (!(verification.valid && verification.key)) {
      throw createError({
        code: "UNAUTHORIZED",
        fix: "Provide a valid, unexpired API key",
        message: "Invalid API key",
        status: 401,
        why: "The provided API key failed verification",
      });
    }

    context.log.set({
      apiKey: { id: verification.key.id, referenceId: verification.key.referenceId },
    });

    return await next({ context: { apiKey: verification.key } });
  });

  const apiKeyProcedure = base.use(evlog()).use(requireApiKeyAuth);

  return {
    adminProcedure,
    apiKeyProcedure,
    protectedProcedure,
    publicProcedure: base.use(evlog()),
    registrationProcedure,
    staffProcedure,
    teamAccessProcedure,
    teamOwnerProcedure,
  };
}

export type PublicProcedure = ReturnType<typeof createProcedures>["publicProcedure"];
export type ApiKeyProcedure = ReturnType<typeof createProcedures>["apiKeyProcedure"];
export type ProtectedProcedure = ReturnType<typeof createProcedures>["protectedProcedure"];
export type AdminProcedure = ReturnType<typeof createProcedures>["adminProcedure"];
export type TeamAccessProcedure = ReturnType<typeof createProcedures>["teamAccessProcedure"];
export type RegistrationProcedure = ReturnType<typeof createProcedures>["registrationProcedure"];
export type StaffProcedure = ReturnType<typeof createProcedures>["staffProcedure"];
export type TeamOwnerProcedure = ReturnType<typeof createProcedures>["teamOwnerProcedure"];
