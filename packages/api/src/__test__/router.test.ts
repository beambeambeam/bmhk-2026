import { call } from "@orpc/server";
import { describe, expect, it } from "vitest";

import type { AuthReader } from "../index";
import { createAppRouter } from "../index";

import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
  createUnusedFileRepository,
  createUnusedTeamRepository,
} from "./test-support";

const testSession = createTestSession({
  session: { impersonatedBy: "admin-1" },
  user: { banExpires: new Date("2026-01-01T00:00:00.000Z"), role: "admin" },
});

function createRouter(auth: AuthReader) {
  return createAppRouter({
    auth,
    files: createUnusedFileRepository(),
    teams: createUnusedTeamRepository(),
  });
}

describe("API router", () => {
  it("returns OK from health check", async () => {
    const router = createRouter(createTestAuthReader(null));

    await expect(
      call(router.health.check, undefined, {
        context: createTestContext().context,
        path: ["health", "check"],
      }),
    ).resolves.toBe("OK");
  });

  it("returns a structured error for anonymous protected access", async () => {
    const router = createRouter(createTestAuthReader(null));

    await expect(
      call(router.privateData.get, undefined, {
        context: createTestContext().context,
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
      createTestAuthReader(() => {
        throw cause;
      }),
    );

    await expect(
      call(router.privateData.get, undefined, {
        context: createTestContext().context,
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
    const router = createRouter(createTestAuthReader(testSession));

    await expect(
      call(router.privateData.get, undefined, {
        context: createTestContext().context,
        path: ["privateData", "get"],
      }),
    ).resolves.toStrictEqual({
      message: "This is private",
      user: testSession.user,
    });
  });
});
