import type { ApiSession } from "@bmhk-2026/api";
import type { auth } from "@bmhk-2026/auth";
import { describe, expect, it, vi } from "vitest";

import { createAuthReader } from "../auth-reader";

function createAuthDouble() {
  const getSession = vi.fn<(options: { headers: Headers }) => Promise<unknown>>();
  const userHasPermission = vi.fn<(options: unknown) => Promise<unknown>>();
  // Test double only implements auth APIs exercised by reader tests.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const authInstance = {
    api: { getSession, userHasPermission },
  } as unknown as typeof auth;

  return { authInstance, getSession, userHasPermission };
}

describe("auth reader", () => {
  it("maps complete Better Auth session metadata", async () => {
    const { authInstance, getSession } = createAuthDouble();
    getSession.mockResolvedValue({
      session: { impersonatedBy: "admin-1" },
      user: {
        banExpires: new Date("2026-01-02T03:04:05.000Z"),
        banReason: "policy violation",
        banned: true,
        displayUsername: "AdminUser",
        email: "admin@example.com",
        emailVerified: true,
        id: "admin-1",
        image: null,
        name: "Admin User",
        role: "admin",
        username: "adminuser",
      },
    });

    const reader = createAuthReader(authInstance);
    await expect(reader.getSession({ headers: new Headers() })).resolves.toStrictEqual({
      impersonatedBy: "admin-1",
      user: {
        banExpires: "2026-01-02T03:04:05.000Z",
        banReason: "policy violation",
        banned: true,
        displayUsername: "AdminUser",
        email: "admin@example.com",
        emailVerified: true,
        id: "admin-1",
        image: null,
        name: "Admin User",
        role: "admin",
        username: "adminuser",
      },
    } satisfies ApiSession);
  });

  it("defaults missing or malformed metadata safely", async () => {
    const { authInstance, getSession } = createAuthDouble();
    getSession.mockResolvedValue({
      session: {},
      user: {
        banExpires: "not-a-date",
        banReason: 42,
        banned: null,
        displayUsername: null,
        email: "user@example.com",
        emailVerified: false,
        id: "user-1",
        image: null,
        name: "User",
        role: "admin,staff",
        username: null,
      },
    });

    const reader = createAuthReader(authInstance);
    await expect(reader.getSession({ headers: new Headers() })).resolves.toMatchObject({
      impersonatedBy: null,
      user: {
        banExpires: null,
        banReason: null,
        banned: false,
        role: "user",
      },
    });
  });

  it("uses plural mutable permission lists and server identity", async () => {
    const { authInstance, userHasPermission } = createAuthDouble();
    userHasPermission.mockResolvedValue({ success: true });
    const reader = createAuthReader(authInstance);
    const requirement = {
      staff: ["access", "registration_access"],
      user: ["update"],
    } as const;

    await expect(
      reader.hasPermission({
        permissions: requirement,
        role: "registrationStaff",
        userId: "staff-1",
      }),
    ).resolves.toBeTruthy();
    expect(userHasPermission).toHaveBeenCalledWith({
      body: {
        permissions: {
          staff: ["access", "registration_access"],
          user: ["update"],
        },
        role: "registrationStaff",
        userId: "staff-1",
      },
    });
  });

  it("returns denied result and propagates provider errors", async () => {
    const { authInstance, userHasPermission } = createAuthDouble();
    userHasPermission.mockResolvedValueOnce({ success: false });
    const reader = createAuthReader(authInstance);

    await expect(
      reader.hasPermission({
        permissions: { staff: ["access"] },
        role: "user",
        userId: "user-1",
      }),
    ).resolves.toBeFalsy();

    const cause = new Error("authorization offline");
    userHasPermission.mockRejectedValueOnce(cause);
    await expect(
      reader.hasPermission({
        permissions: { staff: ["access"] },
        role: "staff",
        userId: "staff-1",
      }),
    ).rejects.toBe(cause);
  });
});
