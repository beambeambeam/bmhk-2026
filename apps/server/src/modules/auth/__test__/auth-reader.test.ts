import type { ApiSession } from "@bmhk-2026/api";
import type { auth } from "@bmhk-2026/auth";
import { describe, expect, it, vi } from "vitest";

import { createAuthReader } from "../auth-reader";

function createAuthDouble() {
  const getSession = vi.fn<(options: { headers: Headers }) => Promise<unknown>>();
  // Test double only implements auth APIs exercised by reader tests.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const authInstance = {
    api: { getSession },
  } as unknown as typeof auth;

  return { authInstance, getSession };
}

const testSession = {
  session: {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    expiresAt: new Date("2026-02-01T00:00:00.000Z"),
    id: "session-1",
    impersonatedBy: "admin-1",
    token: "test-token",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    userId: "admin-1",
  },
  user: {
    banExpires: new Date("2026-01-02T03:04:05.000Z"),
    banReason: "policy violation",
    banned: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    displayUsername: "AdminUser",
    email: "admin@example.com",
    emailVerified: true,
    id: "admin-1",
    image: null,
    name: "Admin User",
    role: "admin",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    username: "adminuser",
  },
} satisfies ApiSession;

describe("auth reader", () => {
  it("returns the authenticated session", async () => {
    const { authInstance, getSession } = createAuthDouble();
    getSession.mockResolvedValue(testSession);

    const reader = createAuthReader(authInstance);
    await expect(reader.getSession({ headers: new Headers() })).resolves.toStrictEqual(testSession);
  });

  it("returns null when Better Auth has no session", async () => {
    const { authInstance, getSession } = createAuthDouble();
    getSession.mockResolvedValue(null);

    const reader = createAuthReader(authInstance);
    await expect(reader.getSession({ headers: new Headers() })).resolves.toBeNull();
  });
});
