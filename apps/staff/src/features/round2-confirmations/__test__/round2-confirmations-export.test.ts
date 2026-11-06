import type { Round2ConfirmationList, Round2ConfirmationListQuery } from "@bmhk-2026/api";
import { describe, expect, it } from "vitest";
import { createRound2ConfirmationsCsv } from "../round2-confirmations-export";

const EXPORT_PAGE_SIZE = 100;
const TOTAL_ROWS = 101;

function createRow(pageIndex: number): Round2ConfirmationList["rows"][number] {
  return {
    confirmedAt: null,
    participants: [
      {
        hasIdentityDocument: true,
        hasStudentIdDocument: true,
        id: "22222222-2222-4222-8222-222222222221",
        index: 1,
        name: "สมชาย ใจดี",
      },
      {
        hasIdentityDocument: true,
        hasStudentIdDocument: false,
        id: "22222222-2222-4222-8222-222222222222",
        index: 2,
        name: "สมหญิง รักเรียน",
      },
    ],
    state: pageIndex === 0 ? "DRAFT" : "CONFIRMED",
    team: {
      award: "ADVANCED_TO_ROUND_2",
      id: "11111111-1111-4111-8111-111111111111",
      index: pageIndex === 0 ? 42 : 7,
      memberCount: 2,
      name: pageIndex === 0 ? '=HYPERLINK("bad")' : 'Team, "Two"',
    },
  };
}

describe("round 2 confirmations CSV export", () => {
  it("exports all pages with the current filters and sorting", async () => {
    const inputs: Round2ConfirmationListQuery[] = [];
    const csv = await createRound2ConfirmationsCsv(
      {
        columnFilters: [{ id: "state", value: "DRAFT" }],
        sorting: [{ desc: true, id: "confirmedAt" }],
      },
      async (input) => {
        inputs.push(input);
        return await Promise.resolve({
          rowCount: TOTAL_ROWS,
          rows:
            input.pagination.pageIndex === 0
              ? Array.from({ length: EXPORT_PAGE_SIZE }, () => createRow(0))
              : [createRow(1)],
        });
      },
    );

    expect(inputs).toStrictEqual(
      [0, 1].map((pageIndex) => ({
        columnFilters: [{ id: "state", value: "DRAFT" }],
        pagination: { pageIndex, pageSize: EXPORT_PAGE_SIZE },
        sorting: [{ desc: true, id: "confirmedAt" }],
      })),
    );
    expect(csv.startsWith("﻿รหัสทีม,ชื่อทีม,จำนวนสมาชิก,สมาชิก,เอกสาร,สถานะ,ยืนยันเมื่อ")).toBeTruthy();
    expect(csv).toContain(
      `BH042/26,"'=HYPERLINK(""bad"")",2,"สมชาย ใจดี\nสมหญิง รักเรียน",3 / 4,ยังไม่ยืนยัน,—`,
    );
    expect(csv).toContain('BH007/26,"Team, ""Two"""');
    expect(csv).toContain("ยืนยันแล้ว");
  });

  it("rejects a failed page instead of exporting partial results", async () => {
    await expect(
      createRound2ConfirmationsCsv(
        { columnFilters: [], sorting: [{ desc: false, id: "teamCode" }] },
        async () => await Promise.reject(new Error("Network error")),
      ),
    ).rejects.toThrow("Network error");
  });
});
