import { describe, expect, it } from "vitest";

import { createStaffOverseersService } from "../staff-overseers.service";
import type {
  StaffOverseerBacklogRecord,
  StaffOverseerGroupLookup,
  StaffOverseersRepository,
} from "../staff-overseers.repository";

function createFakeRepository(overrides: Partial<StaffOverseersRepository> = {}): {
  assignments: { groupId: string; userId: string }[];
  backlogEntries: StaffOverseerBacklogRecord[];
  repository: StaffOverseersRepository;
} {
  const assignments: { groupId: string; userId: string }[] = [];
  const backlogEntries: StaffOverseerBacklogRecord[] = [];

  const groups = new Map<number, StaffOverseerGroupLookup>([
    [1, { id: "group-1", index: 1, name: "หมวดที่ 1" }],
    [2, { id: "group-2", index: 2, name: "หมวดที่ 2" }],
  ]);
  const usersByEmail = new Map<string, { id: string; name: string }>([
    ["overseer@kmutt.ac.th", { id: "user-1", name: "Somchai Test" }],
  ]);

  const repository: StaffOverseersRepository = {
    addBacklogEntry: async (email, groupId) => {
      backlogEntries.push({
        createdAt: new Date(),
        email,
        groupId,
        groupIndex: [...groups.values()].find((group) => group.id === groupId)?.index ?? 0,
        groupName: [...groups.values()].find((group) => group.id === groupId)?.name ?? "",
        id: `backlog-${backlogEntries.length + 1}`,
      });
      await Promise.resolve();
    },
    assignOverseer: async (groupId, userId) => {
      assignments.push({ groupId, userId });
      await Promise.resolve();
    },
    findBacklogEntry: async (id) => backlogEntries.find((entry) => entry.id === id) ?? null,
    findGroupByIndex: async (index) => groups.get(index) ?? null,
    findUserByEmail: async (email) => usersByEmail.get(email) ?? null,
    listBacklog: async () => backlogEntries,
    listOverseers: async () => [],
    removeBacklogEntry: async (id) => {
      const index = backlogEntries.findIndex((entry) => entry.id === id);
      if (index !== -1) {
        backlogEntries.splice(index, 1);
      }
      await Promise.resolve();
    },
    ...overrides,
  };

  return { assignments, backlogEntries, repository };
}

describe(createStaffOverseersService, () => {
  it("assigns the overseer directly when the user already exists", async () => {
    const { assignments, repository } = createFakeRepository();
    const service = createStaffOverseersService(repository);

    const result = await service.importRows([
      { email: "overseer@kmutt.ac.th", teamsGroupIndex: 1 },
    ]);

    expect(result).toStrictEqual([
      { email: "overseer@kmutt.ac.th", outcome: "assigned", teamsGroupIndex: 1 },
    ]);
    expect(assignments).toStrictEqual([{ groupId: "group-1", userId: "user-1" }]);
  });

  it("backlogs a row whose email has no matching user yet", async () => {
    const { backlogEntries, repository } = createFakeRepository();
    const service = createStaffOverseersService(repository);

    const result = await service.importRows([
      { email: "unknown@kmutt.ac.th", teamsGroupIndex: 1 },
    ]);

    expect(result).toStrictEqual([
      { email: "unknown@kmutt.ac.th", outcome: "backlogged", teamsGroupIndex: 1 },
    ]);
    expect(backlogEntries).toHaveLength(1);
    expect(backlogEntries[0]?.groupId).toBe("group-1");
  });

  it("errors a row whose group index does not exist, without backlogging it", async () => {
    const { backlogEntries, repository } = createFakeRepository();
    const service = createStaffOverseersService(repository);

    const result = await service.importRows([
      { email: "overseer@kmutt.ac.th", teamsGroupIndex: 99 },
    ]);

    expect(result).toStrictEqual([
      {
        email: "overseer@kmutt.ac.th",
        error: "No team group with index 99",
        outcome: "error",
        teamsGroupIndex: 99,
      },
    ]);
    expect(backlogEntries).toStrictEqual([]);
  });

  it("retries a backlog entry successfully once the user exists", async () => {
    const { assignments, backlogEntries, repository } = createFakeRepository();
    backlogEntries.push({
      createdAt: new Date(),
      email: "overseer@kmutt.ac.th",
      groupId: "group-2",
      groupIndex: 2,
      groupName: "หมวดที่ 2",
      id: "backlog-1",
    });
    const service = createStaffOverseersService(repository);

    const result = await service.retryBacklogEntry("backlog-1");

    expect(result).toStrictEqual({ outcome: "assigned" });
    expect(assignments).toStrictEqual([{ groupId: "group-2", userId: "user-1" }]);
    expect(backlogEntries).toStrictEqual([]);
  });

  it("leaves a backlog entry alone when the user still does not exist", async () => {
    const { backlogEntries, repository } = createFakeRepository();
    backlogEntries.push({
      createdAt: new Date(),
      email: "still-unknown@kmutt.ac.th",
      groupId: "group-1",
      groupIndex: 1,
      groupName: "หมวดที่ 1",
      id: "backlog-1",
    });
    const service = createStaffOverseersService(repository);

    const result = await service.retryBacklogEntry("backlog-1");

    expect(result).toStrictEqual({ outcome: "still_backlogged" });
    expect(backlogEntries).toHaveLength(1);
  });
});
