import type {
  TeamRegistrationReviewListInput,
  TeamRegistrationReviewListResult,
} from "@bmhk-2026/api";
import { describe, expect, it } from "vitest";
import { createParticipationCsv } from "../participation-export";

describe("participation CSV export", () => {
  it("exports all pages with the selected filters and protects spreadsheet cells", async () => {
    const inputs: TeamRegistrationReviewListInput[] = [];
    const csv = await createParticipationCsv(
      { eligibility: "ELIGIBLE", reviewStatus: "APPROVED", search: "school" },
      async (input) => {
        inputs.push(input);
        const row: TeamRegistrationReviewListResult["rows"][number] = {
          advisor: "APPROVED",
          award: "FIRST_PLACE",
          id: "11111111-1111-4111-8111-111111111111",
          index: input.offset + 1,
          lastUpdatedAt: null,
          memberCount: 3,
          name: input.offset === 0 ? '=HYPERLINK("bad")' : 'Team, "Two"',
          participant1: "APPROVED",
          participant2: "APPROVED",
          participant3: "APPROVED",
          registrationSubmittedAt: null,
          reviewStatus: "APPROVED",
          reviewedByName: null,
          school: "โรงเรียน",
        };
        return await Promise.resolve({
          pagination: {
            nextOffset: input.offset === 0 ? 100 : null,
            offset: input.offset,
            total: 101,
          },
          rows: [row],
        });
      },
    );
    expect(inputs).toStrictEqual(
      [0, 100].map((offset) => ({
        eligibility: "ELIGIBLE",
        limit: 100,
        offset,
        reviewStatus: "APPROVED",
        search: "school",
        sortBy: "registrationSubmittedAt",
        sortDesc: false,
      })),
    );
    expect(csv.startsWith("\uFEFFรหัสทีม,ทีม,โรงเรียน")).toBeTruthy();
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"Team, ""Two"""');
    expect(csv).toContain("BH101/26");
  });

  it("rejects a failed page instead of exporting partial results", async () => {
    await expect(
      createParticipationCsv(
        { eligibility: "ALL", reviewStatus: "ALL", search: "" },
        async () => await Promise.reject(new Error("Network error")),
      ),
    ).rejects.toThrow("Network error");
  });
});
