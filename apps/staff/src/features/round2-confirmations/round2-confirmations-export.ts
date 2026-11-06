import { formatBangkokDateTime } from "@/features/team-round-results/round-result-datetime";
import { formatTeamCode } from "@/lib/team-code";
import type {
  Round2ConfirmationList,
  Round2ConfirmationListQuery,
  Round2ConfirmationState,
} from "@bmhk-2026/api";
import Papa from "papaparse";

type ConfirmationRow = Round2ConfirmationList["rows"][number];

const EXPORT_PAGE_SIZE = 100;
const REQUIRED_DOCUMENTS_PER_PARTICIPANT = 2;

export const confirmationStateLabels: Record<Round2ConfirmationState, string> = {
  CONFIRMED: "ยืนยันแล้ว",
  DRAFT: "ยังไม่ยืนยัน",
};

export function formatDocumentProgress(row: ConfirmationRow): string {
  let uploaded = 0;
  for (const participant of row.participants) {
    if (participant.hasIdentityDocument) {
      uploaded += 1;
    }
    if (participant.hasStudentIdDocument) {
      uploaded += 1;
    }
  }
  return `${uploaded} / ${row.team.memberCount * REQUIRED_DOCUMENTS_PER_PARTICIPANT}`;
}

export async function createRound2ConfirmationsCsv(
  query: Pick<Round2ConfirmationListQuery, "columnFilters" | "sorting">,
  fetchPage: (input: Round2ConfirmationListQuery) => Promise<Round2ConfirmationList>,
): Promise<string> {
  const rows: ConfirmationRow[] = [];
  let pageIndex = 0;
  let rowCount = 1;
  while (rows.length < rowCount) {
    // oxlint-disable-next-line no-await-in-loop -- Each page supplies the total row count.
    const page = await fetchPage({
      ...query,
      pagination: { pageIndex, pageSize: EXPORT_PAGE_SIZE },
    });
    if (page.rows.length === 0) {
      break;
    }
    rows.push(...page.rows);
    ({ rowCount } = page);
    pageIndex += 1;
  }
  return `﻿${Papa.unparse(
    {
      data: rows.map((row) => [
        formatTeamCode(row.team.index),
        row.team.name,
        row.team.memberCount,
        row.participants.map((participant) => participant.name).join("; "),
        formatDocumentProgress(row),
        confirmationStateLabels[row.state],
        formatBangkokDateTime(row.confirmedAt),
      ]),
      fields: ["รหัสทีม", "ชื่อทีม", "จำนวนสมาชิก", "สมาชิก", "เอกสาร", "สถานะ", "ยืนยันเมื่อ"],
    },
    { escapeFormulae: true },
  )}`;
}
