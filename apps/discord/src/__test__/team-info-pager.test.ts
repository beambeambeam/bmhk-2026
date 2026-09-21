import { describe, expect, it } from "vitest";

import { decodePagerId, encodePagerId, renderTeamInfoPage } from "../lib/team-info-pager";
import type { TeamInfo } from "../services/discord-admin-api";

const TEAM: TeamInfo = {
  id: "0a1b2c3d-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  index: 12,
  name: "แก๊งน้องห่าน",
  participants: [
    { accounts: ["111", "222"], code: "ABCD2345", index: 1, name: "นางสาว เมทิกา สุขใจ" },
    { accounts: [], code: null, index: 2, name: "นาย สมชาย ใจดี" },
  ],
  school: "โรงเรียนบางมด",
};

describe("team info pager custom id", () => {
  it.each([
    [{ id: "0a1b2c3d" }, 0],
    [{ index: 12 }, 3],
    [{ name: "alpha: the team" }, 7],
  ])("round-trips %j on page %i", (selector, page) => {
    expect(decodePagerId(encodePagerId(selector, page))).toStrictEqual({ page, selector });
  });

  it.each(["teaminfo:name:alpha", "teaminfo:bogus:x:1", "teaminfo:index:abc:1", "other:id:x:1"])(
    "rejects %s",
    (id) => {
      expect(decodePagerId(id)).toBeNull();
    },
  );

  it("keeps a maximum-length name inside Discord's 100-character custom id limit", () => {
    expect(encodePagerId({ name: "ก".repeat(40) }, 99).length).toBeLessThanOrEqual(100);
  });
});

describe(renderTeamInfoPage, () => {
  it("shows the team, its participants, accounts and codes on the requested page", () => {
    const { embeds } = renderTeamInfoPage([TEAM], { index: 12 }, 0);

    expect(embeds[0]?.data).toMatchObject({
      description: "โรงเรียนบางมด\nID: `0a1b2c3d-aaaa-4aaa-8aaa-aaaaaaaaaaaa`",
      footer: { text: "match 1/1" },
      title: "#12 แก๊งน้องห่าน",
    });
    expect(embeds[0]?.data.fields).toStrictEqual([
      { name: "1. นางสาว เมทิกา สุขใจ", value: "<@111> <@222>\nโค้ด: `ABCD2345`" },
      { name: "2. นาย สมชาย ใจดี", value: "ยังไม่ได้ยืนยัน\nโค้ด: `ยังไม่มีรหัส`" },
    ]);
  });

  it("only offers paging buttons when there is more than one match", () => {
    expect(renderTeamInfoPage([TEAM], { index: 12 }, 0).components).toStrictEqual([]);
    expect(
      renderTeamInfoPage([TEAM, { ...TEAM, index: 13 }], { name: "แก๊ง" }, 0).components,
    ).toHaveLength(1);
  });

  it("disables previous on the first page and next on the last", () => {
    const teams = [TEAM, { ...TEAM, index: 13 }];
    function buttons(page: number) {
      return renderTeamInfoPage(teams, { name: "x" }, page).components[0]?.toJSON().components;
    }

    expect(buttons(0)?.map((button) => button.disabled)).toStrictEqual([true, false]);
    expect(buttons(1)?.map((button) => button.disabled)).toStrictEqual([false, true]);
  });

  it("clamps an out-of-range page to the last match", () => {
    const { embeds } = renderTeamInfoPage([TEAM, { ...TEAM, index: 13 }], { name: "x" }, 9);

    expect(embeds[0]?.data.title).toBe("#13 แก๊งน้องห่าน");
  });
});
