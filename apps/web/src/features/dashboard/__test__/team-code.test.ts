import { describe, expect, it } from "vitest";

import { formatCodernName, formatTeamCode } from "../team-code";

describe(formatTeamCode, () => {
  it("prefixes the zero-padded team index with BH", () => {
    expect(formatTeamCode(7)).toBe("BH007");
  });
});

describe(formatCodernName, () => {
  it("joins the zero-padded team index and team name with a hyphen", () => {
    expect(formatCodernName(7, "ตี๋มากอดเค้าเลย")).toBe("007-ตี๋มากอดเค้าเลย");
  });

  it("keeps the name within 64 characters", () => {
    const name = formatCodernName(12, "a".repeat(100));

    expect(name).toBe(`012-${"a".repeat(60)}`);
  });
});
