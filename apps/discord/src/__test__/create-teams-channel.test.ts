import { describe, expect, it } from "vitest";

import {
  groupCategoryName,
  groupsMissingOverseer,
  teamChannelName,
} from "../interactions/commands/create-teams-channel";
import type { TeamGroup } from "../services/team-groups-api";

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
