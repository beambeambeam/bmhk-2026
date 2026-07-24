import type { auth } from "@bmhk-2026/auth";
import { describe, expect, it, vi } from "vitest";

import { createAppRouter } from "@bmhk-2026/api";
import { createApp } from "../app";

function createTestAuth() {
  // Test double intentionally implements only auth methods exercised by app tests.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return {
    api: {
      getSession: vi.fn<() => Promise<null>>(async () => await Promise.resolve(null)),
    },
    handler: vi.fn<() => Promise<Response>>(
      async () => await Promise.resolve(new Response("auth")),
    ),
  } as unknown as typeof auth;
}

function createTestApp() {
  const auth = createTestAuth();
  const apiRouter = createAppRouter({
    auth: {
      getSession: async () => await Promise.resolve(null),
    },
  });

  return {
    app: createApp({
      apiRouter,
      auth,
      corsOrigins: ["http://localhost:3001", "http://localhost:3002"],
    }),
    auth,
  };
}

describe("server app", () => {
  it("creates app without listening", async () => {
    const { app } = createTestApp();

    await expect(app.handle(new Request("http://localhost/"))).resolves.toMatchObject({
      status: 200,
    });
  });

  it("serves the public health procedure through RPC", async () => {
    const { app } = createTestApp();

    const response = await app.handle(
      new Request("http://localhost/rpc/health/check", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ json: "OK" });
  });

  it("protects private procedures", async () => {
    const { app } = createTestApp();

    const response = await app.handle(
      new Request("http://localhost/rpc/privateData/get", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects unsupported auth methods", async () => {
    const { app, auth } = createTestApp();

    const response = await app.handle(
      new Request("http://localhost/api/auth/sign-in/email", {
        method: "PUT",
      }),
    );

    expect(response.status).toBe(405);
    expect(auth.handler).not.toHaveBeenCalled();
  });

  it.each(["http://localhost:3001", "http://localhost:3002"])(
    "applies configured CORS origin %s",
    async (origin) => {
      const { app } = createTestApp();

      const response = await app.handle(
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
    const { app } = createTestApp();

    const response = await app.handle(
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
});
