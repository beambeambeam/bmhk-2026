import { describe, expect, it } from "vitest";

import type { DiscordTeamGroupsRepository } from "../discord-team-groups.repository";
import { createDiscordTeamGroupsService } from "../discord-team-groups.service";

function createFakeRepository(
  overrides: Partial<DiscordTeamGroupsRepository> = {},
): DiscordTeamGroupsRepository {
  return {
    list: async () => await Promise.resolve([]),
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
});
