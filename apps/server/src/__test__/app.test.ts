import type {
  ApiSession,
  AuthReader,
  DiscordService,
  DiscordTeamGroupsService,
  FileRepository,
  TeamRepository,
} from "@bmhk-2026/api";
import { createAppRouter } from "@bmhk-2026/api";
import type { auth } from "@bmhk-2026/auth";
import { clearMemoryLogs, createMemoryDrain, readMemoryLogs } from "evlog/memory";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

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
    deleteById: async () => await Promise.resolve(false),
    findById: async () => await Promise.resolve(null),
  };
}

function createTestDiscordService(): DiscordService {
  return {
    query: async () => await Promise.resolve({ data: null, status: 1 }),
    verify: async () => await Promise.resolve({ nickname: null, status: 1 }),
  };
}

function createTestTeamRepository(): TeamRepository {
  return {
    create: async () =>
      await Promise.reject(new Error("team repository is unused in server app tests")),
    delete: async () => await Promise.resolve(false),
    findById: async () => await Promise.resolve(null),
    findByUserId: async () => await Promise.resolve(null),
    list: async () => await Promise.resolve({ data: [], total: 0 }),
    replaceImage: async () => await Promise.resolve(null),
    setAward: async () => await Promise.resolve(null),
    update: async () => await Promise.resolve(null),
  };
}

const TEST_API_KEY = "test-api-key";

function createTestTeamGroupsService(
  overrides: Partial<DiscordTeamGroupsService> = {},
): DiscordTeamGroupsService {
  return {
    list: async () => await Promise.resolve([]),
    recordCategoryId: async () => await Promise.resolve(true),
    recordChannelId: async () => await Promise.resolve(true),
    ...overrides,
  };
}

function createTestVerifyApiKey(): AuthReader["verifyApiKey"] {
  return async ({ key }) =>
    await Promise.resolve(
      key === TEST_API_KEY
        ? { key: { id: "key-1", referenceId: "user-1" }, valid: true }
        : { key: null, valid: false },
    );
}

function createTestApp(
  getSession?: GetSession,
  teamGroupsService: DiscordTeamGroupsService = createTestTeamGroupsService(),
  verifyApiKey: AuthReader["verifyApiKey"] = createTestVerifyApiKey(),
) {
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
      discordService: createTestDiscordService(),
      observability: {
        drain: createMemoryDrain({ store }),
      },
      teamGroupsService,
      verifyApiKey,
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

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["production", "staging", "test"])(
    "hides API documentation and schema in %s while keeping API endpoints available",
    async (environment) => {
      vi.stubEnv("NODE_ENV", environment);
      const { app } = createTestApp();

      const responses = await Promise.all(
        ["/api-reference", "/api-reference/", "/api-reference/spec.json"].map(
          async (path) => await app.handle(new Request(`http://localhost${path}`)),
        ),
      );
      expect(responses.map((response) => response.status)).toStrictEqual([404, 404, 404]);

      const response = await app.handle(
        new Request("http://localhost/api-reference/teamRegistrationStatus/get"),
      );
      expect(response.status).toBe(401);
    },
  );

  it("serves API documentation and schema in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { app } = createTestApp();

    const docs = await app.handle(new Request("http://localhost/api-reference"));
    expect(docs.status).toBe(200);
    expect(docs.headers.get("content-type")).toContain("text/html");

    const schema = await app.handle(new Request("http://localhost/api-reference/spec.json"));
    expect(schema.status).toBe(200);
    await expect(schema.json()).resolves.toHaveProperty("openapi");
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

  it("rejects team-groups requests without a valid api key", async () => {
    const testApp = createTestApp();
    const response = await testApp.app.handle(
      new Request("http://localhost/api/discord/team-groups"),
    );

    expect(response.status).toBe(401);
  });

  it("returns team groups for a valid api key", async () => {
    const testApp = createTestApp(
      undefined,
      createTestTeamGroupsService({
        list: async () =>
          await Promise.resolve([
            {
              category_id: null,
              has_overseer: false,
              id: "group-1",
              index: 1,
              members: [],
              name: "หมวดที่ 1",
            },
          ]),
      }),
    );

    const response = await testApp.app.handle(
      new Request("http://localhost/api/discord/team-groups", {
        headers: { "x-api-key": TEST_API_KEY },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual([
      {
        category_id: null,
        has_overseer: false,
        id: "group-1",
        index: 1,
        members: [],
        name: "หมวดที่ 1",
      },
    ]);
  });

  it("records a group's category id via PATCH and 404s for an unknown group", async () => {
    let recordedArgs: [string, string] | null = null;
    const testApp = createTestApp(
      undefined,
      createTestTeamGroupsService({
        recordCategoryId: async (groupId, categoryId) => {
          recordedArgs = [groupId, categoryId];
          return await Promise.resolve(groupId === "group-1");
        },
      }),
    );

    const okResponse = await testApp.app.handle(
      new Request("http://localhost/api/discord/team-groups/group-1", {
        body: JSON.stringify({ category_id: "cat-1" }),
        headers: { "content-type": "application/json", "x-api-key": TEST_API_KEY },
        method: "PATCH",
      }),
    );
    expect(okResponse.status).toBe(200);
    expect(recordedArgs).toStrictEqual(["group-1", "cat-1"]);

    const missingResponse = await testApp.app.handle(
      new Request("http://localhost/api/discord/team-groups/missing", {
        body: JSON.stringify({ category_id: "cat-1" }),
        headers: { "content-type": "application/json", "x-api-key": TEST_API_KEY },
        method: "PATCH",
      }),
    );
    expect(missingResponse.status).toBe(404);
  });

  it("records a member's channel id via PATCH", async () => {
    let recordedArgs: [string, string] | null = null;
    const testApp = createTestApp(
      undefined,
      createTestTeamGroupsService({
        recordChannelId: async (memberId, channelId) => {
          recordedArgs = [memberId, channelId];
          return await Promise.resolve(true);
        },
      }),
    );

    const response = await testApp.app.handle(
      new Request("http://localhost/api/discord/team-group-members/member-1", {
        body: JSON.stringify({ channel_id: "channel-1" }),
        headers: { "content-type": "application/json", "x-api-key": TEST_API_KEY },
        method: "PATCH",
      }),
    );

    expect(response.status).toBe(200);
    expect(recordedArgs).toStrictEqual(["member-1", "channel-1"]);
  });

  it("rejects a PATCH with an invalid body", async () => {
    const testApp = createTestApp();
    const response = await testApp.app.handle(
      new Request("http://localhost/api/discord/team-groups/group-1", {
        body: JSON.stringify({}),
        headers: { "content-type": "application/json", "x-api-key": TEST_API_KEY },
        method: "PATCH",
      }),
    );

    expect(response.status).toBe(400);
  });
});
