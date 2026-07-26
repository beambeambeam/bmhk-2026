import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type { ApiContext, ApiSession, AuthReader, TeamRepository } from "../index";
import { createAppRouter } from "../index";
import { createProcedures } from "../core/procedure";

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

function createContext() {
  const log = createTestLogger();

  return {
    context: {
      headers: new Headers(),
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      log: log as unknown as ApiContext["log"],
    } satisfies ApiContext,
    log,
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
) {
  return {
    auth: {
      getSession: vi.fn<AuthReader["getSession"]>(getSession),
    } satisfies AuthReader,
  };
}

function createTeamRepository(): TeamRepository {
  return {
    create: vi.fn<TeamRepository["create"]>(),
    delete: vi.fn<TeamRepository["delete"]>(),
    findById: vi.fn<TeamRepository["findById"]>(),
    list: vi.fn<TeamRepository["list"]>(),
    update: vi.fn<TeamRepository["update"]>(),
  };
}

describe("API router", () => {
  it("adds the operation to public procedures without resolving auth", async () => {
    const { auth } = createAuthReader();
    const router = createAppRouter({ auth, teams: createTeamRepository() });
    const { context, log } = createContext();

    await expect(
      call(router.health.check, undefined, {
        context,
        path: ["health", "check"],
      }),
    ).resolves.toBe("OK");
    expect(log.set).toHaveBeenCalledWith({ operation: "health.check" });
    expect(log.emit).not.toHaveBeenCalled();
    expect(auth.getSession).not.toHaveBeenCalled();
  });

  it("returns a structured error for anonymous protected access", async () => {
    const { auth } = createAuthReader();
    const router = createAppRouter({ auth, teams: createTeamRepository() });
    const { context, log } = createContext();

    await expect(
      call(router.privateData.get, undefined, {
        context,
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
    expect(log.set).toHaveBeenCalledWith({ operation: "privateData.get" });
    expect(log.error).toHaveBeenCalledOnce();
    expect(log.emit).not.toHaveBeenCalled();
  });

  it("returns a structured error when authentication is unavailable", async () => {
    const cause = new Error("database offline");
    const { auth } = createAuthReader(() => {
      throw cause;
    });
    const router = createAppRouter({ auth, teams: createTeamRepository() });
    const { context, log } = createContext();

    await expect(
      call(router.privateData.get, undefined, {
        context,
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
    expect(log.error).toHaveBeenCalledOnce();
    expect(log.emit).not.toHaveBeenCalled();
  });

  it("adds masked identity and passes the session to protected procedures", async () => {
    const { auth } = createAuthReader(async () => await Promise.resolve(testSession));
    const router = createAppRouter({ auth, teams: createTeamRepository() });
    const { context, log } = createContext();

    await expect(
      call(router.privateData.get, undefined, {
        context,
        path: ["privateData", "get"],
      }),
    ).resolves.toStrictEqual({
      message: "This is private",
      user: testSession.user,
    });
    expect(log.set).toHaveBeenCalledWith({
      auth: {
        impersonatedBy: "admin-1",
        role: "admin",
      },
      user: {
        email: "u***@example.com",
        id: "user-1",
      },
      userId: "user-1",
    });
    expect(log.emit).not.toHaveBeenCalled();
  });

  it("allows procedures to add grouped business context", async () => {
    const { auth } = createAuthReader();
    const { publicProcedure } = createProcedures({ auth });
    const procedure = publicProcedure.handler(({ context }) => {
      context.log.set({
        booking: {
          id: "booking-1",
          status: "confirmed",
        },
      });

      return "OK";
    });
    const { context, log } = createContext();

    await expect(call(procedure, undefined, { context })).resolves.toBe("OK");
    expect(log.set).toHaveBeenCalledWith({
      booking: {
        id: "booking-1",
        status: "confirmed",
      },
    });
    expect(log.emit).not.toHaveBeenCalled();
  });

  it("exposes feature-grouped procedures", () => {
    const { auth } = createAuthReader();
    const router = createAppRouter({ auth, teams: createTeamRepository() });

    expect(router).toHaveProperty("health.check");
    expect(router).toHaveProperty("privateData.get");
    expect(Object.keys(router.teams).toSorted()).toStrictEqual([
      "create",
      "delete",
      "get",
      "list",
      "update",
    ]);
  });
});
