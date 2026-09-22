import type {
  TeamRegistrationReviewListInput,
  TeamRegistrationReviewListResult,
} from "@bmhk-2026/api";
import Papa from "papaparse";
import { getEligibilityLabel } from "./participation-eligibility";
import { statusLabels } from "./participation-review-status";
import { formatStaffDate, formatStaffDateTime } from "./review-utils";

const EXPORT_PAGE_SIZE = 100;

export async function createParticipationCsv(
  filters: Pick<TeamRegistrationReviewListInput, "eligibility" | "reviewStatus" | "search">,
  fetchPage: (input: TeamRegistrationReviewListInput) => Promise<TeamRegistrationReviewListResult>,
): Promise<string> {
  const rows: TeamRegistrationReviewListResult["rows"] = [];
  let offset: number | null = 0;
  while (offset !== null) {
    // oxlint-disable-next-line no-await-in-loop -- Each page supplies the next offset.
    const page = await fetchPage({
      ...filters,
      limit: EXPORT_PAGE_SIZE,
      offset,
      sortBy: "registrationSubmittedAt",
      sortDesc: false,
    });
    rows.push(...page.rows);
    offset = page.pagination.nextOffset;
  }
  return `\uFEFF${Papa.unparse(
    {
      data: rows.map((team) => [
        `BH${String(team.index).padStart(3, "0")}/26`,
        team.name,
        team.school,
        team.memberCount,
        statusLabels[team.registrationSubmittedAt ? "SUBMITTED" : "DRAFT"],
        formatStaffDate(team.registrationSubmittedAt),
        statusLabels[team.reviewStatus],
        getEligibilityLabel(team.award),
        team.reviewedByName ?? "—",
        formatStaffDateTime(team.lastUpdatedAt),
      ]),
      fields: [
        "รหัสทีม",
        "ทีม",
        "โรงเรียน",
        "สมาชิก",
        "การส่งสมัคร",
        "วันที่ส่ง",
        "ตรวจสอบ",
        "สิทธิ์เข้าแข่งขันในรอบแรก",
        "อัปเดตโดย",
        "อัปเดตล่าสุด",
      ],
    },
    { escapeFormulae: true },
  )}`;
}

export function downloadParticipationCsv(csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `participations-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
