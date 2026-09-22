import type { ApiSession } from "@bmhk-2026/api";
import type { auth } from "@bmhk-2026/auth";
import { describe, expect, it, vi } from "vitest";

import { createAuthReader } from "../auth-reader";

function createAuthDouble() {
  const findUserById = vi.fn<(id: string) => Promise<unknown>>();
  const getSession = vi.fn<(options: { headers: Headers }) => Promise<unknown>>();
  const verifyApiKey = vi.fn<(options: { body: { key: string } }) => Promise<unknown>>();
  const createApiKey =
    vi.fn<
      (options: {
        body: { expiresIn: number | null; name: string; userId: string };
      }) => Promise<unknown>
    >();
  // Test double only implements auth APIs exercised by reader tests.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const authInstance = {
    $context: Promise.resolve({ internalAdapter: { findUserById } }),
    api: { createApiKey, getSession, verifyApiKey },
  } as unknown as typeof auth;

  return { authInstance, createApiKey, findUserById, getSession, verifyApiKey };
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

  it.each(["admin", "superAdmin"])("accepts a bot key owned by an active %s", async (role) => {
    const { authInstance, findUserById, verifyApiKey } = createAuthDouble();
    findUserById.mockResolvedValue({ banned: false, id: "user-1", role });
    verifyApiKey.mockResolvedValue({
      error: null,
      key: { id: "key-1", referenceId: "user-1" },
      valid: true,
    });

    const reader = createAuthReader(authInstance);
    await expect(reader.verifyApiKey({ key: "test-key" })).resolves.toStrictEqual({
      key: { id: "key-1", referenceId: "user-1" },
      valid: true,
    });
    expect(verifyApiKey).toHaveBeenCalledWith({ body: { key: "test-key" } });
    expect(findUserById).toHaveBeenCalledWith("user-1");
  });

  it.each([
    { banned: false, id: "user-1", role: "user" },
    { banned: false, id: "user-1", role: "staff" },
    { banned: false, id: "user-1", role: "registrationStaff" },
    { banned: true, id: "user-1", role: "admin" },
    null,
  ])("rejects a valid key when its owner is not an active administrator: %j", async (owner) => {
    const { authInstance, findUserById, verifyApiKey } = createAuthDouble();
    findUserById.mockResolvedValue(owner);
    verifyApiKey.mockResolvedValue({
      error: null,
      key: { id: "key-1", referenceId: "user-1" },
      valid: true,
    });

    const reader = createAuthReader(authInstance);
    await expect(reader.verifyApiKey({ key: "test-key" })).resolves.toStrictEqual({
      key: null,
      valid: false,
    });
  });

  it("maps an invalid api key verification to a null key", async () => {
    const { authInstance, verifyApiKey } = createAuthDouble();
    verifyApiKey.mockResolvedValue({
      error: { code: "KEY_NOT_FOUND", message: "not found" },
      key: null,
      valid: false,
    });

    const reader = createAuthReader(authInstance);
    await expect(reader.verifyApiKey({ key: "bad-key" })).resolves.toStrictEqual({
      key: null,
      valid: false,
    });
  });

  it("fails closed with a safe error when the key owner's account cannot be checked", async () => {
    const { authInstance, findUserById, verifyApiKey } = createAuthDouble();
    verifyApiKey.mockResolvedValue({
      key: { id: "key-1", referenceId: "user-1" },
      valid: true,
    });
    findUserById.mockRejectedValue(new Error("private database connection details"));

    await expect(
      createAuthReader(authInstance).verifyApiKey({ key: "test-key" }),
    ).rejects.toMatchObject({
      code: "AUTH_API_KEY_UNAVAILABLE",
      message: "Bot authentication temporarily unavailable",
      status: 503,
    });
  });

  it("issues an api key through better auth", async () => {
    const { authInstance, createApiKey } = createAuthDouble();
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    createApiKey.mockResolvedValue({
      createdAt,
      expiresAt: null,
      id: "key-1",
      key: "plaintext-key-value",
      name: "Integration key",
      start: "bmhk_ab",
    });

    const reader = createAuthReader(authInstance);
    await expect(
      reader.createApiKey({ expiresIn: null, name: "Integration key", userId: "admin-1" }),
    ).resolves.toStrictEqual({
      createdAt,
      expiresAt: null,
      id: "key-1",
      key: "plaintext-key-value",
      name: "Integration key",
      start: "bmhk_ab",
    });
    expect(createApiKey).toHaveBeenCalledWith({
      body: { expiresIn: null, name: "Integration key", userId: "admin-1" },
    });
  });
});
