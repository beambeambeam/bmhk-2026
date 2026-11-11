import { randomUUID } from "node:crypto";

import { formatTeamCode } from "../teams/teams.rules";
import type { CertificateRecipient } from "../teams/teams.schema";
import { createFileStorageUnavailableError } from "../files/files.service";
import type { FileStorage } from "../files/files.storage";
import { certificateObjectKey, readCertificateArchive } from "./certificates.archive";
import type { ArchiveCertificate } from "./certificates.archive";
import {
  createCertificateArchiveInvalidError,
  createCertificateFileInvalidError,
  createCertificateNotFoundError,
  createCertificateSetChangedError,
  createCertificateSetNotActiveError,
  createCertificateUploadIncompleteError,
  createCertificateUploadNotFoundError,
} from "./certificates.errors";
import type { CertificateRepository, ReplacedCertificateSet } from "./certificates.repository";
import { MAX_CERTIFICATE_PDF_BYTES } from "./certificates.rules";
import { certificateTemplateFor } from "./certificates.schema";
import type {
  CertificateDownloadInput,
  CertificateMismatchReason,
  CertificateOverview,
  CertificateOverviewRow,
  CertificateSet,
  CertificateStorageObject,
  OwnCertificates,
  StartCertificateUploadInput,
  StoredCertificate,
  UploadCertificateFilesInput,
} from "./certificates.schema";

const PDF_CONTENT_TYPE = "application/pdf";
const PDF_SIGNATURE = new TextEncoder().encode("%PDF-");

export interface CertificateServiceLog {
  error: (error: Error) => void;
  set: (entry: Record<string, unknown>) => void;
}

export interface CertificateActivationResult {
  replaced: Omit<ReplacedCertificateSet, "objects"> | null;
  set: CertificateSet;
}

export interface CertificateDownload {
  certificate: StoredCertificate;
  url: string;
}

export interface CertificateService {
  completeUpload: (
    setId: string,
    log: CertificateServiceLog,
  ) => Promise<CertificateActivationResult>;
  downloadUrl: (input: CertificateDownloadInput) => Promise<CertificateDownload>;
  /** Signs a URL only for a certificate that the user's team can see in `listOwn`. */
  ownDownloadUrl: (userId: string, input: CertificateDownloadInput) => Promise<CertificateDownload>;
  listOwn: (userId: string) => Promise<OwnCertificates>;
  overview: () => Promise<CertificateOverview>;
  startUpload: (
    actorId: string,
    input: StartCertificateUploadInput,
    log: CertificateServiceLog,
  ) => Promise<{ paths: string[]; setId: string }>;
  uploadFiles: (
    input: UploadCertificateFilesInput,
  ) => Promise<{ remaining: number; stored: number }>;
}

export interface CertificateServiceDependencies {
  createId?: () => string;
  /** Lists every expected recipient, or only the team that `ownerUserId` owns. */
  listRecipients: (ownerUserId?: string) => Promise<CertificateRecipient[]>;
  repository: CertificateRepository;
  storage: FileStorage;
}

function recipientKey(item: { personId: string; role: string; teamId: string }): string {
  return `${item.role}:${item.teamId}:${item.personId}`;
}

function joinName(...parts: readonly (string | null)[]): string {
  return parts.filter((part) => part !== null).join(" ");
}

function fileNameOf(zipPath: string): string {
  return zipPath.split("/").at(-1) ?? zipPath;
}

function startsWithPdfSignature(bytes: Uint8Array): boolean {
  return PDF_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

// The printed award follows the template alone: awards that share a template print the
// same wording, so only a template change needs a new PDF.
function mismatchReasons(
  recipient: CertificateRecipient,
  certificate: StoredCertificate,
): CertificateMismatchReason[] {
  const reasons: CertificateMismatchReason[] = [];
  if (certificate.template !== certificateTemplateFor(recipient.role, recipient.award)) {
    reasons.push("AWARD_CHANGED");
  }
  const fullName = joinName(recipient.firstNameTh, recipient.middleNameTh, recipient.lastNameTh);
  const fullNameEn = joinName(recipient.firstNameEn, recipient.middleNameEn, recipient.lastNameEn);
  if (certificate.fullName !== fullName || certificate.fullNameEn !== fullNameEn) {
    reasons.push("NAME_CHANGED");
  }
  if (certificate.teamName !== recipient.teamName) {
    reasons.push("TEAM_NAME_CHANGED");
  }
  return reasons;
}

function toCertificateSummary(
  certificate: StoredCertificate,
): CertificateOverviewRow["certificate"] {
  return {
    award: certificate.award,
    id: certificate.id,
    sizeBytes: certificate.sizeBytes ?? 0,
    template: certificate.template,
  };
}

function toExpectedRow(
  recipient: CertificateRecipient,
  certificate: StoredCertificate | undefined,
): CertificateOverviewRow {
  const reasons = certificate ? mismatchReasons(recipient, certificate) : [];
  let status: CertificateOverviewRow["status"] = "MISSING";
  if (certificate) {
    status = reasons.length > 0 ? "MISMATCHED" : "AVAILABLE";
  }
  return {
    award: recipient.award,
    certificate: certificate ? toCertificateSummary(certificate) : null,
    fullName: joinName(recipient.firstNameTh, recipient.middleNameTh, recipient.lastNameTh),
    fullNameEn: joinName(recipient.firstNameEn, recipient.middleNameEn, recipient.lastNameEn),
    id: recipientKey(recipient),
    memberIndex: recipient.memberIndex,
    mismatchReasons: reasons,
    personId: recipient.personId,
    role: recipient.role,
    status,
    teamCode: formatTeamCode(recipient.teamIndex),
    teamId: recipient.teamId,
    teamName: recipient.teamName,
    template: certificateTemplateFor(recipient.role, recipient.award),
  };
}

function toExtraRow(certificate: StoredCertificate): CertificateOverviewRow {
  return {
    award: null,
    certificate: toCertificateSummary(certificate),
    fullName: certificate.fullName,
    fullNameEn: certificate.fullNameEn,
    id: recipientKey(certificate),
    memberIndex: certificate.memberIndex,
    mismatchReasons: [],
    personId: certificate.personId,
    role: certificate.role,
    status: "EXTRA",
    teamCode: certificate.teamCode,
    teamId: certificate.teamId,
    teamName: certificate.teamName,
    template: certificate.template,
  };
}

// A merge keeps the active rows it does not list, and zip paths must stay unique in a set.
// A listed row may reuse its own recipient's path, but not a kept recipient's path.
function assertNoKeptPathConflict(
  archive: readonly ArchiveCertificate[],
  active: readonly StoredCertificate[],
): void {
  const listed = new Set(archive.map(recipientKey));
  const keptPaths = new Set(
    active
      .filter((certificate) => !listed.has(recipientKey(certificate)))
      .map((certificate) => certificate.zipPath),
  );
  const index = archive.findIndex((certificate) => keptPaths.has(certificate.zipPath));
  if (index !== -1) {
    // Header is row 1.
    throw createCertificateArchiveInvalidError(
      `info.csv row ${index + 2} uses a certificate path that another recipient in the active set uses`,
    );
  }
}

function summarize(rows: readonly CertificateOverviewRow[]): CertificateOverview["summary"] {
  const summary = { available: 0, expected: 0, extra: 0, mismatched: 0, missing: 0 };
  for (const row of rows) {
    if (row.status === "EXTRA") {
      summary.extra += 1;
      continue;
    }
    summary.expected += 1;
    if (row.status === "AVAILABLE") {
      summary.available += 1;
    } else if (row.status === "MISMATCHED") {
      summary.mismatched += 1;
    } else {
      summary.missing += 1;
    }
  }
  return summary;
}

export function createCertificateService({
  createId = randomUUID,
  listRecipients,
  repository,
  storage,
}: CertificateServiceDependencies): CertificateService {
  async function deleteObjects(
    objects: readonly CertificateStorageObject[],
    log: CertificateServiceLog,
  ): Promise<void> {
    const results = await Promise.allSettled(
      objects.map(async (object) => {
        await storage.delete(object);
      }),
    );
    const failed = results.filter((result) => result.status === "rejected").length;
    if (failed > 0) {
      log.set({ certificates: { cleanupFailed: failed } });
      log.error(new Error("Certificate object cleanup failed"));
    }
  }

  async function signedUrlFor(
    certificate: StoredCertificate,
    disposition: CertificateDownloadInput["disposition"],
  ): Promise<CertificateDownload> {
    try {
      const url = await storage.getDownloadUrl({
        bucket: certificate.bucket,
        contentType: PDF_CONTENT_TYPE,
        disposition,
        objectKey: certificate.objectKey,
        originalName: fileNameOf(certificate.zipPath),
      });
      return { certificate, url };
    } catch (error) {
      throw createFileStorageUnavailableError(error);
    }
  }

  // Pairs the team's expected recipients with their PDFs. A PDF that no longer matches the
  // live data counts as not ready, the same rule the staff overview calls MISMATCHED.
  async function ownRecipients(userId: string) {
    const [recipients, stored] = await Promise.all([
      listRecipients(userId),
      repository.findActiveForTeamOwner(userId),
    ]);
    const byKey = new Map(stored.map((certificate) => [recipientKey(certificate), certificate]));
    return recipients.map((recipient) => {
      const certificate = byKey.get(recipientKey(recipient));
      const matches =
        certificate !== undefined && mismatchReasons(recipient, certificate).length === 0;
      return { certificate: matches ? certificate : null, recipient };
    });
  }

  async function storeFile(path: string, file: File, certificate: StoredCertificate) {
    if (file.size === 0 || file.size > MAX_CERTIFICATE_PDF_BYTES) {
      throw createCertificateFileInvalidError(path, "size must be between 1 byte and 10 MiB");
    }
    const body = new Uint8Array(await file.arrayBuffer());
    if (!startsWithPdfSignature(body)) {
      throw createCertificateFileInvalidError(path, "file is not a PDF");
    }
    try {
      await storage.upload({
        body,
        bucket: certificate.bucket,
        contentType: PDF_CONTENT_TYPE,
        objectKey: certificate.objectKey,
        originalName: fileNameOf(path),
      });
    } catch (error) {
      throw createFileStorageUnavailableError(error);
    }
    return { id: certificate.id, sizeBytes: body.byteLength };
  }

  return {
    completeUpload: async (setId, log) => {
      const activation = await repository.activate(setId);
      if (activation.status === "NOT_FOUND") {
        throw createCertificateUploadNotFoundError();
      }
      if (activation.status === "INCOMPLETE") {
        throw createCertificateUploadIncompleteError(activation.missing);
      }
      if (activation.status === "BASE_CHANGED") {
        throw createCertificateSetChangedError();
      }
      if (!activation.replaced) {
        return { replaced: null, set: activation.set };
      }
      const { objects, ...replaced } = activation.replaced;
      await deleteObjects(objects, log);
      return { replaced, set: activation.set };
    },
    downloadUrl: async ({ disposition, id }) => {
      const certificate = await repository.findActiveCertificate(id);
      if (!certificate) {
        throw createCertificateNotFoundError();
      }
      return await signedUrlFor(certificate, disposition);
    },
    listOwn: async (userId) => {
      const rows = await ownRecipients(userId);
      return {
        recipients: rows.map(({ certificate, recipient }) => ({
          certificate: certificate
            ? {
                fileName: fileNameOf(certificate.zipPath),
                id: certificate.id,
                sizeBytes: certificate.sizeBytes ?? 0,
              }
            : null,
          fullName: joinName(recipient.firstNameTh, recipient.middleNameTh, recipient.lastNameTh),
          memberIndex: recipient.memberIndex,
          personId: recipient.personId,
          role: recipient.role,
          template: certificateTemplateFor(recipient.role, recipient.award),
        })),
      };
    },
    overview: async () => {
      const [recipients, active] = await Promise.all([listRecipients(), repository.findActive()]);
      const stored = new Map(
        (active?.certificates ?? []).map((certificate) => [recipientKey(certificate), certificate]),
      );
      const expectedRows = recipients.map((recipient) => {
        const key = recipientKey(recipient);
        const certificate = stored.get(key);
        stored.delete(key);
        return toExpectedRow(recipient, certificate);
      });
      const rows = [...expectedRows, ...[...stored.values()].map(toExtraRow)];
      return { rows, set: active?.set ?? null, summary: summarize(rows) };
    },
    ownDownloadUrl: async (userId, { disposition, id }) => {
      const rows = await ownRecipients(userId);
      const certificate = rows.find((row) => row.certificate?.id === id)?.certificate;
      if (!certificate) {
        throw createCertificateNotFoundError();
      }
      return await signedUrlFor(certificate, disposition);
    },
    startUpload: async (actorId, input, log) => {
      const archive = readCertificateArchive(input);
      let baseSetId: string | null = null;
      if (input.mode === "MERGE") {
        const active = await repository.findActive();
        if (!active) {
          throw createCertificateSetNotActiveError();
        }
        assertNoKeptPathConflict(archive, active.certificates);
        baseSetId = active.set.id;
      }
      const setId = createId();
      const abandoned = await repository.createUpload(
        {
          baseSetId,
          certificateCount: archive.length,
          id: setId,
          mode: input.mode,
          sourceName: input.sourceName,
          sourceSizeBytes: input.sourceSizeBytes,
          uploadedBy: actorId,
        },
        archive.map((certificate) => ({
          ...certificate,
          bucket: storage.bucket,
          objectKey: certificateObjectKey(setId, certificate.zipPath),
        })),
      );
      await deleteObjects(abandoned, log);
      return { paths: archive.map((certificate) => certificate.zipPath), setId };
    },
    uploadFiles: async ({ files, setId }) => {
      const certificates = await repository.findUploading(setId);
      if (!certificates) {
        throw createCertificateUploadNotFoundError();
      }
      const byPath = new Map(certificates.map((certificate) => [certificate.zipPath, certificate]));
      const seen = new Set<string>();
      for (const { path } of files) {
        if (!byPath.has(path) || seen.has(path)) {
          throw createCertificateFileInvalidError(path, "path is not part of this upload");
        }
        seen.add(path);
      }
      const stored = await Promise.all(
        files.map(async ({ file, path }) => {
          const certificate = byPath.get(path);
          if (!certificate) {
            throw createCertificateFileInvalidError(path, "path is not part of this upload");
          }
          return await storeFile(path, file, certificate);
        }),
      );
      await repository.markStored(setId, stored);
      const remaining = certificates.filter(
        (certificate) => certificate.storedAt === null && !seen.has(certificate.zipPath),
      ).length;
      return { remaining, stored: stored.length };
    },
  };
}
