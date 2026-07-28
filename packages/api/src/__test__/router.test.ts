import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type { ApiContext, ApiSession, AuthReader, FileRepository, TeamRepository } from "../index";
import { createAppRouter } from "../index";

function createTestLogger() {
  const audit = Object.assign(vi.fn<(...args: never[]) => void>(), {
    deny: vi.fn<(...args: never[]) => void>(),
  });

  return {
    audit,
    emit: vi.fn<() => null>(() => null),
    error: vi.fn<(...args: never[]) => void>(),
    getContext: vi.fn<() => Record<string, unknown>>(() => ({})),
    info: vi.fn<(...args: never[]) => void>(),
    set: vi.fn<(...args: never[]) => void>(),
    setLevel: vi.fn<(...args: never[]) => void>(),
    warn: vi.fn<(...args: never[]) => void>(),
  };
}

function createContext(): ApiContext {
  const log = createTestLogger();

  return {
    headers: new Headers(),
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    log: log as unknown as ApiContext["log"],
  };
}

const testSession = {
  session: {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    expiresAt: new Date("2026-02-01T00:00:00.000Z"),
    id: "session-1",
    impersonatedBy: "admin-1",
    token: "test-token",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    userId: "user-1",
  },
  user: {
    banExpires: new Date("2026-01-01T00:00:00.000Z"),
    banReason: null,
    banned: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    displayUsername: "TestUser",
    email: "user@example.com",
    emailVerified: true,
    id: "user-1",
    image: null,
    name: "Test User",
    role: "admin",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    username: "testuser",
  },
} satisfies ApiSession;

function createAuthReader(
  getSession: AuthReader["getSession"] = async () => await Promise.resolve(null),
): AuthReader {
  return { getSession };
}

function createFileRepository(): FileRepository {
  return {
    create: async () =>
      await Promise.reject(new Error("file repository is unused in router tests")),
    findById: async () => await Promise.resolve(null),
  };
}

function createTeamRepository(): TeamRepository {
  return {
    create: async () =>
      await Promise.reject(new Error("team repository is unused in router tests")),
    delete: async () => await Promise.resolve(false),
    findById: async () => await Promise.resolve(null),
    findByUserId: async () => await Promise.resolve(null),
    list: async () => await Promise.resolve({ data: [], total: 0 }),
    update: async () => await Promise.resolve(null),
  };
}

function createRouter(auth: AuthReader) {
  return createAppRouter({
    auth,
    files: createFileRepository(),
    teams: createTeamRepository(),
  });
}

describe("API router", () => {
  it("returns OK from health check", async () => {
    const router = createRouter(createAuthReader());

    await expect(
      call(router.health.check, undefined, {
        context: createContext(),
        path: ["health", "check"],
      }),
    ).resolves.toBe("OK");
  });

  it("returns a structured error for anonymous protected access", async () => {
    const router = createRouter(createAuthReader());

    await expect(
      call(router.privateData.get, undefined, {
        context: createContext(),
        path: ["privateData", "get"],
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      data: {
        fix: "Sign in and try again",
        why: "No authenticated session is available for this request",
      },
      message: "Authentication required",
      status: 401,
    });
  });

  it("returns a structured error when authentication is unavailable", async () => {
    const cause = new Error("database offline");
    const router = createRouter(
      createAuthReader(() => {
        throw cause;
      }),
    );

    await expect(
      call(router.privateData.get, undefined, {
        context: createContext(),
        path: ["privateData", "get"],
      }),
    ).rejects.toMatchObject({
      code: "AUTH_SESSION_UNAVAILABLE",
      data: {
        fix: "Try again shortly",
        why: "The server could not verify the current session",
      },
      message: "Authentication temporarily unavailable",
      status: 503,
    });
  });

  it("returns private data for an authenticated user", async () => {
    const router = createRouter(createAuthReader(async () => await Promise.resolve(testSession)));

    await expect(
      call(router.privateData.get, undefined, {
        context: createContext(),
        path: ["privateData", "get"],
      }),
    ).resolves.toStrictEqual({
      message: "This is private",
      user: testSession.user,
    });
  });
});
