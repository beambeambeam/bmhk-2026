// @vitest-environment jsdom

import type {
  FirstRoundEligibility,
  TeamAward,
  TeamRegistrationReviewListResult,
} from "@bmhk-2026/api";
import { getTeamRegistrationReviewListQueryOptions } from "@bmhk-2026/client/query-options";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ParticipationTable } from "../participation-table";

function renderTable(award: TeamAward, firstRoundEligibility: FirstRoundEligibility): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const data: TeamRegistrationReviewListResult = {
    pagination: { nextOffset: null, offset: 0, total: 1 },
    rows: [
      {
        advisor: "APPROVED",
        award,
        firstRoundEligibility,
        id: "11111111-1111-4111-8111-111111111111",
        index: 1,
        lastUpdatedAt: null,
        memberCount: 3,
        name: "Team One",
        participant1: "APPROVED",
        participant2: "APPROVED",
        participant3: "APPROVED",
        registrationSubmittedAt: null,
        reviewStatus: "APPROVED",
        reviewedByName: null,
        school: "Test School",
      },
    ],
  };
  queryClient.setQueryData(
    getTeamRegistrationReviewListQueryOptions({
      limit: 20,
      offset: 0,
      reviewStatus: "ALL",
      search: "",
      sortBy: "registrationSubmittedAt",
      sortDesc: false,
    }).queryKey,
    data,
  );
  render(
    <QueryClientProvider client={queryClient}>
      <ParticipationTable canReview />
    </QueryClientProvider>,
  );
}

describe("participations table", () => {
  afterEach(cleanup);

  it.each([
    ["PENDING", "ยังไม่ได้พิจารณา"],
    ["ELIGIBLE", "มีสิทธิ์เข้าแข่งขันในรอบแรก"],
    ["NOT_ELIGIBLE", "ไม่มีสิทธิ์เข้าแข่งขันในรอบแรก"],
  ] as const)("shows first-round eligibility for %s", (eligibility, label) => {
    renderTable("NO_ACHIEVEMENT", eligibility);
    expect(screen.getByRole("columnheader", { name: "สิทธิ์เข้าแข่งขันในรอบแรก" })).toBeDefined();
    expect(screen.getByRole("cell", { name: label })).toBeDefined();
  });

  it("does not derive eligibility from the competition result", () => {
    renderTable("ROUND_1_COMPLETED", "PENDING");
    expect(screen.getByRole("cell", { name: "ยังไม่ได้พิจารณา" })).toBeDefined();
  });

  it("opens eligibility from the team actions menu", async () => {
    renderTable("NO_ACHIEVEMENT", "PENDING");
    fireEvent.click(screen.getByRole("button", { name: "จัดการทีม" }));
    await expect(screen.findByRole("menuitem", { name: "ตรวจสอบข้อมูลทีม" })).resolves.toBeDefined();
    fireEvent.click(screen.getByRole("menuitem", { name: "สิทธิ์เข้ารอบแรก" }));
    await expect(screen.findByRole("dialog", { name: "สิทธิ์เข้ารอบแรก" })).resolves.toBeDefined();
  });
});
