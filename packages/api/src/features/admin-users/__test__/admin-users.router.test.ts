/* oxlint-disable require-await */
import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type { AdminUserRepository, AuthReader } from "../../../index";
import { createAppRouter } from "../../../index";
import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
} from "../../../__test__/test-support";
import { createAdminUserRepositoryError } from "../admin-users.errors";

const ACTOR_ID = "admin-1";
const TARGET_USER_ID = "user-2";

function createRepository(overrides: Partial<AdminUserRepository> = {}): AdminUserRepository {
  return {
    setRole:
      overrides.setRole ??
      (async (userId, role) => ({
        previousRole: "user",
        role,
        userId,
      })),
  };
}

function createRouter(
  repository: AdminUserRepository,
  auth: AuthReader = createTestAuthReader(
    createTestSession({ user: { id: ACTOR_ID, role: "admin" } }),
  ),
) {
  return createAppRouter({
    adminUsers: repository,
    auth,
  }).adminUsers;
}

describe("admin users router", () => {
  it("lets an administrator set a user role and audits only the role change", async () => {
    const setRole = vi.fn<AdminUserRepository["setRole"]>(async (userId, role) => ({
      previousRole: "user",
      role,
      userId,
    }));
    const router = createRouter(createRepository({ setRole }));
    const { context, log } = createTestContext();

    await expect(
      call(
        router.setRole,
        { role: "registrationStaff", userId: TARGET_USER_ID },
        { context, path: ["adminUsers", "setRole"] },
      ),
    ).resolves.toStrictEqual({ role: "registrationStaff", userId: TARGET_USER_ID });
    expect(setRole).toHaveBeenCalledWith(TARGET_USER_ID, "registrationStaff");
    expect(log.audit).toHaveBeenCalledWith({
      action: "user.role.changed",
      actor: { id: ACTOR_ID, type: "user" },
      changes: {
        after: { role: "registrationStaff" },
        before: { role: "user" },
      },
      outcome: "success",
      target: { id: TARGET_USER_ID, type: "user" },
    });
  });

  it("denies non-administrators before changing a role and audits the attempt", async () => {
    const setRole = vi.fn<AdminUserRepository["setRole"]>();
    const router = createRouter(
      createRepository({ setRole }),
      createTestAuthReader(
        createTestSession({ user: { id: "staff-1", role: "registrationStaff" } }),
      ),
    );
    const { context, log } = createTestContext();

    await expect(
      call(
        router.setRole,
        { role: "staff", userId: TARGET_USER_ID },
        { context, path: ["adminUsers", "setRole"] },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(setRole).not.toHaveBeenCalled();
    expect(log.audit).toHaveBeenCalledWith({
      action: "admin.access.denied",
      actor: { id: "staff-1", type: "user" },
      outcome: "denied",
      reason: "ADMIN_ACCESS_REQUIRED",
      target: { id: "adminUsers.setRole", type: "admin-operation" },
    });
  });

  it("audits a missing target user as denied", async () => {
    const router = createRouter(createRepository({ setRole: async () => null }));
    const { context, log } = createTestContext();

    await expect(
      call(
        router.setRole,
        { role: "staff", userId: TARGET_USER_ID },
        { context, path: ["adminUsers", "setRole"] },
      ),
    ).rejects.toMatchObject({ code: "ADMIN_USER_NOT_FOUND", status: 404 });
    expect(log.audit).toHaveBeenCalledWith({
      action: "user.role.changed",
      actor: { id: ACTOR_ID, type: "user" },
      outcome: "denied",
      reason: "ADMIN_USER_NOT_FOUND",
      target: { id: TARGET_USER_ID, type: "user" },
    });
  });

  it("returns and audits a sanitized role-update failure", async () => {
    const router = createRouter(
      createRepository({
        setRole: async () => {
          throw createAdminUserRepositoryError(new Error("password=secret database detail"));
        },
      }),
    );
    const { context, log } = createTestContext();

    await expect(
      call(
        router.setRole,
        { role: "staff", userId: TARGET_USER_ID },
        { context, path: ["adminUsers", "setRole"] },
      ),
    ).rejects.toMatchObject({
      code: "ADMIN_USER_REPOSITORY_ERROR",
      message: "User role update failed",
      status: 500,
    });
    expect(log.audit).toHaveBeenCalledWith({
      action: "user.role.changed",
      actor: { id: ACTOR_ID, type: "user" },
      outcome: "failure",
      reason: "ADMIN_USER_REPOSITORY_ERROR",
      target: { id: TARGET_USER_ID, type: "user" },
    });
  });

  it("rejects unsupported roles before repository invocation", async () => {
    const setRole = vi.fn<AdminUserRepository["setRole"]>();
    const router = createRouter(createRepository({ setRole }));
    const { context } = createTestContext();

    await expect(
      call(
        router.setRole,
        // @ts-expect-error -- verifies runtime rejection of an unsupported authorization role
        { role: "superAdmin", userId: TARGET_USER_ID },
        { context, path: ["adminUsers", "setRole"] },
      ),
    ).rejects.toBeInstanceOf(Error);
    expect(setRole).not.toHaveBeenCalled();
  });
});
