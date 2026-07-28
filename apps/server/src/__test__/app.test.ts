import type { ApiSession, FileRepository, TeamRepository } from "@bmhk-2026/api";
import { createAppRouter } from "@bmhk-2026/api";
import type { auth } from "@bmhk-2026/auth";
import { clearMemoryLogs, createMemoryDrain, readMemoryLogs } from "evlog/memory";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createApp } from "../app";
import { initializeObservability } from "../infrastructure/observability";
import { createAuthReader } from "../modules/auth/auth-reader";

let storeSequence = 0;

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

type GetSession = () => Promise<ApiSession | null>;

function createTestAuth(getSession: GetSession = async () => await Promise.resolve(null)) {
  const getSessionMock = vi.fn<GetSession>(getSession);
  const handlerMock = vi.fn<() => Promise<Response>>(
    async () => await Promise.resolve(new Response("auth")),
  );

  // Test double intentionally implements only auth methods exercised by app tests.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const authInstance = {
    api: {
      getSession: getSessionMock,
    },
    handler: handlerMock,
  } as unknown as typeof auth;

  return {
    auth: authInstance,
    getSession: getSessionMock,
    handler: handlerMock,
  };
}

function createTestFileRepository(): FileRepository {
  return {
    create: async () =>
      await Promise.reject(new Error("file repository is unused in server app tests")),
    findById: async () => await Promise.resolve(null),
  };
}

function createTestTeamRepository(): TeamRepository {
  return {
    create: async () =>
      await Promise.reject(new Error("team repository is unused in server app tests")),
    delete: async () => await Promise.resolve(false),
    deleteFile: async () => await Promise.resolve(false),
    findById: async () => await Promise.resolve(null),
    findByUserId: async () => await Promise.resolve(null),
    list: async () => await Promise.resolve({ data: [], total: 0 }),
    replaceImage: async () => await Promise.resolve(null),
    update: async () => await Promise.resolve(null),
  };
}

function createTestApp(getSession?: GetSession) {
  const testAuth = createTestAuth(getSession);
  const apiRouter = createAppRouter({
    auth: createAuthReader(testAuth.auth),
    files: createTestFileRepository(),
    teams: createTestTeamRepository(),
  });
  const store = `server-app-test-${storeSequence}`;
  storeSequence += 1;
  clearMemoryLogs(store);

  return {
    app: createApp({
      apiRouter,
      auth: testAuth.auth,
      corsOrigins: ["http://localhost:3001", "http://localhost:3002"],
      observability: {
        drain: createMemoryDrain({ store }),
      },
    }),
    async events(expectedCount = 1) {
      await vi.waitFor(() => {
        expect(readMemoryLogs({ store })).toHaveLength(expectedCount);
      });

      return readMemoryLogs({ store });
    },
    ...testAuth,
  };
}

describe("server app", () => {
  beforeAll(() => {
    initializeObservability({
      drain: async () => {
        await Promise.resolve();
      },
      silent: true,
    });
  });

  it("emits one request event with Elysia lifecycle fields", async () => {
    const testApp = createTestApp();
    const response = await testApp.app.handle(new Request("http://localhost/"));

    expect(response.status).toBe(200);
    const [event] = await testApp.events();
    expect(event).toMatchObject({
      level: "info",
      method: "GET",
      path: "/",
      route: "/",
      service: "bmhk-2026-server",
      status: 200,
    });
    expect(
      [event?.duration, event?.requestId].every((value) => typeof value === "string"),
    ).toBeTruthy();
    expect(Object.keys(event ?? {})).not.toStrictEqual(
      expect.arrayContaining(["auth", "user", "userId"]),
    );
  });

  it("adds the oRPC operation to the same request event", async () => {
    const testApp = createTestApp();
    const response = await testApp.app.handle(
      new Request("http://localhost/rpc/health/check", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ json: "OK" });
    const [event] = await testApp.events();
    expect(event).toMatchObject({
      method: "POST",
      operation: "health.check",
      path: "/rpc/health/check",
      route: "/rpc*",
      status: 200,
    });
  });

  it("keeps file procedures under RPC and removes literal file routes", async () => {
    const testApp = createTestApp();

    const rpcResponse = await testApp.app.handle(
      new Request("http://localhost/rpc/files/get", { method: "POST" }),
    );
    const uploadResponse = await testApp.app.handle(
      new Request("http://localhost/upload", { method: "POST" }),
    );
    const fileResponse = await testApp.app.handle(
      new Request("http://localhost/files/file-id", { method: "GET" }),
    );

    expect(rpcResponse.status).toBe(401);
    expect(uploadResponse.status).toBe(404);
    expect(fileResponse.status).toBe(404);
  });

  it("records structured unauthorized errors without raw console output", async () => {
    const consoleError = vi.spyOn(console, "error");
    const testApp = createTestApp();
    const response = await testApp.app.handle(
      new Request("http://localhost/rpc/privateData/get", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    const [event] = await testApp.events();
    expect(event).toMatchObject({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
      level: "error",
      operation: "privateData.get",
      status: 401,
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("adds masked identity after protected authorization succeeds", async () => {
    const testApp = createTestApp(async () => await Promise.resolve(testSession));
    const response = await testApp.app.handle(
      new Request("http://localhost/rpc/privateData/get", {
        method: "POST",
      }),
    );

    const responseBody = await response.json();
    expect({ body: responseBody, status: response.status }).toMatchObject({
      body: {
        json: {
          message: "This is private",
          user: {
            ...testSession.user,
            banExpires: "2026-01-01T00:00:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        },
      },
      status: 200,
    });
    const [event] = await testApp.events();
    expect(event).toMatchObject({
      operation: "privateData.get",
      user: {
        email: "u***@example.com",
        id: "user-1",
      },
      userId: "user-1",
    });
    expect(JSON.stringify(event)).not.toContain("user@example.com");
    expect(event).toMatchObject({
      auth: {
        role: "admin",
      },
    });
  });

  it("returns 503 when protected authentication is unavailable", async () => {
    const testApp = createTestApp(() => {
      throw new Error("database offline");
    });
    const response = await testApp.app.handle(
      new Request("http://localhost/rpc/privateData/get", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(503);
    const [event] = await testApp.events();
    expect(event).toMatchObject({
      error: {
        code: "AUTH_SESSION_UNAVAILABLE",
        message: "Authentication temporarily unavailable",
      },
      level: "error",
      operation: "privateData.get",
      status: 503,
    });
  });

  it("preserves native auth response status without resolving a session", async () => {
    const testApp = createTestApp();
    const response = await testApp.app.handle(
      new Request("http://localhost/api/auth/sign-in/email", {
        method: "PUT",
      }),
    );

    expect(response.status).toBe(405);
    const [event] = await testApp.events();
    expect(event).toMatchObject({
      route: "/api/auth/*",
      status: 405,
    });
  });

  it.each(["http://localhost:3001", "http://localhost:3002"])(
    "applies configured CORS origin %s",
    async (origin) => {
      const testApp = createTestApp();

      const response = await testApp.app.handle(
        new Request("http://localhost/", {
          headers: {
            "access-control-request-method": "GET",
            origin,
          },
          method: "OPTIONS",
        }),
      );

      expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    },
  );

  it("does not apply CORS headers to unconfigured origins", async () => {
    const testApp = createTestApp();

    const response = await testApp.app.handle(
      new Request("http://localhost/", {
        headers: {
          "access-control-request-method": "GET",
          origin: "http://localhost:3003",
        },
        method: "OPTIONS",
      }),
    );

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("emits one correctly classified event for an unknown route", async () => {
    const testApp = createTestApp();
    const response = await testApp.app.handle(new Request("http://localhost/missing"));

    expect(response.status).toBe(404);
    const [event] = await testApp.events();
    expect(event).toMatchObject({
      path: "/missing",
      status: 404,
    });
  });
});
