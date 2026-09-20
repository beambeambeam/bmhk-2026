// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { Route as RegisterRoute } from "../register";

const { flags, getStatus } = vi.hoisted(() => ({
  flags: { registration: false },
  getStatus: vi.fn<() => Promise<unknown>>(),
}));

// oxlint-disable-next-line vitest/prefer-import-in-mock -- Boundary fake supplies session methods.
vi.mock("@bmhk-2026/client/auth-client", () => ({
  authClient: { getSession: vi.fn<() => Promise<unknown>>() },
}));

// oxlint-disable-next-line vitest/prefer-import-in-mock -- Boundary fake supplies procedures.
vi.mock("@bmhk-2026/client/orpc", () => ({
  client: {
    featureFlags: { getAll: async () => await Promise.resolve(flags) },
    teamRegistrationStatus: { get: getStatus },
  },
}));

async function runLoader(pathname: string) {
  const { loader } = RegisterRoute.options;
  if (loader === undefined) {
    throw new Error("register route has no loader");
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the loader only reads `location`
  return await (loader as (ctx: { location: { pathname: string } }) => Promise<unknown>)({
    location: { pathname },
  });
}

describe("register loader", () => {
  beforeEach(() => {
    flags.registration = false;
    getStatus.mockReset();
  });

  it("sends a user with no team to the closed page once registration has closed", async () => {
    getStatus.mockRejectedValue({ code: "TEAM_NOT_FOUND", status: 404 });

    await expect(runLoader("/register/terms")).rejects.toMatchObject({
      options: { to: "/register/closed" },
    });
  });

  it("lets a user with no team register while the window is open", async () => {
    flags.registration = true;
    getStatus.mockRejectedValue({ code: "TEAM_NOT_FOUND", status: 404 });

    await expect(runLoader("/register/terms")).resolves.toMatchObject({ teamData: null });
  });

  it("sends a submitted team to my-team even after registration has closed", async () => {
    getStatus.mockResolvedValue({ submissionState: "SUBMITTED", teamId: "t1" });

    await expect(runLoader("/register/terms")).rejects.toMatchObject({
      options: { to: "/my-team" },
    });
  });
});
