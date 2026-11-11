import { call } from "@orpc/server";
import { describe, expect, it } from "vitest";

import type {
  CertificateActivation,
  CertificateRecipient,
  CertificateRepository,
  CertificateStorageObject,
  CertificateUploadMode,
  FileStorage,
  NewCertificate,
  NewCertificateSet,
  StoredCertificate,
  TeamRepository,
} from "../../../index";
import { createAppRouter } from "../../../index";
import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
  createUnusedStaffDiscordLinkService,
  createUnusedTeamRepository,
} from "../../../__test__/test-support";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_TEAM_ID = "11111111-1111-4111-8111-111111111112";
const PARTICIPANT_ID = "22222222-2222-4222-8222-222222222221";
const SECOND_PARTICIPANT_ID = "22222222-2222-4222-8222-222222222222";
const ADVISOR_ID = "33333333-3333-4333-8333-333333333331";
const REMOVED_PERSON_ID = "22222222-2222-4222-8222-222222222229";
const STAFF_ID = "staff-1";
const UPLOADED_AT = new Date("2026-11-01T03:00:00.000Z");

const participant: CertificateRecipient = {
  award: "ADVANCED_TO_ROUND_2",
  email: "alpha.one@example.com",
  firstNameEn: "Alpha",
  firstNameTh: "อัลฟา",
  lastNameEn: "One",
  lastNameTh: "หนึ่ง",
  memberIndex: 1,
  middleNameEn: null,
  middleNameTh: null,
  personId: PARTICIPANT_ID,
  role: "PARTICIPANT",
  school: "Example School",
  teamId: TEAM_ID,
  teamIndex: 1,
  teamName: "Team Example",
  titleEn: "Mr.",
  titleTh: "นาย",
};
const secondParticipant: CertificateRecipient = {
  ...participant,
  email: "beta.two@example.com",
  firstNameEn: "Beta",
  firstNameTh: "เบตา",
  lastNameEn: "Two",
  lastNameTh: "สอง",
  memberIndex: 2,
  personId: SECOND_PARTICIPANT_ID,
};
const advisor: CertificateRecipient = {
  ...participant,
  email: "gamma.advisor@example.com",
  firstNameEn: "Gamma",
  firstNameTh: "แกมมา",
  lastNameEn: "Advisor",
  lastNameTh: "ที่ปรึกษา",
  memberIndex: null,
  personId: ADVISOR_ID,
  role: "ADVISOR",
};

interface InfoRow {
  award: string;
  certificate: string;
  fullName: string;
  fullNameEn: string;
  memberIndex: string;
  personId: string;
  role: string;
  teamCode: string;
  teamId: string;
  teamName: string;
}

const PARTICIPANT_PDF = "cert/semi-final/BH001-26_1_Alpha-One.pdf";
const SECOND_PARTICIPANT_PDF = "cert/semi-final/BH001-26_2_Beta-Two.pdf";
const ADVISOR_PDF = "cert/appreciation/BH001-26_advisor_Gamma-Advisor.pdf";

const participantRow: InfoRow = {
  award: "ADVANCED_TO_ROUND_2",
  certificate: PARTICIPANT_PDF,
  fullName: "อัลฟา หนึ่ง",
  fullNameEn: "Alpha One",
  memberIndex: "1",
  personId: PARTICIPANT_ID,
  role: "PARTICIPANT",
  teamCode: "BH001/26",
  teamId: TEAM_ID,
  teamName: "Team Example",
};
const secondParticipantRow: InfoRow = {
  ...participantRow,
  certificate: SECOND_PARTICIPANT_PDF,
  fullName: "เบตา สอง",
  fullNameEn: "Beta Two",
  memberIndex: "2",
  personId: SECOND_PARTICIPANT_ID,
};
const advisorRow: InfoRow = {
  ...participantRow,
  certificate: ADVISOR_PDF,
  fullName: "แกมมา ที่ปรึกษา",
  fullNameEn: "Gamma Advisor",
  memberIndex: "",
  personId: ADVISOR_ID,
  role: "ADVISOR",
};

const infoColumns = [
  "certificateType",
  "role",
  "teamId",
  "teamCode",
  "teamName",
  "personId",
  "memberIndex",
  "fullName",
  "fullNameEn",
  "award",
  "certificate",
] as const;

// Same shape as packages/certificate: BOM, CRLF rows from Papa.unparse, then one bare LF.
function createInfoCsv(rows: readonly InfoRow[]): string {
  const lines = rows.map((row) =>
    infoColumns.map((column) => (column === "certificateType" ? "PARTICIPATION" : row[column])),
  );
  return `﻿${[infoColumns, ...lines].map((line) => line.join(",")).join("\r\n")}\n`;
}

function entriesFor(rows: readonly InfoRow[]) {
  return [
    { path: "info.csv", sizeBytes: 512 },
    { path: "cert/", sizeBytes: 0 },
    ...rows.map((row) => ({ path: row.certificate, sizeBytes: 460_000 })),
  ];
}

function startInput(rows: readonly InfoRow[], overrides: Record<string, unknown> = {}) {
  return {
    entries: entriesFor(rows),
    infoCsv: createInfoCsv(rows),
    mode: "REPLACE" as CertificateUploadMode,
    sourceName: "certificates.zip",
    sourceSizeBytes: 300_000_000,
    ...overrides,
  };
}

function pdf(path: string, body = "%PDF-1.7\ncertificate"): { file: File; path: string } {
  return { file: new File([body], path.split("/").at(-1) ?? "file.pdf"), path };
}

interface FakeSet extends NewCertificateSet {
  activatedAt: Date | null;
  status: "ACTIVE" | "UPLOADING";
  uploadedCount: number;
}

function toCertificateSet(set: FakeSet) {
  return {
    certificateCount: set.certificateCount,
    id: set.id,
    mode: set.mode,
    sourceName: set.sourceName,
    sourceSizeBytes: set.sourceSizeBytes,
    uploadedAt: set.activatedAt ?? UPLOADED_AT,
    uploadedBy: { id: STAFF_ID, name: "Staff Example" },
    uploadedCount: set.uploadedCount,
  };
}

function recipientKeyOf(item: { personId: string; role: string; teamId: string }): string {
  return `${item.role}:${item.teamId}:${item.personId}`;
}

function toLocation(certificate: CertificateStorageObject): CertificateStorageObject {
  return { bucket: certificate.bucket, objectKey: certificate.objectKey };
}

function createRig(recipients: CertificateRecipient[]) {
  const sets = new Map<string, FakeSet>();
  const stored = new Map<string, StoredCertificate & { setId: string }>();
  const uploadedKeys: string[] = [];
  const deletedKeys: string[] = [];
  const signedUrls: { disposition: string | undefined; objectKey: string }[] = [];
  let certificateSequence = 0;
  let failStorage = false;

  function certificatesOf(setId: string) {
    return [...stored.values()].filter((certificate) => certificate.setId === setId);
  }

  function removeSet(setId: string): CertificateStorageObject[] {
    const removed = certificatesOf(setId);
    for (const certificate of removed) {
      stored.delete(certificate.id);
    }
    sets.delete(setId);
    return removed.filter((certificate) => certificate.storedAt !== null).map(toLocation);
  }

  const repository: CertificateRepository = {
    activate: async (setId): Promise<CertificateActivation> => {
      const set = sets.get(setId);
      if (set?.status !== "UPLOADING") {
        return await Promise.resolve({ status: "NOT_FOUND" });
      }
      const missing = certificatesOf(setId).filter((item) => item.storedAt === null).length;
      if (missing > 0) {
        return { missing, status: "INCOMPLETE" };
      }
      const previous = [...sets.values()].find((item) => item.status === "ACTIVE");
      if (set.mode === "MERGE" && previous?.id !== set.baseSetId) {
        return { status: "BASE_CHANGED" };
      }
      if (set.mode === "MERGE" && previous) {
        const listed = new Set(certificatesOf(setId).map(recipientKeyOf));
        for (const certificate of certificatesOf(previous.id)) {
          if (!listed.has(recipientKeyOf(certificate))) {
            certificate.setId = setId;
          }
        }
      }
      set.certificateCount = certificatesOf(setId).length;
      const replaced = previous
        ? {
            certificateCount: previous.certificateCount,
            objects: removeSet(previous.id),
            setId: previous.id,
          }
        : null;
      set.status = "ACTIVE";
      set.activatedAt = UPLOADED_AT;
      return { replaced, set: toCertificateSet(set), status: "ACTIVATED" };
    },
    createUpload: async (set, certificates: NewCertificate[]) => {
      const abandoned: CertificateStorageObject[] = [];
      for (const existing of sets.values()) {
        if (existing.status === "UPLOADING") {
          abandoned.push(...removeSet(existing.id));
        }
      }
      sets.set(set.id, {
        ...set,
        activatedAt: null,
        status: "UPLOADING",
        uploadedCount: set.certificateCount,
      });
      for (const certificate of certificates) {
        certificateSequence += 1;
        const id = `44444444-4444-4444-8444-${String(certificateSequence).padStart(12, "0")}`;
        stored.set(id, { ...certificate, id, setId: set.id, sizeBytes: null, storedAt: null });
      }
      return await Promise.resolve(abandoned);
    },
    findActive: async () => {
      const set = [...sets.values()].find((item) => item.status === "ACTIVE");
      if (!set) {
        return await Promise.resolve(null);
      }
      return { certificates: certificatesOf(set.id), set: toCertificateSet(set) };
    },
    findActiveCertificate: async (id) => {
      const certificate = stored.get(id);
      const isActive =
        certificate !== undefined && sets.get(certificate.setId)?.status === "ACTIVE";
      return await Promise.resolve(isActive ? certificate : null);
    },
    findUploading: async (setId) => {
      const set = sets.get(setId);
      return await Promise.resolve(set?.status === "UPLOADING" ? certificatesOf(setId) : null);
    },
    markStored: async (setId, items) => {
      for (const item of items) {
        const certificate = stored.get(item.id);
        if (certificate?.setId === setId) {
          stored.set(item.id, { ...certificate, sizeBytes: item.sizeBytes, storedAt: UPLOADED_AT });
        }
      }
      await Promise.resolve();
    },
  };

  const storage: FileStorage = {
    bucket: "uploads",
    delete: async ({ objectKey }) => {
      deletedKeys.push(objectKey);
      await Promise.resolve();
    },
    getDownloadUrl: async ({ disposition, objectKey }) => {
      signedUrls.push({ disposition, objectKey });
      return await Promise.resolve(`https://files.example/${objectKey}`);
    },
    upload: async ({ objectKey }) => {
      if (failStorage) {
        throw new Error("storage offline");
      }
      uploadedKeys.push(objectKey);
      await Promise.resolve();
    },
  };

  const teams: TeamRepository = {
    ...createUnusedTeamRepository(),
    listCertificateRecipients: async () => await Promise.resolve(recipients),
  };

  return {
    deletedKeys,
    failStorage: () => {
      failStorage = true;
    },
    recipients,
    repository,
    signedUrls,
    storage,
    teams,
    uploadedKeys,
  };
}

type Rig = ReturnType<typeof createRig>;

function createRouter(rig: Rig, role = "registrationStaff") {
  return createAppRouter({
    auth: createTestAuthReader(createTestSession({ user: { id: STAFF_ID, role } })),
    certificates: rig.repository,
    fileStorage: rig.storage,
    staffDiscordLinkService: createUnusedStaffDiscordLinkService(),
    teams: rig.teams,
  });
}

describe("certificate overview", () => {
  it("lists every expected recipient as missing before any zip is uploaded", async () => {
    const rig = createRig([participant, advisor]);
    const { context } = createTestContext();

    const overview = await call(createRouter(rig).certificates.overview, undefined, { context });

    expect(overview.set).toBeNull();
    expect(overview.summary).toStrictEqual({
      available: 0,
      expected: 2,
      extra: 0,
      mismatched: 0,
      missing: 2,
    });
    expect(
      overview.rows.map((row) => ({
        certificate: row.certificate,
        fullName: row.fullName,
        status: row.status,
        teamCode: row.teamCode,
        template: row.template,
      })),
    ).toStrictEqual([
      {
        certificate: null,
        fullName: "อัลฟา หนึ่ง",
        status: "MISSING",
        teamCode: "BH001/26",
        template: "semi-final",
      },
      {
        certificate: null,
        fullName: "แกมมา ที่ปรึกษา",
        status: "MISSING",
        teamCode: "BH001/26",
        template: "appreciation",
      },
    ]);
  });
});

async function uploadAll(
  rig: Rig,
  rows: readonly InfoRow[],
  sourceName = "certificates.zip",
  mode: CertificateUploadMode = "REPLACE",
) {
  const { context } = createTestContext();
  const router = createRouter(rig);
  const started = await call(
    router.certificates.startUpload,
    startInput(rows, { mode, sourceName }),
    { context },
  );
  await call(
    router.certificates.uploadFiles,
    { files: rows.map((row) => pdf(row.certificate)), setId: started.setId },
    { context },
  );
  const set = await call(router.certificates.completeUpload, { setId: started.setId }, { context });
  return { set, setId: started.setId };
}

async function overviewOf(rig: Rig) {
  const { context } = createTestContext();
  return await call(createRouter(rig).certificates.overview, undefined, { context });
}

describe("certificate upload", () => {
  it("stores every PDF under its set and marks the recipients available", async () => {
    const rig = createRig([participant, advisor]);

    const { set, setId } = await uploadAll(rig, [participantRow, advisorRow]);
    const overview = await overviewOf(rig);

    expect(rig.uploadedKeys.toSorted()).toStrictEqual([
      `certificates/${setId}/appreciation/BH001-26_advisor_Gamma-Advisor.pdf`,
      `certificates/${setId}/semi-final/BH001-26_1_Alpha-One.pdf`,
    ]);
    expect(set).toMatchObject({ certificateCount: 2, sourceName: "certificates.zip" });
    expect(overview.set).toStrictEqual({
      certificateCount: 2,
      id: setId,
      mode: "REPLACE",
      sourceName: "certificates.zip",
      sourceSizeBytes: 300_000_000,
      uploadedAt: UPLOADED_AT,
      uploadedBy: { id: STAFF_ID, name: "Staff Example" },
      uploadedCount: 2,
    });
    expect(overview.summary).toStrictEqual({
      available: 2,
      expected: 2,
      extra: 0,
      mismatched: 0,
      missing: 0,
    });
  });

  it("reports how many files are still waiting after a partial batch", async () => {
    const rig = createRig([participant, advisor]);
    const { context } = createTestContext();
    const router = createRouter(rig);
    const { setId } = await call(
      router.certificates.startUpload,
      startInput([participantRow, advisorRow]),
      { context },
    );

    const result = await call(
      router.certificates.uploadFiles,
      { files: [pdf(PARTICIPANT_PDF)], setId },
      { context },
    );

    expect(result).toStrictEqual({ remaining: 1, stored: 1 });
  });

  it("keeps the previous set active when an upload is completed before every file arrives", async () => {
    const rig = createRig([participant, advisor]);
    const first = await uploadAll(rig, [participantRow, advisorRow], "first.zip");
    const { context } = createTestContext();
    const router = createRouter(rig);
    const { setId } = await call(
      router.certificates.startUpload,
      startInput([participantRow, advisorRow], { sourceName: "second.zip" }),
      { context },
    );
    await call(router.certificates.uploadFiles, { files: [pdf(ADVISOR_PDF)], setId }, { context });

    await expect(
      call(router.certificates.completeUpload, { setId }, { context }),
    ).rejects.toMatchObject({ code: "CERTIFICATE_UPLOAD_INCOMPLETE", status: 409 });
    const overview = await overviewOf(rig);
    expect(overview.set).toMatchObject({ id: first.setId, sourceName: "first.zip" });
  });

  it("replaces the whole previous set and deletes its stored files", async () => {
    const rig = createRig([participant, advisor]);
    const first = await uploadAll(rig, [participantRow, advisorRow], "first.zip");

    const second = await uploadAll(rig, [participantRow], "second.zip");
    const overview = await overviewOf(rig);

    expect(rig.deletedKeys.toSorted()).toStrictEqual([
      `certificates/${first.setId}/appreciation/BH001-26_advisor_Gamma-Advisor.pdf`,
      `certificates/${first.setId}/semi-final/BH001-26_1_Alpha-One.pdf`,
    ]);
    expect(overview.set).toMatchObject({ id: second.setId, sourceName: "second.zip" });
    expect(overview.summary).toMatchObject({ available: 1, missing: 1 });
  });

  it("records the replacement in the audit log", async () => {
    const rig = createRig([participant]);
    const { context, log } = createTestContext();
    const router = createRouter(rig);
    const { setId } = await call(router.certificates.startUpload, startInput([participantRow]), {
      context,
    });
    await call(
      router.certificates.uploadFiles,
      { files: [pdf(PARTICIPANT_PDF)], setId },
      {
        context,
      },
    );

    await call(router.certificates.completeUpload, { setId }, { context });

    expect(log.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "certificates.replaced",
        changes: {
          after: { certificateCount: 1, mode: "REPLACE", setId, uploadedCount: 1 },
          before: { certificateCount: 0, setId: null },
        },
        outcome: "success",
      }),
    );
  });

  it("drops an abandoned upload and its stored files when a new upload starts", async () => {
    const rig = createRig([participant]);
    const { context } = createTestContext();
    const router = createRouter(rig);
    const abandoned = await call(router.certificates.startUpload, startInput([participantRow]), {
      context,
    });
    await call(
      router.certificates.uploadFiles,
      { files: [pdf(PARTICIPANT_PDF)], setId: abandoned.setId },
      { context },
    );

    await call(router.certificates.startUpload, startInput([participantRow]), { context });

    expect(rig.deletedKeys).toStrictEqual([
      `certificates/${abandoned.setId}/semi-final/BH001-26_1_Alpha-One.pdf`,
    ]);
    await expect(
      call(router.certificates.completeUpload, { setId: abandoned.setId }, { context }),
    ).rejects.toMatchObject({ code: "CERTIFICATE_UPLOAD_NOT_FOUND", status: 404 });
  });

  it("rejects bytes that are not a PDF", async () => {
    const rig = createRig([participant]);
    const { context } = createTestContext();
    const router = createRouter(rig);
    const { setId } = await call(router.certificates.startUpload, startInput([participantRow]), {
      context,
    });

    await expect(
      call(
        router.certificates.uploadFiles,
        { files: [pdf(PARTICIPANT_PDF, "<html>not a pdf</html>")], setId },
        { context },
      ),
    ).rejects.toMatchObject({ code: "CERTIFICATE_FILE_INVALID", status: 400 });
    expect(rig.uploadedKeys).toStrictEqual([]);
  });

  it("rejects a file whose path is not part of the upload", async () => {
    const rig = createRig([participant]);
    const { context } = createTestContext();
    const router = createRouter(rig);
    const { setId } = await call(router.certificates.startUpload, startInput([participantRow]), {
      context,
    });

    await expect(
      call(router.certificates.uploadFiles, { files: [pdf(ADVISOR_PDF)], setId }, { context }),
    ).rejects.toMatchObject({ code: "CERTIFICATE_FILE_INVALID", status: 400 });
  });

  it("reports storage outages as unavailable", async () => {
    const rig = createRig([participant]);
    const { context } = createTestContext();
    const router = createRouter(rig);
    const { setId } = await call(router.certificates.startUpload, startInput([participantRow]), {
      context,
    });
    rig.failStorage();

    await expect(
      call(router.certificates.uploadFiles, { files: [pdf(PARTICIPANT_PDF)], setId }, { context }),
    ).rejects.toMatchObject({ code: "FILE_STORAGE_UNAVAILABLE", status: 503 });
  });

  it("refuses users without registration access", async () => {
    const rig = createRig([participant]);
    const { context } = createTestContext();

    await expect(
      call(createRouter(rig, "user").certificates.startUpload, startInput([participantRow]), {
        context,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("certificate partial update", () => {
  const RENAMED_PARTICIPANT_PDF = "cert/semi-final/BH001-26_1_Alpha-Renamed.pdf";

  it("replaces only the recipients in the zip and keeps every other certificate", async () => {
    const rig = createRig([
      { ...participant, firstNameEn: "Alpha", lastNameEn: "Renamed" },
      advisor,
    ]);
    const first = await uploadAll(rig, [participantRow, advisorRow], "first.zip");
    const before = await overviewOf(rig);
    expect(before.summary).toMatchObject({ available: 1, mismatched: 1 });

    const update = await uploadAll(
      rig,
      [{ ...participantRow, certificate: RENAMED_PARTICIPANT_PDF, fullNameEn: "Alpha Renamed" }],
      "fix-alpha.zip",
      "MERGE",
    );
    const after = await overviewOf(rig);

    expect(after.set).toMatchObject({
      certificateCount: 2,
      id: update.setId,
      mode: "MERGE",
      sourceName: "fix-alpha.zip",
      uploadedCount: 1,
    });
    expect(after.summary).toStrictEqual({
      available: 2,
      expected: 2,
      extra: 0,
      mismatched: 0,
      missing: 0,
    });
    expect(rig.deletedKeys).toStrictEqual([
      `certificates/${first.setId}/semi-final/BH001-26_1_Alpha-One.pdf`,
    ]);
  });

  it("keeps serving a kept certificate from its original file", async () => {
    const rig = createRig([participant, advisor]);
    const first = await uploadAll(rig, [participantRow, advisorRow], "first.zip");
    await uploadAll(rig, [participantRow], "fix-alpha.zip", "MERGE");
    const { rows } = await overviewOf(rig);
    const advisorCertificate = rows.find((row) => row.role === "ADVISOR");
    const { context } = createTestContext();

    const { url } = await call(
      createRouter(rig).certificates.downloadUrl,
      { disposition: "inline", id: advisorCertificate?.certificate?.id ?? "" },
      { context },
    );

    expect(url).toBe(
      `https://files.example/certificates/${first.setId}/appreciation/BH001-26_advisor_Gamma-Advisor.pdf`,
    );
  });

  it("adds a certificate for a recipient who had none", async () => {
    const rig = createRig([participant, secondParticipant]);
    await uploadAll(rig, [participantRow], "first.zip");

    await uploadAll(rig, [secondParticipantRow], "add-beta.zip", "MERGE");
    const overview = await overviewOf(rig);

    expect(overview.summary).toMatchObject({ available: 2, missing: 0 });
    expect(overview.set).toMatchObject({ certificateCount: 2, uploadedCount: 1 });
    expect(rig.deletedKeys).toStrictEqual([]);
  });

  it("records a partial update in the audit log", async () => {
    const rig = createRig([participant, advisor]);
    const first = await uploadAll(rig, [participantRow, advisorRow], "first.zip");
    const { context, log } = createTestContext();
    const router = createRouter(rig);
    const { setId } = await call(
      router.certificates.startUpload,
      startInput([participantRow], { mode: "MERGE" }),
      { context },
    );
    await call(
      router.certificates.uploadFiles,
      { files: [pdf(PARTICIPANT_PDF)], setId },
      { context },
    );

    await call(router.certificates.completeUpload, { setId }, { context });

    expect(log.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "certificates.replaced",
        changes: {
          after: { certificateCount: 2, mode: "MERGE", setId, uploadedCount: 1 },
          before: { certificateCount: 2, setId: first.setId },
        },
        outcome: "success",
      }),
    );
  });

  it("refuses a partial update when no set is active", async () => {
    const rig = createRig([participant]);
    const { context } = createTestContext();

    await expect(
      call(
        createRouter(rig).certificates.startUpload,
        startInput([participantRow], { mode: "MERGE" }),
        { context },
      ),
    ).rejects.toMatchObject({ code: "CERTIFICATE_SET_NOT_ACTIVE", status: 409 });
  });

  it("refuses a partial zip that reuses the file path of a kept recipient", async () => {
    const rig = createRig([participant, secondParticipant]);
    await uploadAll(rig, [participantRow, secondParticipantRow], "first.zip");
    const { context } = createTestContext();

    await expect(
      call(
        createRouter(rig).certificates.startUpload,
        startInput([{ ...participantRow, certificate: SECOND_PARTICIPANT_PDF }], { mode: "MERGE" }),
        { context },
      ),
    ).rejects.toMatchObject({
      code: "CERTIFICATE_ARCHIVE_INVALID",
      message:
        "Certificate zip is invalid: info.csv row 2 uses a certificate path that another recipient in the active set uses",
      status: 400,
    });
  });
});

describe("certificate zip validation", () => {
  const invalidCases: { name: string; overrides: () => Record<string, unknown> }[] = [
    {
      name: "a zip without info.csv",
      overrides: () => ({
        entries: entriesFor([participantRow]).filter((entry) => entry.path !== "info.csv"),
      }),
    },
    {
      name: "a row whose PDF is not in the zip",
      overrides: () => ({ entries: entriesFor([]) }),
    },
    {
      name: "a path that leaves the zip root",
      overrides: () => ({
        entries: [...entriesFor([participantRow]), { path: "cert/../../etc/passwd", sizeBytes: 1 }],
      }),
    },
    {
      name: "an absolute path",
      overrides: () => ({
        entries: [...entriesFor([participantRow]), { path: "/cert/x.pdf", sizeBytes: 1 }],
      }),
    },
    {
      name: "a file that is not a PDF",
      overrides: () => ({
        entries: [
          ...entriesFor([participantRow]),
          { path: "cert/semi-final/run.sh", sizeBytes: 1 },
        ],
      }),
    },
    {
      name: "a PDF that info.csv does not list",
      overrides: () => ({ entries: entriesFor([participantRow, advisorRow]) }),
    },
    {
      name: "a PDF over the size limit",
      overrides: () => ({
        entries: entriesFor([participantRow]).map((entry) =>
          entry.path === PARTICIPANT_PDF ? { ...entry, sizeBytes: 11 * 1024 * 1024 } : entry,
        ),
      }),
    },
    {
      name: "a template that does not match the award",
      overrides: () => {
        const row = { ...participantRow, certificate: "cert/first/BH001-26_1_Alpha-One.pdf" };
        return { entries: entriesFor([row]), infoCsv: createInfoCsv([row]) };
      },
    },
    {
      name: "a repeated recipient",
      overrides: () => {
        const repeat = { ...participantRow, certificate: SECOND_PARTICIPANT_PDF };
        return {
          entries: entriesFor([participantRow, repeat]),
          infoCsv: createInfoCsv([participantRow, repeat]),
        };
      },
    },
  ];

  it.each(invalidCases)("rejects $name", async ({ overrides }) => {
    const rig = createRig([participant]);
    const { context } = createTestContext();

    await expect(
      call(createRouter(rig).certificates.startUpload, startInput([participantRow], overrides()), {
        context,
      }),
    ).rejects.toMatchObject({ code: "CERTIFICATE_ARCHIVE_INVALID", status: 400 });
  });

  it("accepts macOS metadata and formula-escaped values written by the export", async () => {
    const rig = createRig([participant]);
    const { context } = createTestContext();
    const row = { ...participantRow, teamName: "'=Team" };

    const result = await call(
      createRouter(rig).certificates.startUpload,
      startInput([row], {
        entries: [
          ...entriesFor([row]),
          { path: "__MACOSX/._info.csv", sizeBytes: 10 },
          { path: "cert/.DS_Store", sizeBytes: 10 },
        ],
      }),
      { context },
    );

    expect(result.paths).toStrictEqual([PARTICIPANT_PDF]);
  });
});

describe("certificate status", () => {
  it("flags certificates whose award, name, or team name changed since the export", async () => {
    const renamed = { ...participant, award: "FIRST_PLACE" as const, firstNameEn: "Alfa" };
    const retitled = { ...secondParticipant, teamName: "Team Renamed" };
    const rig = createRig([participant, secondParticipant]);
    await uploadAll(rig, [participantRow, secondParticipantRow]);
    rig.recipients.splice(0, 2, renamed, retitled);

    const overview = await overviewOf(rig);

    expect(
      overview.rows.map((row) => ({ reasons: row.mismatchReasons, status: row.status })),
    ).toStrictEqual([
      { reasons: ["AWARD_CHANGED", "NAME_CHANGED"], status: "MISMATCHED" },
      { reasons: ["TEAM_NAME_CHANGED"], status: "MISMATCHED" },
    ]);
    expect(overview.summary).toMatchObject({ available: 0, mismatched: 2 });
  });

  it("keeps a certificate available when the award changes but prints the same", async () => {
    const rig = createRig([participant]);
    await uploadAll(rig, [participantRow]);
    rig.recipients.splice(0, 1, { ...participant, award: "ROUND_2_PARTICIPATED" });

    const overview = await overviewOf(rig);

    expect(overview.rows.map((row) => row.status)).toStrictEqual(["AVAILABLE"]);
  });

  it("lists certificates of people who are no longer expected as extra", async () => {
    const rig = createRig([participant]);
    const removedRow = {
      ...secondParticipantRow,
      personId: REMOVED_PERSON_ID,
      teamId: OTHER_TEAM_ID,
    };
    await uploadAll(rig, [participantRow, removedRow]);

    const overview = await overviewOf(rig);

    expect(
      overview.rows.map((row) => ({ person: row.personId, status: row.status })),
    ).toStrictEqual([
      { person: PARTICIPANT_ID, status: "AVAILABLE" },
      { person: REMOVED_PERSON_ID, status: "EXTRA" },
    ]);
    expect(overview.summary).toMatchObject({ expected: 1, extra: 1 });
  });
});

describe("certificate download", () => {
  it("signs a short-lived URL that opens or saves the PDF", async () => {
    const rig = createRig([participant]);
    const { setId } = await uploadAll(rig, [participantRow]);
    const { rows } = await overviewOf(rig);
    const [row] = rows;
    const id = row?.certificate?.id ?? "";
    const { context, log } = createTestContext();
    const router = createRouter(rig);

    const viewed = await call(
      router.certificates.downloadUrl,
      { disposition: "inline", id },
      {
        context,
      },
    );
    await call(router.certificates.downloadUrl, { disposition: "attachment", id }, { context });

    const objectKey = `certificates/${setId}/semi-final/BH001-26_1_Alpha-One.pdf`;
    expect(viewed.url).toBe(`https://files.example/${objectKey}`);
    expect(rig.signedUrls).toStrictEqual([
      { disposition: "inline", objectKey },
      { disposition: "attachment", objectKey },
    ]);
    expect(log.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "certificate.accessed", outcome: "success" }),
    );
  });

  it("does not sign certificates outside the active set", async () => {
    const rig = createRig([participant]);
    const { context, log } = createTestContext();

    await expect(
      call(
        createRouter(rig).certificates.downloadUrl,
        { disposition: "inline", id: "44444444-4444-4444-8444-000000000099" },
        { context },
      ),
    ).rejects.toMatchObject({ code: "CERTIFICATE_NOT_FOUND", status: 404 });
    expect(log.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "certificate.accessed", outcome: "failure" }),
    );
  });
});
