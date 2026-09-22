// @vitest-environment jsdom

import type { TeamAward, TeamRegistrationReviewListResult } from "@bmhk-2026/api";
import { getTeamRegistrationReviewListQueryOptions } from "@bmhk-2026/client/query-options";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ParticipationTable } from "../participation-table";

function renderTable(award: TeamAward, canRemove = true): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const data: TeamRegistrationReviewListResult = {
    pagination: { nextOffset: null, offset: 0, total: 1 },
    rows: [
      {
        advisor: "APPROVED",
        award,
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
      eligibility: "ALL",
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
      <ParticipationTable canReview canRemove={canRemove} />
    </QueryClientProvider>,
  );
  return queryClient;
}

describe("participations table", () => {
  afterEach(cleanup);

  it("sorts by team code in both directions and switches back to submission date", () => {
    renderTable("NO_ACHIEVEMENT");
    const codeHeader = screen.getByRole("columnheader", { name: "รหัสทีม" });
    const dateHeader = screen.getByRole("columnheader", { name: "วันที่ส่ง" });
    expect(dateHeader.getAttribute("aria-sort")).toBe("ascending");
    fireEvent.click(screen.getByRole("button", { name: "รหัสทีม" }));
    expect(codeHeader.getAttribute("aria-sort")).toBe("ascending");
    expect(dateHeader.getAttribute("aria-sort")).toBe("none");
    fireEvent.click(screen.getByRole("button", { name: "รหัสทีม" }));
    expect(codeHeader.getAttribute("aria-sort")).toBe("descending");
    fireEvent.click(screen.getByRole("button", { name: "วันที่ส่ง" }));
    expect([
      dateHeader.getAttribute("aria-sort"),
      codeHeader.getAttribute("aria-sort"),
    ]).toStrictEqual(["ascending", "none"]);
  });

  it.each([
    ["NO_ACHIEVEMENT", "ยังไม่ได้พิจารณา"],
    ["REGISTRATION_COMPLETED", "มีสิทธิ์เข้าแข่งขันในรอบแรก"],
    ["NOT_QUALIFIED", "ไม่มีสิทธิ์เข้าแข่งขันในรอบแรก"],
  ] as const)("shows first-round eligibility for %s", (award, label) => {
    renderTable(award);
    expect(screen.getByRole("columnheader", { name: "สิทธิ์เข้าแข่งขันในรอบแรก" })).toBeDefined();
    expect(screen.getByRole("cell", { name: label })).toBeDefined();
  });

  it.each(["ROUND_1_COMPLETED", "FIRST_PLACE"] as const)(
    "shows higher award %s as first-round eligibility",
    (award) => {
      renderTable(award);
      expect(screen.getByRole("cell", { name: "มีสิทธิ์เข้าแข่งขันในรอบแรก" })).toBeDefined();
    },
  );

  it("filters teams by first-round eligibility", async () => {
    const queryClient = renderTable("NO_ACHIEVEMENT");
    queryClient.setQueryData(
      getTeamRegistrationReviewListQueryOptions({
        eligibility: "ELIGIBLE",
        limit: 20,
        offset: 0,
        reviewStatus: "ALL",
        search: "",
        sortBy: "registrationSubmittedAt",
        sortDesc: false,
      }).queryKey,
      { pagination: { nextOffset: null, offset: 0, total: 0 }, rows: [] },
    );
    fireEvent.click(screen.getByRole("combobox", { name: "สิทธิ์เข้าแข่งขันในรอบแรก" }));
    const option = await screen.findByRole("option", { name: "มีสิทธิ์เข้าแข่งขันในรอบแรก" });
    fireEvent.mouseMove(option);
    fireEvent.mouseDown(option);
    fireEvent.mouseUp(option);
    fireEvent.click(option);
    await expect(screen.findByText("ไม่พบข้อมูลการสมัคร")).resolves.toBeDefined();
    expect(screen.queryByRole("cell", { name: "Team One" })).toBeNull();
  });

  it("opens eligibility from the team actions menu", async () => {
    renderTable("NO_ACHIEVEMENT");
    fireEvent.click(screen.getByRole("button", { name: "จัดการทีม" }));
    await expect(screen.findByRole("menuitem", { name: "ตรวจสอบข้อมูลทีม" })).resolves.toBeDefined();
    fireEvent.click(screen.getByRole("menuitem", { name: "สิทธิ์เข้ารอบแรก" }));
    await expect(screen.findByRole("dialog", { name: "สิทธิ์เข้ารอบแรก" })).resolves.toBeDefined();
  });

  it("requires the exact team name before permanent deletion", async () => {
    renderTable("FIRST_PLACE");
    fireEvent.click(screen.getByRole("button", { name: "จัดการทีม" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "ลบทีมถาวร" }));
    await expect(screen.findByRole("dialog", { name: "ลบทีมถาวร" })).resolves.toBeDefined();
    const confirm = screen.getByRole<HTMLButtonElement>("button", { name: "ลบทีมถาวร" });
    const input = screen.getByRole("textbox", { name: "พิมพ์ชื่อทีมเพื่อยืนยัน" });
    expect(confirm.disabled).toBeTruthy();
    fireEvent.change(input, { target: { value: "Wrong team" } });
    expect(confirm.disabled).toBeTruthy();
    fireEvent.change(input, { target: { value: "Team One" } });
    expect(confirm.disabled).toBeFalsy();
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    expect(screen.queryByRole("dialog", { name: "ลบทีมถาวร" })).toBeNull();
  });

  it("hides team removal when the operator lacks permission", async () => {
    renderTable("NO_ACHIEVEMENT", false);
    fireEvent.click(screen.getByRole("button", { name: "จัดการทีม" }));
    await screen.findByRole("menuitem", { name: "ตรวจสอบข้อมูลทีม" });
    expect(screen.queryByRole("menuitem", { name: "ลบทีมถาวร" })).toBeNull();
  });
});
