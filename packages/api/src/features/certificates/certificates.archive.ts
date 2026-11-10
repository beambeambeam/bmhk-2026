import Papa from "papaparse";
import { z } from "zod";

import { certificateEligibleAwardValues } from "@bmhk-2026/db/schema/teams";

import { createCertificateArchiveInvalidError } from "./certificates.errors";
import { MAX_CERTIFICATE_PDF_BYTES } from "./certificates.rules";
import {
  MAX_CERTIFICATE_COUNT,
  certificateTemplateFor,
  certificateTemplateSchema,
} from "./certificates.schema";
import type { NewCertificate, StartCertificateUploadInput } from "./certificates.schema";

export const INFO_CSV_PATH = "info.csv";
const BYTE_ORDER_MARK = "﻿";
const CERTIFICATE_PATH_PATTERN = /^cert\/(?<template>[a-z-]+)\/[A-Za-z0-9_-]+\.pdf$/u;
const TRAILING_LINE_BREAKS_PATTERN = /[\r\n]+$/u;
const DRIVE_LETTER_PATTERN = /^[A-Za-z]:/u;
// The recipients export escapes spreadsheet formulas with a leading apostrophe.
const ESCAPED_FORMULA_PATTERN = /^'[=+\-@\t\r]/u;
const PARTICIPANT_MEMBER_INDEX_PATTERN = /^[1-3]$/u;
const IGNORED_SEGMENTS = new Set([".DS_Store", "__MACOSX"]);

export type ArchiveCertificate = Omit<NewCertificate, "bucket" | "objectKey">;

const infoRowSchema = z.object({
  award: z.enum(certificateEligibleAwardValues),
  certificate: z.string(),
  fullName: z.string().trim().min(1),
  fullNameEn: z.string().trim().min(1),
  memberIndex: z.string(),
  personId: z.uuid(),
  role: z.enum(["PARTICIPANT", "ADVISOR"]),
  teamCode: z.string().trim().min(1),
  teamId: z.uuid(),
  teamName: z.string().trim().min(1),
});

const requiredColumns = Object.keys(infoRowSchema.shape);

function invalid(problem: string): never {
  throw createCertificateArchiveInvalidError(problem);
}

function unescapeFormula(value: string): string {
  return ESCAPED_FORMULA_PATTERN.test(value) ? value.slice(1) : value;
}

function isUnsafePath(path: string): boolean {
  if (path.startsWith("/") || path.includes("\\") || path.includes("\0")) {
    return true;
  }
  if (DRIVE_LETTER_PATTERN.test(path)) {
    return true;
  }
  const segments = path.endsWith("/") ? path.slice(0, -1).split("/") : path.split("/");
  return segments.some((segment) => segment === "" || segment === "." || segment === "..");
}

function isIgnoredEntry(path: string): boolean {
  return path.split("/").some((segment) => IGNORED_SEGMENTS.has(segment));
}

// Returns the PDF entries by path. Directories and macOS metadata are skipped.
function readEntries(entries: StartCertificateUploadInput["entries"]): Map<string, number> {
  const files = new Map<string, number>();
  const seen = new Set<string>();
  for (const { path, sizeBytes } of entries) {
    if (isUnsafePath(path)) {
      invalid(`entry ${JSON.stringify(path)} has an unsafe path`);
    }
    if (seen.has(path)) {
      invalid(`entry ${JSON.stringify(path)} appears more than once`);
    }
    seen.add(path);
    if (path.endsWith("/") || isIgnoredEntry(path) || path === INFO_CSV_PATH) {
      continue;
    }
    if (!CERTIFICATE_PATH_PATTERN.test(path)) {
      invalid(`entry ${JSON.stringify(path)} is not a certificate PDF under cert/<template>/`);
    }
    if (sizeBytes === 0 || sizeBytes > MAX_CERTIFICATE_PDF_BYTES) {
      invalid(`entry ${JSON.stringify(path)} must be between 1 byte and 10 MiB`);
    }
    files.set(path, sizeBytes);
  }
  if (!seen.has(INFO_CSV_PATH)) {
    invalid("info.csv is missing from the zip root");
  }
  return files;
}

function parseInfoRows(infoCsv: string): Record<string, string>[] {
  const withoutBom = infoCsv.startsWith(BYTE_ORDER_MARK) ? infoCsv.slice(1) : infoCsv;
  // The generator ends CRLF rows with one bare LF. Papa detects CRLF and would keep that
  // LF inside the last field, so drop trailing line breaks first.
  const text = withoutBom.replace(TRAILING_LINE_BREAKS_PATTERN, "");
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
  });
  const [parseError] = parsed.errors;
  if (parseError) {
    invalid(`info.csv row ${(parseError.row ?? 0) + 2} cannot be parsed`);
  }
  const columns = new Set(parsed.meta.fields);
  const missingColumn = requiredColumns.find((column) => !columns.has(column));
  if (missingColumn !== undefined) {
    invalid(`info.csv has no ${missingColumn} column`);
  }
  return parsed.data;
}

function toCertificate(raw: Record<string, string>, rowNumber: number): ArchiveCertificate {
  const values = Object.fromEntries(
    requiredColumns.map((column) => [column, unescapeFormula(raw[column] ?? "")]),
  );
  const result = infoRowSchema.safeParse(values);
  if (!result.success) {
    const field = result.error.issues[0]?.path.join(".") ?? "a column";
    invalid(`info.csv row ${rowNumber} has an invalid ${field}`);
  }
  const row = result.data;
  const isParticipant = row.role === "PARTICIPANT";
  const memberIndexIsValid = isParticipant
    ? PARTICIPANT_MEMBER_INDEX_PATTERN.test(row.memberIndex)
    : row.memberIndex === "";
  if (!memberIndexIsValid) {
    invalid(`info.csv row ${rowNumber} has an invalid memberIndex`);
  }
  const match = CERTIFICATE_PATH_PATTERN.exec(row.certificate);
  const template = certificateTemplateSchema.safeParse(match?.groups?.template);
  if (!template.success) {
    invalid(`info.csv row ${rowNumber} has an invalid certificate path`);
  }
  if (template.data !== certificateTemplateFor(row.role, row.award)) {
    invalid(`info.csv row ${rowNumber} uses the wrong template for its role and award`);
  }
  return {
    award: row.award,
    fullName: row.fullName,
    fullNameEn: row.fullNameEn,
    memberIndex: isParticipant ? Number(row.memberIndex) : null,
    personId: row.personId,
    role: row.role,
    teamCode: row.teamCode,
    teamId: row.teamId,
    teamName: row.teamName,
    template: template.data,
    zipPath: row.certificate,
  };
}

/**
 * Checks the zip entry list against info.csv. Every info.csv row must point at a PDF in
 * the zip, and every PDF in the zip must belong to exactly one row.
 */
export function readCertificateArchive(
  input: Pick<StartCertificateUploadInput, "entries" | "infoCsv">,
): ArchiveCertificate[] {
  const files = readEntries(input.entries);
  const rows = parseInfoRows(input.infoCsv);
  if (rows.length === 0) {
    invalid("info.csv has no certificate rows");
  }
  if (rows.length > MAX_CERTIFICATE_COUNT) {
    invalid(`info.csv has more than ${MAX_CERTIFICATE_COUNT} rows`);
  }
  const recipients = new Set<string>();
  const paths = new Set<string>();
  const certificates = rows.map((raw, index) => {
    const rowNumber = index + 2;
    const certificate = toCertificate(raw, rowNumber);
    const recipient = `${certificate.role}:${certificate.teamId}:${certificate.personId}`;
    if (recipients.has(recipient)) {
      invalid(`info.csv row ${rowNumber} repeats a recipient`);
    }
    if (paths.has(certificate.zipPath)) {
      invalid(`info.csv row ${rowNumber} repeats a certificate path`);
    }
    if (!files.has(certificate.zipPath)) {
      invalid(`info.csv row ${rowNumber} points at a PDF that is not in the zip`);
    }
    recipients.add(recipient);
    paths.add(certificate.zipPath);
    return certificate;
  });
  const unreferenced = [...files.keys()].find((path) => !paths.has(path));
  if (unreferenced !== undefined) {
    invalid(`entry ${JSON.stringify(unreferenced)} is not listed in info.csv`);
  }
  return certificates;
}

// certificates/<setId>/<template>/<file>.pdf
export function certificateObjectKey(setId: string, zipPath: string): string {
  return `certificates/${setId}/${zipPath.slice("cert/".length)}`;
}
