import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type { AuthReader, ParticipantCheckInRepository } from "../../../index";
import { createAppRouter } from "../../../index";
import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
  createUnusedStaffDiscordLinkService,
} from "../../../__test__/test-support";

const ACTOR_ID = "staff-1";
const TARGET_PARTICIPANT_ID = "11111111-1111-4111-8111-111111111111";

function createRepository(
  overrides: Partial<ParticipantCheckInRepository> = {},
): ParticipantCheckInRepository {
  return {
    cancel: overrides.cancel ?? (async () => await Promise.resolve(true)),
    cancelTeam: overrides.cancelTeam ?? (async () => await Promise.resolve(true)),
    checkIn: overrides.checkIn ?? (async () => await Promise.resolve("CREATED")),
    list: overrides.list ?? (async () => await Promise.resolve({ rowCount: 0, rows: [] })),
    registerTeam: overrides.registerTeam ?? (async () => await Promise.resolve("CREATED")),
    updateFlag: overrides.updateFlag ?? (async () => await Promise.resolve(true)),
  };
}

function createRouter(
  repository: ParticipantCheckInRepository,
  auth: AuthReader = createTestAuthReader(
    createTestSession({ user: { id: ACTOR_ID, role: "staff" } }),
  ),
) {
  return createAppRouter({
    auth,
    participantCheckIns: repository,
    staffDiscordLinkService: createUnusedStaffDiscordLinkService(),
  }).participantCheckIns;
}

describe("participant check-ins router", () => {
  it("registers and cancels a team in round two with round-specific audit changes", async () => {
    const registerTeam = vi
      .fn<ParticipantCheckInRepository["registerTeam"]>()
      .mockResolvedValue("CREATED");
    const cancelTeam = vi.fn<ParticipantCheckInRepository["cancelTeam"]>().mockResolvedValue(true);
    const router = createRouter(createRepository({ cancelTeam, registerTeam }));
    const { context, log } = createTestContext();
    const input = { round: "ROUND_2" as const, teamId: TARGET_PARTICIPANT_ID };
    await expect(call(router.registerTeam, input, { context })).resolves.toStrictEqual(input);
    expect(registerTeam).toHaveBeenCalledWith(TARGET_PARTICIPANT_ID, ACTOR_ID, "ROUND_2");
    expect(log.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "team-check-in.created",
        changes: {
          after: { award: "ROUND_2_PARTICIPATED", round: "ROUND_2", status: "checked-in" },
        },
      }),
    );
    await call(router.cancelTeam, input, { context });
    expect(cancelTeam).toHaveBeenCalledWith(TARGET_PARTICIPANT_ID, "ROUND_2");
    expect(log.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "team-check-in.cancelled",
        changes: {
          after: { round: "ROUND_2", status: "not-checked-in" },
          before: { round: "ROUND_2", status: "checked-in" },
        },
      }),
    );
  });

  it("requires a valid team identifier for round two check-in", async () => {
    const registerTeam = vi
      .fn<ParticipantCheckInRepository["registerTeam"]>()
      .mockResolvedValue("CREATED");
    const router = createRouter(createRepository({ registerTeam }));
    const { context } = createTestContext();
    await expect(
      call(
        router.registerTeam,
        { round: "ROUND_2", teamId: "invalid-team" },
        {
          context,
        },
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(registerTeam).not.toHaveBeenCalled();
  });

  it("denies round two team check-in without registration access", async () => {
    const registerTeam = vi
      .fn<ParticipantCheckInRepository["registerTeam"]>()
      .mockResolvedValue("CREATED");
    const router = createRouter(
      createRepository({ registerTeam }),
      createTestAuthReader(createTestSession({ user: { id: ACTOR_ID, role: "user" } })),
    );
    const { context } = createTestContext();
    await expect(
      call(router.registerTeam, { round: "ROUND_2", teamId: TARGET_PARTICIPANT_ID }, { context }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(registerTeam).not.toHaveBeenCalled();
  });

  it("audits a failed round two team registration", async () => {
    const router = createRouter(
      createRepository({
        registerTeam: vi
          .fn<ParticipantCheckInRepository["registerTeam"]>()
          .mockRejectedValue(new Error("Repository unavailable")),
      }),
    );
    const { context, log } = createTestContext();
    await expect(
      call(router.registerTeam, { round: "ROUND_2", teamId: TARGET_PARTICIPANT_ID }, { context }),
    ).rejects.toThrow("Repository unavailable");
    expect(log.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "team-check-in.created", outcome: "failure" }),
    );
  });

  it.each([
    ["ROUND_1", "registered"],
    ["ROUND_1", "unregistered"],
    ["ROUND_2", "registered"],
    ["ROUND_2", "unregistered"],
  ] as const)("combines team search with %s %s status", async (round, status) => {
    const list = vi
      .fn<ParticipantCheckInRepository["list"]>()
      .mockResolvedValue({ rowCount: 0, rows: [] });
    const router = createRouter(createRepository({ list }));
    const { context } = createTestContext();
    const columnFilters = [
      { id: "team" as const, value: "Alpha" },
      { id: "teamCheckIn" as const, value: status },
    ];
    await call(router.list, { columnFilters, round }, { context });
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ columnFilters, round }));
  });

  it("lists matching teams with controlled table pagination and team search", async () => {
    const input = {
      columnFilters: [{ id: "team" as const, value: "BangMod" }],
      pagination: { pageIndex: 1, pageSize: 25 },
      round: "ROUND_1" as const,
      sorting: [{ desc: true, id: "checkedInAt" as const }],
    };
    const list = vi.fn<ParticipantCheckInRepository["list"]>(
      async () => await Promise.resolve({ rowCount: 0, rows: [] }),
    );
    const router = createRouter(createRepository({ list }));
    const { context } = createTestContext();

    await expect(
      call(router.list, input, { context, path: ["participantCheckIns", "list"] }),
    ).resolves.toStrictEqual({ rowCount: 0, rows: [] });
    expect(list).toHaveBeenCalledWith(input);
  });

  it("applies safe default pagination and sorting when listing participants", async () => {
    const list = vi.fn<ParticipantCheckInRepository["list"]>(
      async () => await Promise.resolve({ rowCount: 0, rows: [] }),
    );
    const router = createRouter(createRepository({ list }));
    const { context } = createTestContext();

    await expect(
      call(router.list, { round: "ROUND_1" }, { context, path: ["participantCheckIns", "list"] }),
    ).resolves.toStrictEqual({ rowCount: 0, rows: [] });
    expect(list).toHaveBeenCalledWith({
      columnFilters: [],
      pagination: { pageIndex: 0, pageSize: 10 },
      round: "ROUND_1",
      sorting: [{ desc: false, id: "name" }],
    });
  });

  it("records a check-in with the authenticated staff member as approver", async () => {
    const checkIn = vi.fn<ParticipantCheckInRepository["checkIn"]>(
      async () => await Promise.resolve("CREATED"),
    );
    const router = createRouter(createRepository({ checkIn }));
    const { context, log } = createTestContext();

    await expect(
      call(
        router.checkIn,
        { participantId: TARGET_PARTICIPANT_ID, round: "ROUND_1" },
        { context, path: ["participantCheckIns", "checkIn"] },
      ),
    ).resolves.toStrictEqual({ participantId: TARGET_PARTICIPANT_ID, round: "ROUND_1" });
    expect(checkIn).toHaveBeenCalledWith(TARGET_PARTICIPANT_ID, ACTOR_ID, "ROUND_1");
    expect(log.audit).toHaveBeenCalledWith({
      action: "participant-check-in.created",
      actor: { id: ACTOR_ID, type: "user" },
      changes: { after: { round: "ROUND_1", status: "checked-in" } },
      outcome: "success",
      target: { id: TARGET_PARTICIPANT_ID, type: "participant-check-in" },
    });
  });

  it("denies check-ins for a target that does not exist", async () => {
    const checkIn = vi.fn<ParticipantCheckInRepository["checkIn"]>(
      async () => await Promise.resolve("TARGET_NOT_FOUND"),
    );
    const router = createRouter(createRepository({ checkIn }));
    const { context, log } = createTestContext();

    await expect(
      call(
        router.checkIn,
        { participantId: TARGET_PARTICIPANT_ID, round: "ROUND_1" },
        { context, path: ["participantCheckIns", "checkIn"] },
      ),
    ).rejects.toMatchObject({ code: "PARTICIPANT_CHECK_IN_TARGET_NOT_FOUND", status: 404 });
    expect(log.audit).toHaveBeenCalledWith({
      action: "participant-check-in.created",
      actor: { id: ACTOR_ID, type: "user" },
      outcome: "denied",
      reason: "PARTICIPANT_CHECK_IN_TARGET_NOT_FOUND",
      target: { id: TARGET_PARTICIPANT_ID, type: "participant-check-in" },
    });
  });

  it("rejects a duplicate check-in and audits the failed attempt", async () => {
    const checkIn = vi.fn<ParticipantCheckInRepository["checkIn"]>(
      async () => await Promise.resolve("ALREADY_CHECKED_IN"),
    );
    const router = createRouter(createRepository({ checkIn }));
    const { context, log } = createTestContext();

    await expect(
      call(
        router.checkIn,
        { participantId: TARGET_PARTICIPANT_ID, round: "ROUND_1" },
        { context, path: ["participantCheckIns", "checkIn"] },
      ),
    ).rejects.toMatchObject({ code: "PARTICIPANT_ALREADY_CHECKED_IN", status: 409 });
    expect(log.audit).toHaveBeenCalledWith({
      action: "participant-check-in.created",
      actor: { id: ACTOR_ID, type: "user" },
      outcome: "failure",
      reason: "PARTICIPANT_ALREADY_CHECKED_IN",
      target: { id: TARGET_PARTICIPANT_ID, type: "participant-check-in" },
    });
  });

  it("cancels a check-in and audits the cancellation", async () => {
    const cancel = vi.fn<ParticipantCheckInRepository["cancel"]>(
      async () => await Promise.resolve(true),
    );
    const router = createRouter(createRepository({ cancel }));
    const { context, log } = createTestContext();

    await expect(
      call(
        router.cancel,
        { participantId: TARGET_PARTICIPANT_ID, round: "ROUND_1" },
        { context, path: ["participantCheckIns", "cancel"] },
      ),
    ).resolves.toStrictEqual({ participantId: TARGET_PARTICIPANT_ID, round: "ROUND_1" });
    expect(cancel).toHaveBeenCalledWith(TARGET_PARTICIPANT_ID, "ROUND_1");
    expect(log.audit).toHaveBeenCalledWith({
      action: "participant-check-in.cancelled",
      actor: { id: ACTOR_ID, type: "user" },
      changes: { before: { round: "ROUND_1", status: "checked-in" } },
      outcome: "success",
      target: { id: TARGET_PARTICIPANT_ID, type: "participant-check-in" },
    });
  });

  it("denies cancelling a check-in that does not exist", async () => {
    const cancel = vi.fn<ParticipantCheckInRepository["cancel"]>(
      async () => await Promise.resolve(false),
    );
    const router = createRouter(createRepository({ cancel }));
    const { context, log } = createTestContext();

    await expect(
      call(
        router.cancel,
        { participantId: TARGET_PARTICIPANT_ID, round: "ROUND_1" },
        { context, path: ["participantCheckIns", "cancel"] },
      ),
    ).rejects.toMatchObject({ code: "PARTICIPANT_CHECK_IN_NOT_FOUND", status: 404 });
    expect(log.audit).toHaveBeenCalledWith({
      action: "participant-check-in.cancelled",
      actor: { id: ACTOR_ID, type: "user" },
      outcome: "denied",
      reason: "PARTICIPANT_CHECK_IN_NOT_FOUND",
      target: { id: TARGET_PARTICIPANT_ID, type: "participant-check-in" },
    });
  });

  it("updates a check-in flag and audits the change", async () => {
    const updateFlag = vi.fn<ParticipantCheckInRepository["updateFlag"]>(
      async () => await Promise.resolve(true),
    );
    const router = createRouter(createRepository({ updateFlag }));
    const { context, log } = createTestContext();

    await expect(
      call(
        router.updateFlag,
        { flag: "feeling_unwell", participantId: TARGET_PARTICIPANT_ID, round: "ROUND_1" },
        { context, path: ["participantCheckIns", "updateFlag"] },
      ),
    ).resolves.toStrictEqual({
      flag: "feeling_unwell",
      participantId: TARGET_PARTICIPANT_ID,
      round: "ROUND_1",
    });
    expect(updateFlag).toHaveBeenCalledWith(TARGET_PARTICIPANT_ID, "feeling_unwell", "ROUND_1");
    expect(log.audit).toHaveBeenCalledWith({
      action: "participant-check-in.flag.changed",
      actor: { id: ACTOR_ID, type: "user" },
      changes: { after: { flag: "feeling_unwell", round: "ROUND_1" } },
      outcome: "success",
      target: { id: TARGET_PARTICIPANT_ID, type: "participant-check-in" },
    });
  });

  it("denies updating a flag for a check-in that does not exist", async () => {
    const updateFlag = vi.fn<ParticipantCheckInRepository["updateFlag"]>(
      async () => await Promise.resolve(false),
    );
    const router = createRouter(createRepository({ updateFlag }));
    const { context, log } = createTestContext();

    await expect(
      call(
        router.updateFlag,
        { flag: null, participantId: TARGET_PARTICIPANT_ID, round: "ROUND_1" },
        { context, path: ["participantCheckIns", "updateFlag"] },
      ),
    ).rejects.toMatchObject({ code: "PARTICIPANT_CHECK_IN_NOT_FOUND", status: 404 });
    expect(log.audit).toHaveBeenCalledWith({
      action: "participant-check-in.flag.changed",
      actor: { id: ACTOR_ID, type: "user" },
      outcome: "denied",
      reason: "PARTICIPANT_CHECK_IN_NOT_FOUND",
      target: { id: TARGET_PARTICIPANT_ID, type: "participant-check-in" },
    });
  });

  it("rejects users without registration access", async () => {
    const checkIn = vi.fn<ParticipantCheckInRepository["checkIn"]>();
    const router = createRouter(
      createRepository({ checkIn }),
      createTestAuthReader(createTestSession({ user: { id: ACTOR_ID, role: "user" } })),
    );
    const { context } = createTestContext();

    await expect(
      call(
        router.checkIn,
        { participantId: TARGET_PARTICIPANT_ID, round: "ROUND_1" },
        { context, path: ["participantCheckIns", "checkIn"] },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(checkIn).not.toHaveBeenCalled();
  });

  it("checks a participant into round 2 independently of an existing round 1 check-in", async () => {
    const checkInsByRound = new Map([["ROUND_1", TARGET_PARTICIPANT_ID]]);
    const checkIn = vi.fn<ParticipantCheckInRepository["checkIn"]>(
      async (participantId, _actor, round) => {
        if (checkInsByRound.get(round) === participantId) {
          return await Promise.resolve("ALREADY_CHECKED_IN");
        }
        checkInsByRound.set(round, participantId);
        return await Promise.resolve("CREATED");
      },
    );
    const router = createRouter(createRepository({ checkIn }));
    const { context } = createTestContext();

    await expect(
      call(
        router.checkIn,
        { participantId: TARGET_PARTICIPANT_ID, round: "ROUND_2" },
        { context, path: ["participantCheckIns", "checkIn"] },
      ),
    ).resolves.toStrictEqual({ participantId: TARGET_PARTICIPANT_ID, round: "ROUND_2" });
    expect(checkIn).toHaveBeenCalledWith(TARGET_PARTICIPANT_ID, ACTOR_ID, "ROUND_2");
  });

  it("rejects a round 2 check-in for a team that did not qualify", async () => {
    const checkIn = vi.fn<ParticipantCheckInRepository["checkIn"]>(
      async () => await Promise.resolve("NOT_ELIGIBLE"),
    );
    const router = createRouter(createRepository({ checkIn }));
    const { context, log } = createTestContext();

    await expect(
      call(
        router.checkIn,
        { participantId: TARGET_PARTICIPANT_ID, round: "ROUND_2" },
        { context, path: ["participantCheckIns", "checkIn"] },
      ),
    ).rejects.toMatchObject({ code: "PARTICIPANT_NOT_ROUND_ELIGIBLE", status: 409 });
    expect(log.audit).toHaveBeenCalledWith({
      action: "participant-check-in.created",
      actor: { id: ACTOR_ID, type: "user" },
      outcome: "failure",
      reason: "PARTICIPANT_NOT_ROUND_ELIGIBLE",
      target: { id: TARGET_PARTICIPANT_ID, type: "participant-check-in" },
    });
  });
});
