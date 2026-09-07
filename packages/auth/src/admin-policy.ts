import { APIError } from "better-auth";
import { createAuthMiddleware, getAuthoritativeSessionFromCtx } from "better-auth/api";
import { z } from "zod";

import { getManageableRoles, isAuthRole } from "./permission";

const adminBodySchema = z.looseObject({
  data: z.record(z.string(), z.unknown()).optional(),
  role: z.unknown().optional(),
  sessionToken: z.unknown().optional(),
  userId: z.unknown().optional(),
});

function assertManageableRole(actorRole: unknown, targetRole: unknown): void {
  const manageableRoles = getManageableRoles(typeof actorRole === "string" ? actorRole : null);
  if (
    typeof targetRole !== "string" ||
    !isAuthRole(targetRole) ||
    !manageableRoles.includes(targetRole)
  ) {
    throw new APIError("FORBIDDEN", {
      message: "You cannot manage this account or assign this role.",
    });
  }
}

function assertAuditedRoleChange(path: string, data: Record<string, unknown> | undefined): void {
  if (
    path === "/admin/set-role" ||
    (path === "/admin/update-user" && Object.hasOwn(data ?? {}, "role"))
  ) {
    throw new APIError("FORBIDDEN", { message: "Use the application role management endpoint." });
  }
}

/** Keep role changes on the application's audited, transactional endpoint. */
export const adminPolicy = createAuthMiddleware(async (context) => {
  if (!context.path?.startsWith("/admin/")) {
    return;
  }
  const body = adminBodySchema.safeParse(context.body ?? {});
  if (!body.success) {
    throw new APIError("BAD_REQUEST", { message: "Invalid administrator request." });
  }
  assertAuditedRoleChange(context.path, body.data.data);

  const actor = await getAuthoritativeSessionFromCtx(context);
  if (!actor) {
    // Better Auth rejects unauthenticated HTTP requests. Trusted server-side
    // createUser calls are used by the explicit seed workflow.
    return;
  }

  if (context.path === "/admin/create-user") {
    assertManageableRole(actor.user.role, body.data.role ?? body.data.data?.role ?? "user");
    return;
  }

  let targetUserId: unknown = body.data.userId;
  if (context.path === "/admin/revoke-user-session" && typeof body.data.sessionToken === "string") {
    const targetSession = await context.context.internalAdapter.findSession(body.data.sessionToken);
    targetUserId = targetSession?.user.id;
  }
  if (typeof targetUserId !== "string") {
    return;
  }
  const target = await context.context.internalAdapter.findUserById(targetUserId);
  if (target) {
    assertManageableRole(actor.user.role, "role" in target ? (target.role ?? "user") : "user");
  }
});
