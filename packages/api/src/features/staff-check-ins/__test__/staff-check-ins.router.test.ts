import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type { AuthReader, StaffCheckInRepository } from "../../../index";
import { createAppRouter } from "../../../index";
import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
  createUnusedStaffDiscordLinkService,
} from "../../../__test__/test-support";

const ACTOR_ID = "staff-1";
const TARGET_STAFF_ID = "staff-2";

function createRepository(overrides: Partial<StaffCheckInRepository> = {}): StaffCheckInRepository {
  return {
    cancel: overrides.cancel ?? (async () => await Promise.resolve(true)),
    checkIn: overrides.checkIn ?? (async () => await Promise.resolve(true)),
    list: overrides.list ?? (async () => await Promise.resolve({ rowCount: 0, rows: [] })),
  };
}

function createRouter(
  repository: StaffCheckInRepository,
  auth: AuthReader = createTestAuthReader(
    createTestSession({ user: { id: ACTOR_ID, role: "registrationStaff" } }),
  ),
) {
  return createAppRouter({
    auth,
    staffCheckIns: repository,
    staffDiscordLinkService: createUnusedStaffDiscordLinkService(),
  }).staffCheckIns;
}

describe("staff check-ins router", () => {
  it("lists staff with controlled table pagination and name/email filters", async () => {
    const input = {
      columnFilters: [
        { id: "email" as const, value: "@kmutt.ac.th" },
        { id: "name" as const, value: "Beam" },
      ],
      pagination: { pageIndex: 1, pageSize: 25 },
      round: "ROUND_1" as const,
      sorting: [{ desc: true, id: "checkedInAt" as const }],
    };
    const list = vi.fn<StaffCheckInRepository["list"]>(
      async () => await Promise.resolve({ rowCount: 0, rows: [] }),
    );
    const router = createRouter(createRepository({ list }));
    const { context } = createTestContext();

    await expect(
      call(router.list, input, { context, path: ["staffCheckIns", "list"] }),
    ).resolves.toStrictEqual({ rowCount: 0, rows: [] });
    expect(list).toHaveBeenCalledWith(input);
  });

  it("applies safe default pagination and sorting when listing staff", async () => {
    const list = vi.fn<StaffCheckInRepository["list"]>(
      async () => await Promise.resolve({ rowCount: 0, rows: [] }),
    );
    const router = createRouter(createRepository({ list }));
    const { context } = createTestContext();

    await expect(
      call(router.list, { round: "ROUND_1" }, { context, path: ["staffCheckIns", "list"] }),
    ).resolves.toStrictEqual({ rowCount: 0, rows: [] });
    expect(list).toHaveBeenCalledWith({
      columnFilters: [],
      pagination: { pageIndex: 0, pageSize: 10 },
      round: "ROUND_1",
      sorting: [{ desc: false, id: "name" }],
    });
  });

  it("records a check-in with the authenticated staff member as approver", async () => {
    const checkIn = vi.fn<StaffCheckInRepository["checkIn"]>(
      async () => await Promise.resolve(true),
    );
    const router = createRouter(createRepository({ checkIn }));
    const { context, log } = createTestContext();

    await expect(
      call(
        router.checkIn,
        { round: "ROUND_1", staffUserId: TARGET_STAFF_ID },
        { context, path: ["staffCheckIns", "checkIn"] },
      ),
    ).resolves.toStrictEqual({ round: "ROUND_1", staffUserId: TARGET_STAFF_ID });
    expect(checkIn).toHaveBeenCalledWith(TARGET_STAFF_ID, ACTOR_ID, "ROUND_1");
    expect(log.audit).toHaveBeenCalledWith({
      action: "staff-check-in.created",
      actor: { id: ACTOR_ID, type: "user" },
      changes: { after: { round: "ROUND_1", status: "checked-in" } },
      outcome: "success",
      target: { id: TARGET_STAFF_ID, type: "staff-check-in" },
    });
  });

  it("cancels a check-in and audits the cancellation", async () => {
    const cancel = vi.fn<StaffCheckInRepository["cancel"]>(async () => await Promise.resolve(true));
    const router = createRouter(createRepository({ cancel }));
    const { context, log } = createTestContext();

    await expect(
      call(
        router.cancel,
        { round: "ROUND_1", staffUserId: TARGET_STAFF_ID },
        { context, path: ["staffCheckIns", "cancel"] },
      ),
    ).resolves.toStrictEqual({ round: "ROUND_1", staffUserId: TARGET_STAFF_ID });
    expect(cancel).toHaveBeenCalledWith(TARGET_STAFF_ID, "ROUND_1");
    expect(log.audit).toHaveBeenCalledWith({
      action: "staff-check-in.cancelled",
      actor: { id: ACTOR_ID, type: "user" },
      changes: { before: { round: "ROUND_1", status: "checked-in" } },
      outcome: "success",
      target: { id: TARGET_STAFF_ID, type: "staff-check-in" },
    });
  });

  it("denies check-ins for users who are not staff", async () => {
    const checkIn = vi.fn<StaffCheckInRepository["checkIn"]>(
      async () => await Promise.resolve(null),
    );
    const router = createRouter(createRepository({ checkIn }));
    const { context, log } = createTestContext();

    await expect(
      call(
        router.checkIn,
        { round: "ROUND_1", staffUserId: "user-2" },
        { context, path: ["staffCheckIns", "checkIn"] },
      ),
    ).rejects.toMatchObject({ code: "STAFF_CHECK_IN_TARGET_NOT_FOUND", status: 404 });
    expect(log.audit).toHaveBeenCalledWith({
      action: "staff-check-in.created",
      actor: { id: ACTOR_ID, type: "user" },
      outcome: "denied",
      reason: "STAFF_CHECK_IN_TARGET_NOT_FOUND",
      target: { id: "user-2", type: "staff-check-in" },
    });
  });

  it("rejects a duplicate check-in and audits the failed attempt", async () => {
    const checkIn = vi.fn<StaffCheckInRepository["checkIn"]>(
      async () => await Promise.resolve(false),
    );
    const router = createRouter(createRepository({ checkIn }));
    const { context, log } = createTestContext();

    await expect(
      call(
        router.checkIn,
        { round: "ROUND_1", staffUserId: TARGET_STAFF_ID },
        { context, path: ["staffCheckIns", "checkIn"] },
      ),
    ).rejects.toMatchObject({ code: "STAFF_ALREADY_CHECKED_IN", status: 409 });
    expect(log.audit).toHaveBeenCalledWith({
      action: "staff-check-in.created",
      actor: { id: ACTOR_ID, type: "user" },
      outcome: "failure",
      reason: "STAFF_ALREADY_CHECKED_IN",
      target: { id: TARGET_STAFF_ID, type: "staff-check-in" },
    });
  });

  it("rejects staff without staff check-in access", async () => {
    const checkIn = vi.fn<StaffCheckInRepository["checkIn"]>();
    const router = createRouter(
      createRepository({ checkIn }),
      createTestAuthReader(createTestSession({ user: { id: "staff-1", role: "staff" } })),
    );
    const { context } = createTestContext();

    await expect(
      call(
        router.checkIn,
        { round: "ROUND_1", staffUserId: TARGET_STAFF_ID },
        { context, path: ["staffCheckIns", "checkIn"] },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(checkIn).not.toHaveBeenCalled();
  });

  it("checks a staff member into round 2 independently of an existing round 1 check-in", async () => {
    const checkInsByRound = new Map([["ROUND_1", TARGET_STAFF_ID]]);
    const checkIn = vi.fn<StaffCheckInRepository["checkIn"]>(async (userId, _actor, round) => {
      if (checkInsByRound.get(round) === userId) {
        return await Promise.resolve(false);
      }
      checkInsByRound.set(round, userId);
      return await Promise.resolve(true);
    });
    const router = createRouter(createRepository({ checkIn }));
    const { context } = createTestContext();

    await expect(
      call(
        router.checkIn,
        { round: "ROUND_2", staffUserId: TARGET_STAFF_ID },
        { context, path: ["staffCheckIns", "checkIn"] },
      ),
    ).resolves.toStrictEqual({ round: "ROUND_2", staffUserId: TARGET_STAFF_ID });
    expect(checkIn).toHaveBeenCalledWith(TARGET_STAFF_ID, ACTOR_ID, "ROUND_2");
  });

  it("cancelling a round 2 check-in does not affect a round 1 record", async () => {
    const checkedInRounds = new Set(["ROUND_1", "ROUND_2"]);
    const cancel = vi.fn<StaffCheckInRepository["cancel"]>(
      async (_userId, round) => await Promise.resolve(checkedInRounds.delete(round)),
    );
    const router = createRouter(createRepository({ cancel }));
    const { context } = createTestContext();

    await expect(
      call(
        router.cancel,
        { round: "ROUND_2", staffUserId: TARGET_STAFF_ID },
        { context, path: ["staffCheckIns", "cancel"] },
      ),
    ).resolves.toStrictEqual({ round: "ROUND_2", staffUserId: TARGET_STAFF_ID });
    expect(cancel).toHaveBeenCalledWith(TARGET_STAFF_ID, "ROUND_2");
    expect(checkedInRounds.has("ROUND_1")).toBeTruthy();
  });
});
