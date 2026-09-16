import { describe, expect, it } from "vitest";

import {
  cleanupProvisionedGroups,
  groupsWithCategory,
} from "../interactions/commands/cleanup-teams-channel";
import type { ChannelCleanupPorts } from "../interactions/commands/cleanup-teams-channel";
import type { TeamGroup, TeamGroupMember } from "../services/team-groups-api";

function createGroup(overrides: Partial<TeamGroup> = {}): TeamGroup {
  return {
    category_id: "category-1",
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
    channel_id: "channel-1",
    id: "member-1",
    team: { id: "team-1", index: 1, name: "แก๊งน้องห่าน" },
    ...overrides,
  };
}

interface FakePorts extends ChannelCleanupPorts {
  clearedGroupCategoryIds: string[];
  clearedMemberChannelIds: string[];
  deletedCategoryIds: string[];
  deletedChannelIds: string[];
}

function createFakePorts(overrides: Partial<ChannelCleanupPorts> = {}): FakePorts {
  const clearedGroupCategoryIds: string[] = [];
  const clearedMemberChannelIds: string[] = [];
  const deletedCategoryIds: string[] = [];
  const deletedChannelIds: string[] = [];

  return {
    clearGroupCategory: async (groupId) => {
      clearedGroupCategoryIds.push(groupId);
      await Promise.resolve();
    },
    clearMemberChannel: async (memberId) => {
      clearedMemberChannelIds.push(memberId);
      await Promise.resolve();
    },
    clearedGroupCategoryIds,
    clearedMemberChannelIds,
    deleteCategory: async (categoryId) => {
      deletedCategoryIds.push(categoryId);
      await Promise.resolve();
    },
    deleteChannel: async (channelId) => {
      deletedChannelIds.push(channelId);
      await Promise.resolve();
    },
    deletedCategoryIds,
    deletedChannelIds,
    ...overrides,
  };
}

describe(groupsWithCategory, () => {
  it("returns only groups with a category id", () => {
    const withCategory = createGroup({ category_id: "category-1", id: "group-1" });
    const withoutCategory = createGroup({ category_id: null, id: "group-2" });

    expect(groupsWithCategory([withCategory, withoutCategory])).toStrictEqual([withCategory]);
  });
});

describe(cleanupProvisionedGroups, () => {
  it("deletes every provisioned channel and category, then clears their Discord state", async () => {
    const ports = createFakePorts();
    const memberOne = createMember({ channel_id: "channel-1", id: "member-1" });
    const memberTwo = createMember({ channel_id: "channel-2", id: "member-2" });
    const group = createGroup({
      category_id: "category-1",
      id: "group-1",
      members: [memberOne, memberTwo],
    });

    const result = await cleanupProvisionedGroups([group], ports);

    expect(result).toStrictEqual({ deletedCategories: 1, deletedChannels: 2, failureLines: [] });
    expect(ports.deletedChannelIds).toStrictEqual(["channel-1", "channel-2"]);
    expect(ports.clearedMemberChannelIds).toStrictEqual(["member-1", "member-2"]);
    expect(ports.deletedCategoryIds).toStrictEqual(["category-1"]);
    expect(ports.clearedGroupCategoryIds).toStrictEqual(["group-1"]);
  });

  it("skips groups without a category id", async () => {
    const ports = createFakePorts();
    const group = createGroup({ category_id: null, members: [createMember()] });

    const result = await cleanupProvisionedGroups([group], ports);

    expect(result).toStrictEqual({ deletedCategories: 0, deletedChannels: 0, failureLines: [] });
    expect(ports.deletedChannelIds).toStrictEqual([]);
  });

  it("skips members without a channel id", async () => {
    const ports = createFakePorts();
    const group = createGroup({ members: [createMember({ channel_id: null })] });

    const result = await cleanupProvisionedGroups([group], ports);

    expect(result).toStrictEqual({ deletedCategories: 1, deletedChannels: 0, failureLines: [] });
  });

  it("reports a failed channel delete, leaves it uncleared, and does not delete the category", async () => {
    const failingMember = createMember({ channel_id: "channel-fail", id: "member-fail" });
    const ports = createFakePorts({
      deleteChannel: async (channelId) => {
        if (channelId === "channel-fail") {
          throw new Error("Missing Access");
        }
        await Promise.resolve();
      },
    });
    const group = createGroup({
      category_id: "category-1",
      id: "group-1",
      members: [failingMember],
    });

    const result = await cleanupProvisionedGroups([group], ports);

    expect(result.deletedChannels).toBe(0);
    expect(result.deletedCategories).toBe(0);
    expect(result.failureLines).toStrictEqual([
      `${failingMember.team.index} - ${failingMember.team.name}: failed to delete voice channel`,
    ]);
    expect(ports.clearedMemberChannelIds).toStrictEqual([]);
    expect(ports.deletedCategoryIds).toStrictEqual([]);
  });

  it("reports a failed category delete without affecting already-cleared channels", async () => {
    const ports = createFakePorts({
      deleteCategory: () => {
        throw new Error("Missing Access");
      },
    });
    const group = createGroup({
      category_id: "category-1",
      id: "group-1",
      members: [createMember({ channel_id: "channel-1", id: "member-1" })],
    });

    const result = await cleanupProvisionedGroups([group], ports);

    expect(result.deletedChannels).toBe(1);
    expect(result.deletedCategories).toBe(0);
    expect(result.failureLines).toStrictEqual([`หมวดที่ ${group.index}: failed to delete category`]);
    expect(ports.clearedGroupCategoryIds).toStrictEqual([]);
  });
});
