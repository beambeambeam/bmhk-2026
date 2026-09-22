import { describe, expect, it } from "vitest";

import type { DiscordTeamGroupsRepository } from "../discord-team-groups.repository";
import {
  createDiscordTeamGroupsService,
  defaultGroupName,
  distributeTeamIds,
} from "../discord-team-groups.service";

function createFakeRepository(
  overrides: Partial<DiscordTeamGroupsRepository> = {},
): DiscordTeamGroupsRepository {
  return {
    clearCategoryId: async () => await Promise.resolve(true),
    clearMemberChannelId: async () => await Promise.resolve(true),
    list: async () => await Promise.resolve([]),
    listTeamsWithGroup: async () => await Promise.resolve([]),
    replaceAssignment: async () => {
      await Promise.resolve();
    },
    setCategoryId: async () => await Promise.resolve(true),
    setMemberChannelId: async () => await Promise.resolve(true),
    ...overrides,
  };
}

describe(createDiscordTeamGroupsService, () => {
  it("maps repository records to snake_case wire records", async () => {
    const repository = createFakeRepository({
      list: async () =>
        await Promise.resolve([
          {
            categoryId: "cat-1",
            hasOverseer: true,
            id: "group-1",
            index: 1,
            members: [
              {
                channelId: null,
                id: "member-1",
                team: { id: "team-1", index: 1, name: "แก๊งน้องห่าน" },
              },
            ],
            name: "หมวดที่ 1",
          },
        ]),
    });
    const service = createDiscordTeamGroupsService(repository);

    const result = await service.list();

    expect(result).toStrictEqual([
      {
        category_id: "cat-1",
        has_overseer: true,
        id: "group-1",
        index: 1,
        members: [
          {
            channel_id: null,
            id: "member-1",
            team: { id: "team-1", index: 1, name: "แก๊งน้องห่าน" },
          },
        ],
        name: "หมวดที่ 1",
      },
    ]);
  });

  it("delegates category id recording to the repository", async () => {
    let recordedArgs: [string, string] | null = null;
    const repository = createFakeRepository({
      setCategoryId: async (groupId, categoryId) => {
        recordedArgs = [groupId, categoryId];
        return await Promise.resolve(true);
      },
    });
    const service = createDiscordTeamGroupsService(repository);

    const updated = await service.recordCategoryId("group-1", "cat-1");

    expect(updated).toBeTruthy();
    expect(recordedArgs).toStrictEqual(["group-1", "cat-1"]);
  });

  it("delegates channel id recording to the repository", async () => {
    let recordedArgs: [string, string] | null = null;
    const repository = createFakeRepository({
      setMemberChannelId: async (memberId, channelId) => {
        recordedArgs = [memberId, channelId];
        return await Promise.resolve(true);
      },
    });
    const service = createDiscordTeamGroupsService(repository);

    const updated = await service.recordChannelId("member-1", "channel-1");

    expect(updated).toBeTruthy();
    expect(recordedArgs).toStrictEqual(["member-1", "channel-1"]);
  });

  it("returns false when the repository reports no matching row", async () => {
    const repository = createFakeRepository({
      setCategoryId: async () => await Promise.resolve(false),
    });
    const service = createDiscordTeamGroupsService(repository);

    const updated = await service.recordCategoryId("missing-group", "cat-1");

    expect(updated).toBeFalsy();
  });

  it("maps teams-with-group repository records to the wire response", async () => {
    const repository = createFakeRepository({
      listTeamsWithGroup: async () =>
        await Promise.resolve([
          {
            group: { id: "group-1", index: 1, name: "หมวดที่ 1" },
            id: "team-1",
            index: 1,
            name: "แก๊งน้องห่าน",
            school: "KMUTT",
          },
          { group: null, id: "team-2", index: 2, name: "ทีมสอง", school: "CU" },
        ]),
    });
    const service = createDiscordTeamGroupsService(repository);

    const result = await service.listTeamsWithGroup();

    expect(result).toStrictEqual([
      {
        group: { id: "group-1", index: 1, name: "หมวดที่ 1" },
        id: "team-1",
        index: 1,
        name: "แก๊งน้องห่าน",
        school: "KMUTT",
      },
      { group: null, id: "team-2", index: 2, name: "ทีมสอง", school: "CU" },
    ]);
  });

  it("delegates category clearing to the repository", async () => {
    let clearedGroupId: string | null = null;
    const repository = createFakeRepository({
      clearCategoryId: async (groupId) => {
        clearedGroupId = groupId;
        return await Promise.resolve(true);
      },
    });
    const service = createDiscordTeamGroupsService(repository);

    const updated = await service.clearCategoryId("group-1");

    expect(updated).toBeTruthy();
    expect(clearedGroupId).toBe("group-1");
  });

  it("delegates channel clearing to the repository", async () => {
    let clearedMemberId: string | null = null;
    const repository = createFakeRepository({
      clearMemberChannelId: async (memberId) => {
        clearedMemberId = memberId;
        return await Promise.resolve(true);
      },
    });
    const service = createDiscordTeamGroupsService(repository);

    const updated = await service.clearChannelId("member-1");

    expect(updated).toBeTruthy();
    expect(clearedMemberId).toBe("member-1");
  });

  it("distributes teams by index evenly across one group per staff member and replaces the assignment", async () => {
    let replacedGroups: unknown = null;
    const repository = createFakeRepository({
      listTeamsWithGroup: async () =>
        await Promise.resolve([
          { group: null, id: "team-1", index: 1, name: "A", school: "S" },
          { group: null, id: "team-2", index: 2, name: "B", school: "S" },
          { group: null, id: "team-3", index: 3, name: "C", school: "S" },
        ]),
      replaceAssignment: async (groups) => {
        replacedGroups = groups;
        await Promise.resolve();
      },
    });
    const service = createDiscordTeamGroupsService(repository);

    const result = await service.assignGroups({ staffAmount: 2 });

    expect(result).toStrictEqual({
      groupCount: 2,
      groups: [
        {
          name: "หมวดที่ 1",
          teams: [
            { id: "team-1", index: 1, name: "A", school: "S" },
            { id: "team-2", index: 2, name: "B", school: "S" },
          ],
        },
        { name: "หมวดที่ 2", teams: [{ id: "team-3", index: 3, name: "C", school: "S" }] },
      ],
    });
    expect(replacedGroups).toStrictEqual([
      { name: "หมวดที่ 1", teamIds: ["team-1", "team-2"] },
      { name: "หมวดที่ 2", teamIds: ["team-3"] },
    ]);
  });

  it("caps the group count at the team count when staff amount exceeds it", async () => {
    let replacedGroups: unknown = null;
    const repository = createFakeRepository({
      listTeamsWithGroup: async () =>
        await Promise.resolve([
          { group: null, id: "team-1", index: 1, name: "A", school: "S" },
          { group: null, id: "team-2", index: 2, name: "B", school: "S" },
        ]),
      replaceAssignment: async (groups) => {
        replacedGroups = groups;
        await Promise.resolve();
      },
    });
    const service = createDiscordTeamGroupsService(repository);

    const result = await service.assignGroups({ staffAmount: 5 });

    expect(result).toStrictEqual({
      groupCount: 2,
      groups: [
        { name: "หมวดที่ 1", teams: [{ id: "team-1", index: 1, name: "A", school: "S" }] },
        { name: "หมวดที่ 2", teams: [{ id: "team-2", index: 2, name: "B", school: "S" }] },
      ],
    });
    expect(replacedGroups).toStrictEqual([
      { name: "หมวดที่ 1", teamIds: ["team-1"] },
      { name: "หมวดที่ 2", teamIds: ["team-2"] },
    ]);
  });

  it("does not persist an assignment on a dry run, but still returns the full breakdown", async () => {
    let replaceAssignmentCalled = false;
    const repository = createFakeRepository({
      listTeamsWithGroup: async () =>
        await Promise.resolve([
          { group: null, id: "team-1", index: 1, name: "A", school: "S" },
          { group: null, id: "team-2", index: 2, name: "B", school: "S" },
        ]),
      replaceAssignment: async () => {
        replaceAssignmentCalled = true;
        await Promise.resolve();
      },
    });
    const service = createDiscordTeamGroupsService(repository);

    const result = await service.assignGroups({ dryRun: true, staffAmount: 2 });

    expect(result).toStrictEqual({
      groupCount: 2,
      groups: [
        { name: "หมวดที่ 1", teams: [{ id: "team-1", index: 1, name: "A", school: "S" }] },
        { name: "หมวดที่ 2", teams: [{ id: "team-2", index: 2, name: "B", school: "S" }] },
      ],
    });
    expect(replaceAssignmentCalled).toBeFalsy();
  });
});

describe(distributeTeamIds, () => {
  it("splits ids into staffAmount groups as evenly as possible, extra teams in the earliest groups", () => {
    expect(distributeTeamIds(["a", "b", "c", "d", "e"], 2)).toStrictEqual([
      ["a", "b", "c"],
      ["d", "e"],
    ]);
  });

  it("caps the group count at the team count instead of creating empty groups", () => {
    expect(distributeTeamIds(["a", "b", "c"], 5)).toStrictEqual([["a"], ["b"], ["c"]]);
  });

  it("returns an empty array for an empty input", () => {
    expect(distributeTeamIds([], 3)).toStrictEqual([]);
  });
});

describe(defaultGroupName, () => {
  it("formats the Thai group name with the given index", () => {
    expect(defaultGroupName(3)).toBe("หมวดที่ 3");
  });
});
