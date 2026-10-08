import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";
import { createAppRouter } from "../../../index";
import type { Round2ConfirmationRepository } from "../../../index";
import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
  createUnusedStaffDiscordLinkService,
} from "../../../__test__/test-support";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const PARTICIPANT_ID = "22222222-2222-4222-8222-222222222222";
const confirmedAt = new Date("2026-10-02T03:04:05.000Z");
const rows = [
  {
    confirmedAt,
    participants: [
      {
        hasIdentityDocument: true,
        hasStudentIdDocument: true,
        id: PARTICIPANT_ID,
        index: 1,
        name: "สมชาย ใจดี",
      },
    ],
    state: "CONFIRMED" as const,
    team: {
      award: "ADVANCED_TO_ROUND_2" as const,
      id: TEAM_ID,
      index: 42,
      memberCount: 1,
      name: "Team Example",
    },
  },
];

function createRouter(role = "registrationStaff") {
  const list = vi.fn<Round2ConfirmationRepository["list"]>(
    async () => await Promise.resolve({ rowCount: rows.length, rows }),
  );
  const router = createAppRouter({
    auth: createTestAuthReader(createTestSession({ user: { id: "staff-1", role } })),
    round2Confirmation: {
      findDocument: async () => await Promise.resolve(null),
      findFacts: async () => await Promise.resolve(null),
      list,
      replaceDocument: async () => await Promise.reject(new Error("Unexpected document replace")),
      submit: async () => await Promise.reject(new Error("Unexpected confirmation")),
    },
    staffDiscordLinkService: createUnusedStaffDiscordLinkService(),
  }).round2Confirmation;
  return { list, router };
}

describe("round 2 confirmation list router", () => {
  it("returns confirmation rows to registration staff with default table input", async () => {
    const { list, router } = createRouter();
    const { context } = createTestContext();

    await expect(
      call(router.list, {}, { context, path: ["round2Confirmation", "list"] }),
    ).resolves.toStrictEqual({ rowCount: 1, rows });
    expect(list).toHaveBeenCalledWith({
      columnFilters: [],
      pagination: { pageIndex: 0, pageSize: 10 },
      sorting: [{ desc: false, id: "teamCode" }],
    });
  });

  it("rejects users without registration access", async () => {
    const { list, router } = createRouter("staff");
    const { context } = createTestContext();

    await expect(
      call(router.list, {}, { context, path: ["round2Confirmation", "list"] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(list).not.toHaveBeenCalled();
  });

  it("rejects invalid page sizes", async () => {
    const { router } = createRouter();
    const { context } = createTestContext();

    await expect(
      call(
        router.list,
        { pagination: { pageIndex: 0, pageSize: 0 } },
        { context, path: ["round2Confirmation", "list"] },
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
