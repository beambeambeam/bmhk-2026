import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type { ApiContext, ApiSession, AuthReader } from "../index";
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
  impersonatedBy: "admin-1",
  user: {
    banExpires: "2026-01-01T00:00:00.000Z",
    banReason: null,
    banned: false,
    displayUsername: "TestUser",
    email: "user@example.com",
    emailVerified: true,
    id: "user-1",
    image: null,
    name: "Test User",
    role: "admin",
    username: "testuser",
  },
} satisfies ApiSession;

function createAuthReader(
  getSession: AuthReader["getSession"] = async () => await Promise.resolve(null),
  hasPermission: AuthReader["hasPermission"] = async () => await Promise.resolve(false),
) {
  return {
    auth: {
      getSession: vi.fn<AuthReader["getSession"]>(getSession),
      hasPermission: vi.fn<AuthReader["hasPermission"]>(hasPermission),
    } satisfies AuthReader,
  };
}

describe("API router", () => {
  it("adds the operation to public procedures without resolving auth", async () => {
    const { auth } = createAuthReader();
    const router = createAppRouter({ auth });
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
    const router = createAppRouter({ auth });
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
    const router = createAppRouter({ auth });
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
    const router = createAppRouter({ auth });
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
    expect(auth.hasPermission).not.toHaveBeenCalled();
  });

  it("denies anonymous permission procedures without checking permissions", async () => {
    const { auth } = createAuthReader();
    const { permissionProcedure } = createProcedures({ auth });
    const procedure = permissionProcedure({ staff: ["access"] }).handler(() => "OK");
    const { context, log } = createContext();

    await expect(call(procedure, undefined, { context })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
    expect(auth.hasPermission).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalledOnce();
  });

  it("returns forbidden and records denied permissions", async () => {
    const { auth } = createAuthReader(
      async () => await Promise.resolve(testSession),
      async () => await Promise.resolve(false),
    );
    const { permissionProcedure } = createProcedures({ auth });
    const requirement = { user: ["list", "update"] } as const;
    const procedure = permissionProcedure(requirement).handler(() => "OK");
    const { context, log } = createContext();

    await expect(call(procedure, undefined, { context })).rejects.toMatchObject({
      code: "FORBIDDEN",
      data: {
        fix: "Request access from an administrator",
        why: "Authenticated user lacks required permission",
      },
      message: "Permission required",
      status: 403,
    });
    expect(auth.hasPermission).toHaveBeenCalledWith({
      permissions: requirement,
      role: "admin",
      userId: "user-1",
    });
    expect(log.set).toHaveBeenCalledWith({
      authorization: { decision: "deny", permissions: requirement },
    });
  });

  it("returns unavailable when permission provider fails", async () => {
    const cause = new Error("authorization offline");
    const { auth } = createAuthReader(
      async () => await Promise.resolve(testSession),
      async () => await Promise.reject(cause),
    );
    const { permissionProcedure } = createProcedures({ auth });
    const procedure = permissionProcedure({ staff: ["access"] }).handler(() => "OK");
    const { context } = createContext();

    await expect(call(procedure, undefined, { context })).rejects.toMatchObject({
      code: "AUTHORIZATION_UNAVAILABLE",
      data: {
        fix: "Try again shortly",
        why: "Permission could not be verified",
      },
      message: "Authorization temporarily unavailable",
      status: 503,
    });
  });

  it("passes server session identity and requirement to permission provider", async () => {
    const { auth } = createAuthReader(
      async () => await Promise.resolve(testSession),
      async () => await Promise.resolve(true),
    );
    const { permissionProcedure } = createProcedures({ auth });
    const requirement = { staff: ["access", "registration_access"] } as const;
    const procedure = permissionProcedure(requirement).handler(() => "OK");
    const { context } = createContext();

    await expect(call(procedure, undefined, { context })).resolves.toBe("OK");
    expect(auth.hasPermission).toHaveBeenCalledWith({
      permissions: requirement,
      role: "admin",
      userId: "user-1",
    });
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
    const router = createAppRouter({ auth });

    expect(router).toHaveProperty("health.check");
    expect(router).toHaveProperty("privateData.get");
  });
});
