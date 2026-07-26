import { teamAwardValues } from "@bmhk-2026/db/schema/teams";
import { describe, expect, it } from "vitest";

import { awardOptions } from "../teams.constants";

describe("team award options", () => {
  it("matches the database enum values and labels", () => {
    expect(awardOptions).toStrictEqual([
      { label: "No Achievement", value: "NO_ACHIEVEMENT" },
      { label: "Round 1 Completed", value: "ROUND_1_COMPLETED" },
      { label: "Round 2 Completed", value: "ROUND_2_COMPLETED" },
      { label: "Honorable Mention", value: "HONORABLE_MENTION" },
      { label: "Third Place", value: "THIRD_PLACE" },
      { label: "Second Place", value: "SECOND_PLACE" },
      { label: "First Place", value: "FIRST_PLACE" },
    ]);
    expect(awardOptions.map(({ value }) => value)).toStrictEqual(teamAwardValues);
  });
});
