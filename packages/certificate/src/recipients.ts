import Papa from "papaparse";
import { z } from "zod";

import type { CertificateTemplate } from "./templates";

const awards = [
  "ADVANCED_TO_ROUND_2",
  "ADVANCED_TO_ROUND_3",
  "FIRST_PLACE",
  "HONORABLE_MENTION",
  "ROUND_1_PARTICIPATED",
  "ROUND_2_PARTICIPATED",
  "ROUND_3_PARTICIPATED",
  "SECOND_PLACE",
  "THIRD_PLACE",
] as const;

const participantTemplates = {
  ADVANCED_TO_ROUND_2: "semi-final",
  ADVANCED_TO_ROUND_3: "final",
  FIRST_PLACE: "first",
  HONORABLE_MENTION: "honorable-mention",
  ROUND_1_PARTICIPATED: "participate",
  ROUND_2_PARTICIPATED: "semi-final",
  ROUND_3_PARTICIPATED: "final",
  SECOND_PLACE: "second",
  THIRD_PLACE: "third",
} as const satisfies Record<(typeof awards)[number], CertificateTemplate>;

// Only the columns the certificate prints or names files with. Other export columns are ignored.
const recipientRowSchema = z.object({
  affiliationText: z.string().min(1),
  award: z.enum(awards),
  awardText: z.string().min(1),
  firstName: z.string().min(1),
  fullNameEn: z.string().min(1),
  lastName: z.string().min(1),
  memberIndex: z.string(),
  middleName: z.string(),
  role: z.enum(["PARTICIPANT", "ADVISOR"]),
  teamCode: z.string().min(1),
});

type RecipientRow = z.infer<typeof recipientRowSchema>;

export interface CertificateJob {
  template: CertificateTemplate;
  fullName: string;
  affiliationText: string;
  awardText: string;
  fileName: string;
}

// Registrants typed these into the optional middle-name field to mean "none".
const MIDDLE_NAME_PLACEHOLDERS = new Set(["ไม่ระบุ", "ไม่มี", "-"]);
// Thai vowels and tone marks that attach to a consonant; at the start of a name part they are typos.
const LEADING_THAI_MARKS = /^[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]+/u;
const UNSAFE_FILE_CHARACTERS = /[^A-Za-z0-9-]+/gu;
const BYTE_ORDER_MARK = /^﻿/u;
// Header is row 1, so the first data row is row 2.
const FIRST_DATA_ROW = 2;

function toFileSegment(value: string): string {
  return value.trim().replaceAll(UNSAFE_FILE_CHARACTERS, "-");
}

function cleanNamePart(value: string): string {
  return value.trim().replace(LEADING_THAI_MARKS, "");
}

function printedName({ firstName, middleName, lastName }: RecipientRow): string {
  const middle = cleanNamePart(middleName);
  return [
    cleanNamePart(firstName),
    MIDDLE_NAME_PLACEHOLDERS.has(middle) ? "" : middle,
    cleanNamePart(lastName),
  ]
    .filter((part) => part !== "")
    .join(" ");
}

function toJob(row: RecipientRow): CertificateJob {
  const isAdvisor = row.role === "ADVISOR";
  const memberSegment = isAdvisor ? "advisor" : row.memberIndex;
  return {
    affiliationText: row.affiliationText,
    awardText: row.awardText,
    fileName: `${[row.teamCode, memberSegment, row.fullNameEn].map(toFileSegment).join("_")}.pdf`,
    fullName: printedName(row),
    template: isAdvisor ? "appreciation" : participantTemplates[row.award],
  };
}

// Path of a job's PDF inside the output folder.
export function jobPath(job: CertificateJob): string {
  return `${job.template}/${job.fileName}`;
}

// Raw CSV records with every column, in file order.
export function parseRecipientRecords(csv: string): Record<string, string>[] {
  const { data, errors } = Papa.parse<Record<string, string>>(csv.replace(BYTE_ORDER_MARK, ""), {
    header: true,
    skipEmptyLines: true,
  });
  const [firstError] = errors;
  if (firstError) {
    throw new Error(
      `CSV parse failed at row ${(firstError.row ?? 0) + FIRST_DATA_ROW}: ${firstError.message}`,
    );
  }
  return data;
}

export function toCertificateJobs(records: readonly Record<string, string>[]): CertificateJob[] {
  return records.map((record, index) => {
    const result = recipientRowSchema.safeParse(record);
    if (!result.success) {
      throw new Error(
        `Invalid recipient at row ${index + FIRST_DATA_ROW}: ${z.prettifyError(result.error)}`,
      );
    }
    return toJob(result.data);
  });
}

export function parseCertificateJobs(csv: string): CertificateJob[] {
  return toCertificateJobs(parseRecipientRecords(csv));
}
