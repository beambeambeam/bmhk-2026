import { describe, expect, it } from "vitest";

import { parseStaffOverseerCsv } from "../parse-csv";

describe(parseStaffOverseerCsv, () => {
  it("parses rows and skips a matching header line", () => {
    const csv = "kmutt_email,teams_group_idx\nfirst@kmutt.ac.th,1\nsecond@kmutt.ac.th,2";

    const result = parseStaffOverseerCsv(csv);

    expect(result.errors).toStrictEqual([]);
    expect(result.rows).toStrictEqual([
      { email: "first@kmutt.ac.th", teamsGroupIndex: 1 },
      { email: "second@kmutt.ac.th", teamsGroupIndex: 2 },
    ]);
  });

  it("parses rows with no header present", () => {
    const csv = "only@kmutt.ac.th,3";

    const result = parseStaffOverseerCsv(csv);

    expect(result.rows).toStrictEqual([{ email: "only@kmutt.ac.th", teamsGroupIndex: 3 }]);
  });

  it("reports a row with a non-numeric group index as an error, not a row", () => {
    const csv = "bad@kmutt.ac.th,not-a-number";

    const result = parseStaffOverseerCsv(csv);

    expect(result.rows).toStrictEqual([]);
    expect(result.errors).toStrictEqual(['Row 1: invalid "bad@kmutt.ac.th,not-a-number"']);
  });

  it("reports a row with a missing email as an error", () => {
    const csv = ",4";

    const result = parseStaffOverseerCsv(csv);

    expect(result.rows).toStrictEqual([]);
    expect(result.errors).toStrictEqual([`Row 1: invalid ",4"`]);
  });
});
