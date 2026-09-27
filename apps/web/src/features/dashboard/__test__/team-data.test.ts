import { describe, expect, it } from "vitest";

import { isRound2Confirmed } from "../team-data";

describe("round 2 confirmation state", () => {
  it("returns false without confirmation state or timestamp", () => {
    expect(isRound2Confirmed()).toBeFalsy();
    expect(isRound2Confirmed({ confirmedAt: null, state: "DRAFT" })).toBeFalsy();
  });

  it("returns true for confirmed state or confirmation timestamp", () => {
    expect(isRound2Confirmed({ state: "CONFIRMED" })).toBeTruthy();
    expect(isRound2Confirmed({ confirmedAt: new Date("2026-10-05T12:00:00Z") })).toBeTruthy();
  });
});
