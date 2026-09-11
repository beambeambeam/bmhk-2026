import { describe, expect, it } from "vitest";

import {
  createMissingChannels,
  groupCategoryName,
  groupsMissingOverseer,
  teamChannelName,
} from "../interactions/commands/create-teams-channel";
import type { ChannelCreationPorts } from "../interactions/commands/create-teams-channel";
import type { TeamGroup, TeamGroupMember } from "../services/team-groups-api";

function createGroup(overrides: Partial<TeamGroup> = {}): TeamGroup {
  return {
    category_id: null,
    has_overseer: true,
    id: "group-1",
    index: 1,
    members: [],
    name: "หมวดที่ 1",
    ...overrides,
  };
}

function createMember(overrides: Partial<TeamGroupMember> = {}): TeamGroupMember {
  return {
    channel_id: null,
    id: "member-1",
    team: { id: "team-1", index: 1, name: "แก๊งน้องห่าน" },
    ...overrides,
  };
}

interface FakePorts extends ChannelCreationPorts {
  createdCategoryNames: string[];
  createdVoiceChannels: { name: string; parentId: string }[];
  recordedGroupCategories: { categoryId: string; groupId: string }[];
  recordedMemberChannels: { channelId: string; memberId: string }[];
}

function createFakePorts(): FakePorts {
  const createdCategoryNames: string[] = [];
  const createdVoiceChannels: { name: string; parentId: string }[] = [];
  const recordedGroupCategories: { categoryId: string; groupId: string }[] = [];
  const recordedMemberChannels: { channelId: string; memberId: string }[] = [];

  let nextCategoryId = 0;
  let nextChannelId = 0;

  return {
    createCategory: async (name) => {
      createdCategoryNames.push(name);
      nextCategoryId += 1;
      return await Promise.resolve({ id: `category-${nextCategoryId}` });
    },
    createVoiceChannel: async (name, parentId) => {
      createdVoiceChannels.push({ name, parentId });
      nextChannelId += 1;
      return await Promise.resolve({ id: `channel-${nextChannelId}` });
    },
    createdCategoryNames,
    createdVoiceChannels,
    recordGroupCategory: async (groupId, categoryId) => {
      recordedGroupCategories.push({ categoryId, groupId });
      await Promise.resolve();
    },
    recordMemberChannel: async (memberId, channelId) => {
      recordedMemberChannels.push({ channelId, memberId });
      await Promise.resolve();
    },
    recordedGroupCategories,
    recordedMemberChannels,
  };
}

describe(groupCategoryName, () => {
  it("formats the Thai category name with the group index", () => {
    expect(groupCategoryName(3)).toBe("หมวดที่ 3");
  });
});

describe(teamChannelName, () => {
  it("formats the channel name with the team index and name", () => {
    expect(teamChannelName(2, "แก๊งน้องห่าน")).toBe("2 - แก๊งน้องห่าน");
  });
});

describe(groupsMissingOverseer, () => {
  it("returns only groups without an overseer", () => {
    const withOverseer = createGroup({ has_overseer: true, id: "group-1" });
    const withoutOverseer = createGroup({ has_overseer: false, id: "group-2" });

    const result = groupsMissingOverseer([withOverseer, withoutOverseer]);

    expect(result).toStrictEqual([withoutOverseer]);
  });

  it("returns an empty array when every group has an overseer", () => {
    const groups = [createGroup({ has_overseer: true })];

    expect(groupsMissingOverseer(groups)).toStrictEqual([]);
  });
});

describe(createMissingChannels, () => {
  it("creates the category and all member channels for a group with nothing yet created", async () => {
    const ports = createFakePorts();
    const memberOne = createMember({ channel_id: null, id: "member-1" });
    const memberTwo = createMember({ channel_id: null, id: "member-2" });
    const group = createGroup({
      category_id: null,
      id: "group-1",
      members: [memberOne, memberTwo],
    });

    const result = await createMissingChannels([group], ports);

    expect({
      createdCategories: result.createdCategories,
      createdChannels: result.createdChannels,
    }).toStrictEqual({
      createdCategories: 1,
      createdChannels: 2,
    });
    expect(ports.createdCategoryNames).toStrictEqual([groupCategoryName(group.index)]);
    expect(ports.createdVoiceChannels).toStrictEqual([
      { name: teamChannelName(memberOne.team.index, memberOne.team.name), parentId: "category-1" },
      { name: teamChannelName(memberTwo.team.index, memberTwo.team.name), parentId: "category-1" },
    ]);
    expect(ports.recordedGroupCategories).toStrictEqual([
      { categoryId: "category-1", groupId: "group-1" },
    ]);
    expect(ports.recordedMemberChannels).toStrictEqual([
      { channelId: "channel-1", memberId: "member-1" },
      { channelId: "channel-2", memberId: "member-2" },
    ]);
  });

  it("creates nothing for a group whose category and every member channel already exist", async () => {
    const ports = createFakePorts();
    const group = createGroup({
      category_id: "existing-category",
      id: "group-1",
      members: [
        createMember({ channel_id: "existing-channel-1", id: "member-1" }),
        createMember({ channel_id: "existing-channel-2", id: "member-2" }),
      ],
    });

    const result = await createMissingChannels([group], ports);

    expect({
      createdCategories: result.createdCategories,
      createdChannels: result.createdChannels,
    }).toStrictEqual({
      createdCategories: 0,
      createdChannels: 0,
    });
    expect(ports.createdCategoryNames).toStrictEqual([]);
    expect(ports.createdVoiceChannels).toStrictEqual([]);
    expect(ports.recordedGroupCategories).toStrictEqual([]);
    expect(ports.recordedMemberChannels).toStrictEqual([]);
  });

  it("creates only the missing member channel, parented under the existing category", async () => {
    const ports = createFakePorts();
    const missingMember = createMember({ channel_id: null, id: "member-missing" });
    const existingMember = createMember({ channel_id: "existing-channel", id: "member-existing" });
    const group = createGroup({
      category_id: "existing-category",
      id: "group-1",
      members: [existingMember, missingMember],
    });

    const result = await createMissingChannels([group], ports);

    expect({
      createdCategories: result.createdCategories,
      createdChannels: result.createdChannels,
    }).toStrictEqual({
      createdCategories: 0,
      createdChannels: 1,
    });
    expect(ports.createdCategoryNames).toStrictEqual([]);
    expect(ports.createdVoiceChannels).toStrictEqual([
      {
        name: teamChannelName(missingMember.team.index, missingMember.team.name),
        parentId: "existing-category",
      },
    ]);
    expect(ports.recordedGroupCategories).toStrictEqual([]);
    expect(ports.recordedMemberChannels).toStrictEqual([
      { channelId: "channel-1", memberId: "member-missing" },
    ]);
  });
});
