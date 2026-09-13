import { call } from "@orpc/server";
import { describe, expect, it } from "vitest";

import type { AuthReader } from "../index";
import { createAppRouter } from "../index";
import type {
  StaffOverseerBacklogRecord,
  StaffOverseerGroupLookup,
  StaffOverseersRepository,
} from "../features/staff-overseers/staff-overseers.repository";
import type { StaffDiscordLinkService } from "../features/staff-discord-link/staff-discord-link.service";

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
    staffDiscordLinkService: {
      createToken: async () => await Promise.resolve({ expiresAt: new Date(), token: "unused" }),
      link: async () =>
        await Promise.reject(new Error("StaffDiscordLinkService.link was called unexpectedly")),
    },
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

function createFakeStaffDiscordLinkService(): StaffDiscordLinkService {
  return {
    createToken: async () => await Promise.resolve({ expiresAt: new Date(), token: "unused" }),
    link: async () => await Promise.resolve({ status: "SUCCESS" }),
  };
}

function createFakeStaffOverseersRepository(): StaffOverseersRepository {
  const groups = new Map<number, StaffOverseerGroupLookup>([
    [1, { id: "group-1", index: 1, name: "หมวดที่ 1" }],
  ]);
  const usersByEmail = new Map([["known@kmutt.ac.th", { id: "user-1", name: "Somchai Test" }]]);
  const backlog: StaffOverseerBacklogRecord[] = [];

  return {
    addBacklogEntry: async (email, groupId) => {
      backlog.push({
        createdAt: new Date(),
        email,
        groupId,
        groupIndex: 1,
        groupName: "หมวดที่ 1",
        id: "backlog-1",
      });
      await Promise.resolve();
    },
    assignOverseer: async () => {
      await Promise.resolve();
    },
    findBacklogEntry: async (id) =>
      await Promise.resolve(backlog.find((entry) => entry.id === id) ?? null),
    findGroupByIndex: async (index) => await Promise.resolve(groups.get(index) ?? null),
    findUserByEmail: async (email) => await Promise.resolve(usersByEmail.get(email) ?? null),
    listBacklog: async () => await Promise.resolve(backlog),
    listOverseers: async () => await Promise.resolve([]),
    removeBacklogEntry: async () => {
      await Promise.resolve();
    },
  };
}

describe("staffOverseers router", () => {
  it("rejects importRows for a non-admin session", async () => {
    const router = createAppRouter({
      auth: createTestAuthReader(createTestSession({ user: { role: "staff" } })),
      files: createUnusedFileRepository(),
      staffDiscordLinkService: createFakeStaffDiscordLinkService(),
      staffOverseers: createFakeStaffOverseersRepository(),
      teams: createUnusedTeamRepository(),
    });

    await expect(
      call(
        router.staffOverseers.importRows,
        { rows: [{ email: "a@kmutt.ac.th", teamsGroupIndex: 1 }] },
        {
          context: createTestContext().context,
          path: ["staffOverseers", "importRows"],
        },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("imports a row for an admin session", async () => {
    const router = createAppRouter({
      auth: createTestAuthReader(createTestSession({ user: { role: "admin" } })),
      files: createUnusedFileRepository(),
      staffDiscordLinkService: createFakeStaffDiscordLinkService(),
      staffOverseers: createFakeStaffOverseersRepository(),
      teams: createUnusedTeamRepository(),
    });

    const result = await call(
      router.staffOverseers.importRows,
      { rows: [{ email: "known@kmutt.ac.th", teamsGroupIndex: 1 }] },
      { context: createTestContext().context, path: ["staffOverseers", "importRows"] },
    );

    expect(result).toStrictEqual([
      { email: "known@kmutt.ac.th", outcome: "assigned", teamsGroupIndex: 1 },
    ]);
  });
});

describe("staffDiscordLink router", () => {
  it("rejects link without a session", async () => {
    const router = createAppRouter({
      auth: createTestAuthReader(null),
      files: createUnusedFileRepository(),
      staffDiscordLinkService: createFakeStaffDiscordLinkService(),
      teams: createUnusedTeamRepository(),
    });

    await expect(
      call(
        router.staffDiscordLink.link,
        { token: "any" },
        {
          context: createTestContext().context,
          path: ["staffDiscordLink", "link"],
        },
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("links a staff session", async () => {
    const router = createAppRouter({
      auth: createTestAuthReader(createTestSession({ user: { role: "staff" } })),
      files: createUnusedFileRepository(),
      staffDiscordLinkService: createFakeStaffDiscordLinkService(),
      teams: createUnusedTeamRepository(),
    });

    const result = await call(
      router.staffDiscordLink.link,
      { token: "good-token" },
      {
        context: createTestContext().context,
        path: ["staffDiscordLink", "link"],
      },
    );

    expect(result).toStrictEqual({ status: "SUCCESS" });
  });
});
