import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type { ApiSession } from "../core/auth";
import { createAppRouter } from "../index";

type GetSession = (options: { headers: Headers }) => Promise<ApiSession | null>;

function createRouter(getSession: GetSession = async () => await Promise.resolve(null)) {
  const getSessionMock = vi.fn<GetSession>(getSession);

  return {
    getSession: getSessionMock,
    router: createAppRouter({ auth: { getSession: getSessionMock } }),
  };
}

describe("API router", () => {
  it("keeps public procedures independent from authentication", async () => {
    const { getSession, router } = createRouter();

    await expect(
      call(router.health.check, undefined, {
        context: { headers: new Headers() },
      }),
    ).resolves.toBe("OK");
    expect(getSession).not.toHaveBeenCalled();
  });

  it("rejects protected procedures without a session", async () => {
    const headers = new Headers({ "x-request-id": "request-1" });
    const getSession = vi.fn<GetSession>(async () => await Promise.resolve(null));
    const { router } = createRouter(getSession);

    await expect(
      call(router.privateData.get, undefined, {
        context: { headers },
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(getSession).toHaveBeenCalledWith({ headers });
  });

  it("passes authenticated users to protected procedures", async () => {
    const user = {
      email: "user@example.com",
      emailVerified: true,
      id: "user-1",
      image: null,
      name: "Test User",
    };
    const getSession = vi.fn<GetSession>(async () => await Promise.resolve({ user }));
    const { router } = createRouter(getSession);

    await expect(
      call(router.privateData.get, undefined, {
        context: { headers: new Headers() },
      }),
    ).resolves.toStrictEqual({
      message: "This is private",
      user,
    });
  });

  it("exposes feature-grouped procedures", () => {
    const { router } = createRouter();

    expect(router).toHaveProperty("health.check");
    expect(router).toHaveProperty("privateData.get");
  });
});
