import { call } from "@orpc/server";
import type { DeleteObjectInput, GetPresignedInput, PutObjectInput } from "@bmhk-2026/s3";
import { describe, expect, it, vi } from "vitest";

import type { AuthReader, StoredFile, TeamAdvisor, TeamAdvisorRepository } from "../../../index";
import { createAppRouter } from "../../../index";
import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
  createUnusedFileRepository,
  createUnusedTeamRepository,
} from "../../../__test__/test-support";
import type { TeamAdvisorWithStoredDocuments } from "../team-advisors.repository";
import { createTeamAdvisorAlreadyExistsError } from "../team-advisors.service";

const s3Mocks = vi.hoisted(() => ({
  deleteObject: vi.fn<(input: DeleteObjectInput) => Promise<void>>(async () => {
    await Promise.resolve();
  }),
  getPresigned: vi.fn<(input: GetPresignedInput) => Promise<string>>(
    async () => await Promise.resolve("https://storage.test/document"),
  ),
  putObject: vi.fn<(input: PutObjectInput) => Promise<void>>(async () => {
    await Promise.resolve();
  }),
}));

vi.mock(import("@bmhk-2026/s3"), () => s3Mocks);

const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const ADVISOR_ID = "22222222-2222-4222-8222-222222222222";
const IDENTITY_FILE_ID = "33333333-3333-4333-8333-333333333333";
const TEACHER_STATUS_FILE_ID = "44444444-4444-4444-8444-444444444444";
const createdAt = new Date("2026-01-01T00:00:00.000Z");

const testAdvisor = {
  chronicConditionsAndFirstAidNotes: null,
  createdAt,
  dietaryRequirements: null,
  drugAllergies: null,
  email: "advisor@example.com",
  firstNameEn: "Advisor",
  firstNameTh: "อาจารย์",
  foodAllergies: null,
  id: ADVISOR_ID,
  identityDocumentFileId: null,
  lastNameEn: "One",
  lastNameTh: "หนึ่ง",
  lineId: null,
  middleNameEn: null,
  middleNameTh: null,
  phone: "080-000-0000",
  teacherStatusDocumentFileId: null,
  teamId: TEAM_ID,
  titleEn: "Mr.",
  titleTh: "นาย",
  updatedAt: createdAt,
} satisfies TeamAdvisor;

const identityFile = {
  bucket: "uploads",
  contentType: "application/pdf",
  id: IDENTITY_FILE_ID,
  objectKey: `team-advisors/${ADVISOR_ID}/documents/identity/${IDENTITY_FILE_ID}`,
  originalName: "identity.pdf",
  sizeBytes: 12,
  uploadedAt: new Date("2026-01-02T00:00:00.000Z"),
  uploadedBy: USER_ID,
} satisfies StoredFile;

const teacherStatusFile = {
  ...identityFile,
  id: TEACHER_STATUS_FILE_ID,
  objectKey: `team-advisors/${ADVISOR_ID}/documents/teacher-status/${TEACHER_STATUS_FILE_ID}`,
  originalName: "teacher-status.pdf",
} satisfies StoredFile;

function createTeamAdvisorRepository(
  overrides: Partial<TeamAdvisorRepository> = {},
): TeamAdvisorRepository {
  return {
    create:
      overrides.create ??
      (async (_userId, data) => await Promise.resolve({ ...testAdvisor, ...data })),
    findByTeamId:
      overrides.findByTeamId ??
      (async () =>
        await Promise.resolve({
          ...testAdvisor,
          identityDocument: null,
          teacherStatusDocument: null,
        })),
    replaceDocument:
      overrides.replaceDocument ??
      (async (_userId, _teamId, documentType, file) =>
        await Promise.resolve({
          ...testAdvisor,
          ...(documentType === "identity"
            ? { identityDocumentFileId: file.id }
            : { teacherStatusDocumentFileId: file.id }),
        })),
    update:
      overrides.update ??
      (async (_userId, _teamId, data) => await Promise.resolve({ ...testAdvisor, ...data })),
  };
}

function createRouter(
  repository: TeamAdvisorRepository,
  auth: AuthReader = createTestAuthReader(createTestSession()),
) {
  return createAppRouter({
    auth,
    files: createUnusedFileRepository(),
    teamAdvisors: repository,
    teams: createUnusedTeamRepository(),
  }).teamAdvisors;
}

function createAdvisorInput() {
  return {
    email: " advisor@example.com ",
    firstNameEn: " Advisor ",
    firstNameTh: " อาจารย์ ",
    lastNameEn: " One ",
    lastNameTh: " หนึ่ง ",
    phone: " 080-000-0000 ",
    teamId: TEAM_ID,
    titleEn: " Mr. ",
    titleTh: " นาย ",
  };
}

function pdfFile(name = "document.pdf") {
  return new File(["%PDF-1.7\nvalid document"], name, { type: "application/pdf" });
}

describe("team advisors router", () => {
  it("creates a draft advisor with required fields and null documents", async () => {
    const create = vi.fn<TeamAdvisorRepository["create"]>(
      async (_userId, data) => await Promise.resolve({ ...testAdvisor, ...data }),
    );
    const router = createRouter(createTeamAdvisorRepository({ create }));
    const { context } = createTestContext();

    await expect(
      call(router.create, createAdvisorInput(), { context, path: ["teamAdvisors", "create"] }),
    ).resolves.toStrictEqual(testAdvisor);
    expect(create).toHaveBeenCalledWith(USER_ID, {
      ...createAdvisorInput(),
      email: "advisor@example.com",
      firstNameEn: "Advisor",
      firstNameTh: "อาจารย์",
      lastNameEn: "One",
      lastNameTh: "หนึ่ง",
      phone: "080-000-0000",
      titleEn: "Mr.",
      titleTh: "นาย",
    });
  });

  it("returns team not found when create cannot find owned team", async () => {
    const router = createRouter(
      createTeamAdvisorRepository({ create: async () => await Promise.resolve(null) }),
    );
    const { context } = createTestContext();

    await expect(
      call(router.create, createAdvisorInput(), { context, path: ["teamAdvisors", "create"] }),
    ).rejects.toMatchObject({ code: "TEAM_NOT_FOUND", status: 404 });
  });

  it("returns conflict when team already has an advisor", async () => {
    const router = createRouter(
      createTeamAdvisorRepository({
        create: async () => await Promise.reject(createTeamAdvisorAlreadyExistsError()),
      }),
    );
    const { context } = createTestContext();

    await expect(
      call(router.create, createAdvisorInput(), { context, path: ["teamAdvisors", "create"] }),
    ).rejects.toMatchObject({ code: "TEAM_ADVISOR_ALREADY_EXISTS", status: 409 });
  });

  it("gets an advisor with signed document URLs", async () => {
    const repository = createTeamAdvisorRepository({
      findByTeamId: async () =>
        await Promise.resolve({
          ...testAdvisor,
          identityDocument: identityFile,
          identityDocumentFileId: IDENTITY_FILE_ID,
          teacherStatusDocument: teacherStatusFile,
          teacherStatusDocumentFileId: TEACHER_STATUS_FILE_ID,
        } satisfies TeamAdvisorWithStoredDocuments),
    });
    const router = createRouter(repository);
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamAdvisors", "get"] }),
    ).resolves.toStrictEqual({
      chronicConditionsAndFirstAidNotes: null,
      createdAt,
      dietaryRequirements: null,
      drugAllergies: null,
      email: "advisor@example.com",
      firstNameEn: "Advisor",
      firstNameTh: "อาจารย์",
      foodAllergies: null,
      id: ADVISOR_ID,
      identityDocument: {
        contentType: "application/pdf",
        id: IDENTITY_FILE_ID,
        originalName: "identity.pdf",
        sizeBytes: 12,
        uploadedAt: identityFile.uploadedAt,
        url: "https://storage.test/document",
      },
      lastNameEn: "One",
      lastNameTh: "หนึ่ง",
      lineId: null,
      middleNameEn: null,
      middleNameTh: null,
      phone: "080-000-0000",
      teacherStatusDocument: {
        contentType: "application/pdf",
        id: TEACHER_STATUS_FILE_ID,
        originalName: "teacher-status.pdf",
        sizeBytes: 12,
        uploadedAt: teacherStatusFile.uploadedAt,
        url: "https://storage.test/document",
      },
      teamId: TEAM_ID,
      titleEn: "Mr.",
      titleTh: "นาย",
      updatedAt: createdAt,
    });
    expect(s3Mocks.getPresigned).toHaveBeenCalledTimes(2);
  });

  it("gets an advisor with null documents before uploads", async () => {
    const router = createRouter(createTeamAdvisorRepository());
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamAdvisors", "get"] }),
    ).resolves.toMatchObject({ identityDocument: null, teacherStatusDocument: null });
  });

  it("returns not found for a missing advisor", async () => {
    const router = createRouter(
      createTeamAdvisorRepository({ findByTeamId: async () => await Promise.resolve(null) }),
    );
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamAdvisors", "get"] }),
    ).rejects.toMatchObject({ code: "TEAM_ADVISOR_NOT_FOUND", status: 404 });
  });

  it("updates writable advisor fields and allows clearing optional data", async () => {
    const update = vi.fn<TeamAdvisorRepository["update"]>(
      async (_userId, _teamId, data) => await Promise.resolve({ ...testAdvisor, ...data }),
    );
    const router = createRouter(createTeamAdvisorRepository({ update }));
    const { context } = createTestContext();

    await expect(
      call(
        router.update,
        { data: { email: " updated@example.com ", foodAllergies: null }, teamId: TEAM_ID },
        { context, path: ["teamAdvisors", "update"] },
      ),
    ).resolves.toMatchObject({ email: "updated@example.com", foodAllergies: null });
    expect(update).toHaveBeenCalledWith(USER_ID, TEAM_ID, {
      email: "updated@example.com",
      foodAllergies: null,
    });
  });

  it("rejects empty advisor updates", async () => {
    const router = createRouter(createTeamAdvisorRepository());
    const { context } = createTestContext();

    await expect(
      call(
        router.update,
        { data: {}, teamId: TEAM_ID },
        { context, path: ["teamAdvisors", "update"] },
      ),
    ).rejects.toBeInstanceOf(Error);
  });

  it.each([
    { documentType: "identity" as const, path: "identityDocument" as const, segment: "identity" },
    {
      documentType: "teacherStatus" as const,
      path: "teacherStatusDocument" as const,
      segment: "teacher-status",
    },
  ])("uploads $documentType PDF and updates advisor", async ({ documentType, path, segment }) => {
    const replaceDocument = vi.fn<TeamAdvisorRepository["replaceDocument"]>(
      async (_userId, _teamId, type, file) =>
        await Promise.resolve({
          ...testAdvisor,
          ...(type === "identity"
            ? { identityDocumentFileId: file.id }
            : { teacherStatusDocumentFileId: file.id }),
        }),
    );
    const router = createRouter(createTeamAdvisorRepository({ replaceDocument }));
    const { context } = createTestContext();
    s3Mocks.putObject.mockClear();

    const result = await call(
      router[path],
      { file: pdfFile(), teamId: TEAM_ID },
      { context, path: ["teamAdvisors", path] },
    );

    expect(
      result[
        documentType === "identity" ? "identityDocumentFileId" : "teacherStatusDocumentFileId"
      ],
    ).toMatch(/^[0-9a-f-]{36}$/u);
    const [putInput] = s3Mocks.putObject.mock.calls.at(-1) ?? [];
    expect(putInput).toMatchObject({ bucket: "uploads", contentType: "application/pdf" });
    expect(putInput?.key).toMatch(
      new RegExp(`team-advisors/${ADVISOR_ID}/documents/${segment}/[0-9a-f-]{36}`, "u"),
    );
    expect(replaceDocument).toHaveBeenCalledWith(
      USER_ID,
      TEAM_ID,
      documentType,
      expect.objectContaining({ contentType: "application/pdf", uploadedBy: USER_ID }),
    );
  });

  it("rejects non-PDF advisor documents before storage", async () => {
    const replaceDocument = vi.fn<TeamAdvisorRepository["replaceDocument"]>();
    const router = createRouter(createTeamAdvisorRepository({ replaceDocument }));
    const { context } = createTestContext();

    await expect(
      call(
        router.identityDocument,
        { file: new File(["not pdf"], "document.txt", { type: "text/plain" }), teamId: TEAM_ID },
        { context, path: ["teamAdvisors", "identityDocument"] },
      ),
    ).rejects.toMatchObject({ code: "FILE_TYPE_NOT_ALLOWED", status: 415 });
    expect(s3Mocks.putObject).not.toHaveBeenCalled();
    expect(replaceDocument).not.toHaveBeenCalled();
  });

  it("deletes an uploaded document when the advisor disappears before replacement", async () => {
    const repository = createTeamAdvisorRepository({
      replaceDocument: async () => await Promise.resolve(null),
    });
    const router = createRouter(repository);
    const { context } = createTestContext();
    s3Mocks.deleteObject.mockClear();

    await expect(
      call(
        router.identityDocument,
        { file: pdfFile(), teamId: TEAM_ID },
        { context, path: ["teamAdvisors", "identityDocument"] },
      ),
    ).rejects.toMatchObject({ code: "TEAM_ADVISOR_NOT_FOUND", status: 404 });
    const deleteInput = s3Mocks.deleteObject.mock.calls[0]?.[0];
    expect(deleteInput?.bucket).toBe("uploads");
    expect(deleteInput?.key).toMatch(
      new RegExp(`^team-advisors/${ADVISOR_ID}/documents/identity/[0-9a-f-]{36}$`, "u"),
    );
  });

  it("requires authentication before creating an advisor", async () => {
    const repository = createTeamAdvisorRepository();
    const router = createRouter(repository, createTestAuthReader(null));
    const { context } = createTestContext();

    await expect(
      call(router.create, createAdvisorInput(), { context, path: ["teamAdvisors", "create"] }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
  });
});
