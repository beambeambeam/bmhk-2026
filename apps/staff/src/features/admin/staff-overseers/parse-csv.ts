import Papa from "papaparse";

export interface StaffOverseerCsvRow {
  email: string;
  teamsGroupIndex: number;
}

export interface StaffOverseerCsvParseResult {
  errors: string[];
  rows: StaffOverseerCsvRow[];
}

const HEADER_FIRST_CELL = "kmutt_email";

function isHeaderRow(line: string[]): boolean {
  return line[0]?.trim().toLowerCase() === HEADER_FIRST_CELL;
}

export function parseStaffOverseerCsv(csvText: string): StaffOverseerCsvParseResult {
  const parsed = Papa.parse<string[]>(csvText.trim(), { skipEmptyLines: true });
  const dataLines = parsed.data.filter((line, index) => !(index === 0 && isHeaderRow(line)));

  const errors: string[] = [];
  const rows: StaffOverseerCsvRow[] = [];

  for (const [index, line] of dataLines.entries()) {
    const email = line[0]?.trim() ?? "";
    const teamsGroupIndex = Number(line[1]?.trim());

    if (email.length === 0 || !Number.isInteger(teamsGroupIndex) || teamsGroupIndex <= 0) {
      errors.push(`Row ${index + 1}: invalid "${line.join(",")}"`);
      continue;
    }

    rows.push({ email, teamsGroupIndex });
  }

  return { errors, rows };
}
